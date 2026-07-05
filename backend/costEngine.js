const db = require('./db');

/**
 * Check if nationality represents a Saudi citizen
 */
function isSaudi(nationality) {
    if (!nationality) return false;
    const clean = nationality.trim().toLowerCase();
    return clean === 'سعودي' || clean === 'سعودية' || clean === 'saudi' || clean === 'saudian';
}

/**
 * Calculate years of service from hire_date to today.
 * Returns 0 if hire_date is missing or invalid.
 */
function calcYearsOfService(hireDate) {
    if (!hireDate) return 0;
    const hire = new Date(hireDate);
    if (isNaN(hire.getTime())) return 0;
    const now = new Date();
    const diffMs = now - hire;
    if (diffMs < 0) return 0;
    return diffMs / (365.25 * 24 * 3600 * 1000);
}

/**
 * Calculate cost breakdown for a single employee.
 *
 * Fix #1  – GOSI employer rate: gosi_saudi_rate now represents the EMPLOYER share
 *           directly (default 11.75%), not the total that includes employee share.
 *           The UI label was updated accordingly.
 *
 * Fix #2  – Vacation accrual formula changed from (basic/30)*days/12 to
 *           (basic * days / 365) for calendar-day accuracy.
 *
 * Fix #3  – End-of-service now uses hire_date to distinguish:
 *             < 5 years  → 0.5 month per year  (نصف شهر)
 *             ≥ 5 years  → 1.0 month per year  (شهر كامل)
 *           per Saudi Labor Law Art. 84.
 *
 * Fix #5  – Employees with legal_entity_id = null are grouped under a
 *           dedicated sentinel key '_unassigned' to prevent false cross-entity
 *           burden sharing between unrelated null employees.
 */
function calculateEmployeeCost(emp, settings) {
    const isEmpSaudi = isSaudi(emp.nationality);
    const basic   = Number(emp.basic_salary              || 0);
    const housing = Number(emp.housing_allowance          || 0);
    const trans   = Number(emp.transportation_allowance   || 0);
    const living  = Number(emp.living_allowance           || 0);
    const other   = Number(emp.other_allowances           || 0);

    const grossSalary = basic + housing + trans + living + other;

    let gosi          = 0;
    let gosiDeduction = 0;
    let medical       = Number(emp.medical_insurance_monthly  || 0);
    let healthCert    = Number(emp.health_certificate_monthly || 0);
    let vacation      = 0;
    let eos           = 0;
    let ticket        = 0;
    let passport      = 0;
    let workPermit    = 0;
    let exitReentry   = Number(emp.exit_reentry_monthly || 0);

    if (isEmpSaudi) {
        // ── Saudi employee ────────────────────────────────────────────
        // GOSI base: minimum 4,000 SAR (Nitaqat requirement)
        const gosiBase = Math.max(basic + housing, 4000);

        // Fix #1: gosi_saudi_rate = employer share ONLY (default 11.75%)
        //         gosi_saudi_deduction_rate = employee share (default 9.75%)
        const employerRate  = Number(settings.gosi_saudi_rate           || 0.1175);
        const employeeRate  = Number(settings.gosi_saudi_deduction_rate || 0.0975);

        gosiDeduction = gosiBase * employeeRate;
        gosi          = gosiBase * employerRate;

    } else {
        // ── Resident (non-Saudi) employee ────────────────────────────
        // GOSI – occupational hazard insurance (employer only, 2% of basic+housing)
        const gosiBase = basic + housing;
        gosi = gosiBase * Number(settings.gosi_resident_rate || 0.02);

        // Fix #2: Vacation accrual using calendar days (basic / 365 * vacationDays)
        const vacationDays = Number(settings.vacation_days_per_year || 21);
        vacation = (basic * vacationDays) / 365 / 12;   // monthly provision

        // Fix #3: End-of-service – tiered by years of service (Saudi Labor Law Art. 84)
        const yearsOfService = calcYearsOfService(emp.hire_date);
        const eosRate = yearsOfService >= 5 ? 1.0 : 0.5; // full month vs half month per year
        eos = (basic * eosRate) / 12;

        // Annual costs amortised monthly
        ticket     = Number(settings.ticket_annual_cost      || 900)  / 12;
        passport   = Number(settings.passport_annual_fee     || 650)  / 12;
        workPermit = Number(settings.work_permit_annual_fee  || 9700) / 12;
    }

    // Total monthly cost (before Saudization burden allocation)
    const baseMonthlyCost = grossSalary + gosi + medical + healthCert
                          + vacation + eos + ticket + passport + workPermit + exitReentry;

    // Net take-home (gross minus employee GOSI deduction)
    const netSalary = grossSalary - gosiDeduction;

    return {
        id:               emp.id,
        employee_code:    emp.employee_code,
        name:             emp.name,
        nationality:      emp.nationality,
        gender:           emp.gender,
        status:           emp.status,
        branch_id:        emp.branch_id,
        legal_branch_name:  emp.legal_branch_name  || 'غير محدد',
        cost_branch_id:     emp.cost_branch_id     || emp.branch_id,
        cost_branch_name:   emp.cost_branch_name   || emp.legal_branch_name || 'غير محدد',
        legal_entity_id:    emp.legal_entity_id,
        legal_entity_name:  emp.legal_entity_name  || 'غير محدد',
        project_id:         emp.project_id,
        project_name:       emp.project_name       || 'غير محدد',
        saudi_type:         emp.saudi_type         || null,
        hire_date:          emp.hire_date           || '',
        years_of_service:   calcYearsOfService(emp.hire_date),
        isSaudi:            isEmpSaudi,
        basic_salary:            basic,
        housing_allowance:       housing,
        transportation_allowance: trans,
        living_allowance:        living,
        other_allowances:        other,
        gross_salary:       grossSalary,
        net_salary:         netSalary,
        gosi_deduction:     gosiDeduction,
        gosi,
        medical,
        health_certificate:       healthCert,
        vacation_accrual:         vacation,
        end_of_service_accrual:   eos,
        ticket_accrual:           ticket,
        passport_fee:             passport,
        work_permit_fee:          workPermit,
        exit_reentry:             exitReentry,
        base_monthly_cost:        baseMonthlyCost,
        saudization_burden:       0,
        total_monthly_cost:       baseMonthlyCost,
        total_annual_cost:        baseMonthlyCost * 12
    };
}

/**
 * Calculate all costs for a company.
 *
 * Fix #5  – Null legal_entity_id grouping: employees without a legal entity
 *           are isolated under the sentinel key '_unassigned' so they do NOT
 *           accidentally share Saudization burden with other null employees.
 *
 * Fix #8  – Saudization rate now counts employees on active duty AND on
 *           approved leave (إجازة), matching HRSD Nitaqat calculation rules.
 *           Cost calculations still use only 'على رأس العمل'.
 */
function calculateCompanyCosts(companyId) {
    // 1. Get settings, entities and branches
    const settings = db.getSettings(companyId);
    const entities = db.getEntities(companyId);
    const branches = db.getBranches(companyId);
    if (!settings) {
        throw new Error('Settings not found for this company');
    }

    const allEmployees = db.getEmployeesDetailed(companyId);

    // Fix #8: Nitaqat rate uses active + on-leave employees
    const nitaqatEmployees = allEmployees.filter(
        e => e.status === 'على رأس العمل' || e.status === 'إجازة'
    );
    const nitaqatSaudis   = nitaqatEmployees.filter(e => isSaudi(e.nationality));
    const nitaqatRate     = nitaqatEmployees.length > 0
        ? (nitaqatSaudis.length / nitaqatEmployees.length) * 100
        : 0;

    // Cost calculations: active employees only
    const employees = allEmployees.filter(e => e.status === 'على رأس العمل');
    const calculated = employees.map(emp => calculateEmployeeCost(emp, settings));

    // 3. Saudization cost allocation per Legal Entity
    const calculatedSaudis = calculated.filter(e => e.isSaudi);
    const supportSaudis    = calculatedSaudis.filter(e => e.saudi_type === 'support');
    const totalSaudizationCost = supportSaudis.reduce((sum, e) => sum + e.base_monthly_cost, 0);

    // Fix #5: use entity id as key; null → sentinel '_unassigned' to prevent cross-null sharing
    const entityKey = (id) => (id === null || id === undefined) ? '_unassigned' : id;

    const entitiesSaudizationCost = {};
    entities.forEach(ent => {
        const k = entityKey(ent.id);
        const entSupportSaudis = supportSaudis.filter(e => entityKey(e.legal_entity_id) === k);
        entitiesSaudizationCost[k] = entSupportSaudis.reduce((sum, e) => sum + e.base_monthly_cost, 0);
    });

    // Company-wide average burden per resident (for summary KPI only)
    const totalResidents = calculated.filter(e => !e.isSaudi).length;
    let companySaudizationBurdenPerResident = 0;
    if (totalResidents > 0) {
        companySaudizationBurdenPerResident = totalSaudizationCost / totalResidents;
    }

    // Apply per-entity burden to residents; zero out support Saudi direct cost
    const finalEmployees = calculated.map(emp => {
        const k = entityKey(emp.legal_entity_id);

        if (!emp.isSaudi) {
            // Fix #5: isolate null-entity employees – they get 0 burden if no support Saudi in same entity
            const entSaudizationCost = entitiesSaudizationCost[k] || 0;
            const entResidents = calculated.filter(
                e => !e.isSaudi && entityKey(e.legal_entity_id) === k
            );
            const entBurden = entResidents.length > 0
                ? entSaudizationCost / entResidents.length
                : 0;

            emp.saudization_burden   = entBurden;
            emp.total_monthly_cost   = emp.base_monthly_cost + entBurden;
            emp.total_annual_cost    = emp.total_monthly_cost * 12;

        } else if (emp.saudi_type === 'support') {
            // Support Saudi cost fully redistributed; direct cost = 0
            emp.saudization_burden   = 0;
            emp.total_monthly_cost   = 0;
            emp.total_annual_cost    = 0;

        } else {
            // Working Saudi – direct operational cost
            emp.saudization_burden   = 0;
            emp.total_monthly_cost   = emp.base_monthly_cost;
            emp.total_annual_cost    = emp.total_monthly_cost * 12;
        }
        return emp;
    });

    // 4. Legal Entities Breakdown (Compliance / Nitaqat view)
    const entitiesBreakdown = entities.map(ent => {
        const k        = entityKey(ent.id);
        const entEmps  = finalEmployees.filter(e => entityKey(e.legal_entity_id) === k);
        const entSaudis    = entEmps.filter(e => e.isSaudi);
        const entResidents = entEmps.filter(e => !e.isSaudi);
        const entSaudizationCost = entitiesSaudizationCost[k] || 0;

        return {
            id:                      ent.id,
            name:                    ent.name,
            unified_number:          ent.unified_number || 'غير محدد',
            total_count:             entEmps.length,
            saudi_count:             entSaudis.length,
            saudi_working:           entSaudis.filter(s => s.saudi_type === 'working').length,
            saudi_support:           entSaudis.filter(s => s.saudi_type === 'support').length,
            resident_count:          entResidents.length,
            effective_saudization_cost: entSaudizationCost,
            burden_per_resident:     entResidents.length > 0 ? entSaudizationCost / entResidents.length : 0
        };
    });

    // 5. Branches Breakdown (Financial / Operational view – by cost_branch_id)
    const branchesBreakdown = branches.map(br => {
        const brEmps     = finalEmployees.filter(e => e.cost_branch_id === br.id);
        const brSaudis   = brEmps.filter(e => e.isSaudi);
        const brResidents = brEmps.filter(e => !e.isSaudi);
        const brCost     = brEmps.reduce((sum, e) => sum + e.total_monthly_cost, 0);

        return {
            id:                  br.id,
            name:                br.name,
            cr_number:           br.cr_number || 'غير محدد',
            parent_entity_name:  entities.find(e => e.id === br.entity_id)?.name || 'غير محدد',
            total_count:         brEmps.length,
            saudi_count:         brSaudis.length,
            resident_count:      brResidents.length,
            total_monthly_cost:  brCost,
            total_annual_cost:   brCost * 12
        };
    });

    return {
        summary: {
            total_employees:              employees.length,
            saudi_count:                  calculatedSaudis.length,
            saudi_working:                calculatedSaudis.filter(s => s.saudi_type === 'working').length,
            saudi_support:                calculatedSaudis.filter(s => s.saudi_type === 'support').length,
            resident_count:               totalResidents,
            // Fix #8: Nitaqat rate includes on-leave employees
            saudization_rate:             nitaqatRate,
            total_monthly_payroll:        finalEmployees.reduce((sum, e) => sum + e.gross_salary, 0),
            total_saudization_burden_monthly:    totalSaudizationCost,
            saudization_burden_per_resident:     companySaudizationBurdenPerResident,
            total_company_monthly_cost:   finalEmployees.reduce((sum, e) => sum + e.total_monthly_cost, 0),
            total_company_annual_cost:    finalEmployees.reduce((sum, e) => sum + e.total_annual_cost, 0)
        },
        entities_breakdown: entitiesBreakdown,
        branches_breakdown: branchesBreakdown,
        employees: finalEmployees
    };
}

module.exports = {
    isSaudi,
    calcYearsOfService,
    calculateEmployeeCost,
    calculateCompanyCosts
};
