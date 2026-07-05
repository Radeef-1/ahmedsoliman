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
 * Calculate cost breakdown for a single employee
 */
function calculateEmployeeCost(emp, settings) {
    const isEmpSaudi = isSaudi(emp.nationality);
    const basic = Number(emp.basic_salary || 0);
    const housing = Number(emp.housing_allowance || 0);
    const trans = Number(emp.transportation_allowance || 0);
    const living = Number(emp.living_allowance || 0);
    const other = Number(emp.other_allowances || 0);
    
    const grossSalary = basic + housing + trans + living + other;
    
    let gosi = 0;
    let medical = Number(emp.medical_insurance_monthly || 0);
    let healthCert = Number(emp.health_certificate_monthly || 0);
    let vacation = 0;
    let eos = 0;
    let ticket = 0;
    let passport = 0;
    let workPermit = 0;
    let exitReentry = Number(emp.exit_reentry_monthly || 0);
    
    if (isEmpSaudi) {
        // Saudi employee costing
        // GOSI: e.g. 22% of basic + housing, but minimum GOSI base is 4,000 for Saudization.
        const gosiBase = Math.max(basic + housing, 4000);
        gosi = gosiBase * Number(settings.gosi_saudi_rate || 0.22);
    } else {
        // Resident employee costing
        // GOSI: e.g. 2% of basic + housing (occupational hazards)
        const gosiBase = basic + housing;
        gosi = gosiBase * Number(settings.gosi_resident_rate || 0.02);
        
        // Vacation accrual: (Basic Salary / 30) * (vacation_days_per_year) / 12
        const vacationDays = Number(settings.vacation_days_per_year || 21);
        vacation = (basic / 30) * vacationDays / 12;
        
        // End of service: (Basic / 2) / 12 (i.e. half month salary per year)
        eos = (basic / 2) / 12;
        
        // Flight ticket: annual cost / 12
        ticket = Number(settings.ticket_annual_cost || 900) / 12;
        
        // Passport/Iqama: annual fee / 12
        passport = Number(settings.passport_annual_fee || 650) / 12;
        
        // Work permit: annual fee / 12
        workPermit = Number(settings.work_permit_annual_fee || 9700) / 12;
    }
    
    // Total monthly cost before Saudization allocation
    const baseMonthlyCost = grossSalary + gosi + medical + healthCert + vacation + eos + ticket + passport + workPermit + exitReentry;
    
    return {
        id: emp.id,
        employee_code: emp.employee_code,
        name: emp.name,
        nationality: emp.nationality,
        gender: emp.gender,
        status: emp.status,
        branch_id: emp.branch_id,
        legal_branch_name: emp.legal_branch_name || 'غير محدد',
        cost_branch_id: emp.cost_branch_id || emp.branch_id,
        cost_branch_name: emp.cost_branch_name || emp.legal_branch_name || 'غير محدد',
        legal_entity_id: emp.legal_entity_id,
        legal_entity_name: emp.legal_entity_name || 'غير محدد',
        project_id: emp.project_id,
        project_name: emp.project_name || 'غير محدد',
        saudi_type: emp.saudi_type || null,
        hire_date: emp.hire_date || '',
        isSaudi: isEmpSaudi,
        basic_salary: basic,
        housing_allowance: housing,
        transportation_allowance: trans,
        living_allowance: living,
        other_allowances: other,
        gross_salary: grossSalary,
        gosi,
        medical,
        health_certificate: healthCert,
        vacation_accrual: vacation,
        end_of_service_accrual: eos,
        ticket_accrual: ticket,
        passport_fee: passport,
        work_permit_fee: workPermit,
        exit_reentry: exitReentry,
        base_monthly_cost: baseMonthlyCost,
        saudization_burden: 0,
        total_monthly_cost: baseMonthlyCost,
        total_annual_cost: baseMonthlyCost * 12
    };
}

/**
 * Calculate calculations for the entire company
 */
function calculateCompanyCosts(companyId) {
    // 1. Get settings, entities and branches
    const settings = db.getSettings(companyId);
    const entities = db.getEntities(companyId);
    const branches = db.getBranches(companyId);
    if (!settings) {
        throw new Error('Settings not found for this company');
    }
    
    // 2. Get active employees
    const employees = db.getEmployeesDetailed(companyId).filter(e => e.status === 'على رأس العمل');
    
    // Calculate base cost for all
    const calculated = employees.map(emp => calculateEmployeeCost(emp, settings));
    
    // 3. Automated Saudization Cost Allocation (100% automated based on legal registry)
    const calculatedSaudis = calculated.filter(e => e.isSaudi);
    const totalSaudizationCost = calculatedSaudis.reduce((sum, e) => sum + e.base_monthly_cost, 0);
    
    // Calculate Saudization cost grouped by Legal Entity (based on legal branch's parent entity)
    const entitiesSaudizationCost = {};
    entities.forEach(ent => {
        const entSaudis = calculatedSaudis.filter(e => e.legal_entity_id === ent.id);
        entitiesSaudizationCost[ent.id] = entSaudis.reduce((sum, e) => sum + e.base_monthly_cost, 0);
    });
    
    // Calculate weighted average Saudization burden per resident
    const totalResidents = calculated.filter(e => !e.isSaudi).length;
    let companySaudizationBurdenPerResident = 0;
    if (totalResidents > 0) {
        companySaudizationBurdenPerResident = totalSaudizationCost / totalResidents;
    }
    
    // Apply Saudization burden to resident employees
    const finalEmployees = calculated.map(emp => {
        if (!emp.isSaudi) {
            emp.saudization_burden = companySaudizationBurdenPerResident;
            emp.total_monthly_cost = emp.base_monthly_cost + companySaudizationBurdenPerResident;
            emp.total_annual_cost = emp.total_monthly_cost * 12;
        } else {
            emp.saudization_burden = 0;
            emp.total_monthly_cost = emp.base_monthly_cost;
            emp.total_annual_cost = emp.total_monthly_cost * 12;
        }
        return emp;
    });
    
    // 4. Compute Legal Entities Breakdown (Compliance view)
    const entitiesBreakdown = entities.map(ent => {
        const entEmps = finalEmployees.filter(e => e.legal_entity_id === ent.id);
        const entSaudis = entEmps.filter(e => e.isSaudi);
        const entResidents = entEmps.filter(e => !e.isSaudi);
        const entSaudizationCost = entitiesSaudizationCost[ent.id] || 0;
        
        return {
            id: ent.id,
            name: ent.name,
            unified_number: ent.unified_number || 'غير محدد',
            total_count: entEmps.length,
            saudi_count: entSaudis.length,
            saudi_working: entSaudis.filter(s => s.saudi_type === 'working').length,
            saudi_support: entSaudis.filter(s => s.saudi_type === 'support').length,
            resident_count: entResidents.length,
            effective_saudization_cost: entSaudizationCost,
            burden_per_resident: entResidents.length > 0 ? entSaudizationCost / entResidents.length : 0
        };
    });

    // 5. Compute Branches Breakdown (Operational view based on cost_branch_id)
    const branchesBreakdown = branches.map(br => {
        const brEmps = finalEmployees.filter(e => e.cost_branch_id === br.id);
        const brSaudis = brEmps.filter(e => e.isSaudi);
        const brResidents = brEmps.filter(e => !e.isSaudi);
        const brCost = brEmps.reduce((sum, e) => sum + e.total_monthly_cost, 0);

        return {
            id: br.id,
            name: br.name,
            cr_number: br.cr_number || 'غير محدد',
            parent_entity_name: entities.find(e => e.id === br.entity_id)?.name || 'غير محدد',
            total_count: brEmps.length,
            saudi_count: brSaudis.length,
            resident_count: brResidents.length,
            total_monthly_cost: brCost,
            total_annual_cost: brCost * 12
        };
    });
    
    return {
        summary: {
            total_employees: employees.length,
            saudi_count: calculatedSaudis.length,
            saudi_working: calculatedSaudis.filter(s => s.saudi_type === 'working').length,
            saudi_support: calculatedSaudis.filter(s => s.saudi_type === 'support').length,
            resident_count: totalResidents,
            saudization_rate: employees.length > 0 ? (calculatedSaudis.length / employees.length) * 100 : 0,
            total_monthly_payroll: finalEmployees.reduce((sum, e) => sum + e.gross_salary, 0),
            total_saudization_burden_monthly: totalSaudizationCost,
            saudization_burden_per_resident: companySaudizationBurdenPerResident,
            total_company_monthly_cost: finalEmployees.reduce((sum, e) => sum + e.total_monthly_cost, 0),
            total_company_annual_cost: finalEmployees.reduce((sum, e) => sum + e.total_annual_cost, 0)
        },
        entities_breakdown: entitiesBreakdown,
        branches_breakdown: branchesBreakdown,
        employees: finalEmployees
    };
}

module.exports = {
    isSaudi,
    calculateEmployeeCost,
    calculateCompanyCosts
};
