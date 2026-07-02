const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbFolder = path.join(__dirname, 'db');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}

const globalDbPath = path.join(dbFolder, 'global.json');

// Global Directory memory storage
let globalData = {
    companies: [],
    counters: {
        companies: 0
    }
};

// Load global data
if (fs.existsSync(globalDbPath)) {
    try {
        const fileContent = fs.readFileSync(globalDbPath, 'utf8');
        if (fileContent.trim()) {
            globalData = JSON.parse(fileContent);
            if (!globalData.companies) globalData.companies = [];
            if (!globalData.counters) globalData.counters = { companies: 0 };
        }
    } catch (err) {
        console.error('Error reading global database file:', err);
    }
}

function saveGlobalToDisk() {
    try {
        fs.writeFileSync(globalDbPath, JSON.stringify(globalData, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to global database file:', err);
    }
}

// Helper to get tenant-specific database path
function getCompanyDbPath(companyId) {
    return path.join(dbFolder, `company_${companyId}.json`);
}

// Helper to load tenant database
function loadCompanyData(companyId) {
    const filePath = getCompanyDbPath(companyId);
    let companyData = {
        cost_settings: [],
        projects: [],
        entities: [],
        employees: [],
        salaries: [],
        resident_extra_costs: [],
        counters: {
            projects: 0,
            entities: 0,
            employees: 0
        }
    };

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent.trim()) {
                companyData = JSON.parse(fileContent);
                if (!companyData.cost_settings) companyData.cost_settings = [];
                if (!companyData.projects) companyData.projects = [];
                if (!companyData.entities) companyData.entities = [];
                if (!companyData.employees) companyData.employees = [];
                if (!companyData.salaries) companyData.salaries = [];
                if (!companyData.resident_extra_costs) companyData.resident_extra_costs = [];
                if (!companyData.counters) companyData.counters = { projects: 0, entities: 0, employees: 0 };
            }
        } catch (err) {
            console.error(`Error reading database file for company ${companyId}:`, err);
        }
    }
    return companyData;
}

// Helper to save tenant database
function saveCompanyData(companyId, companyData) {
    const filePath = getCompanyDbPath(companyId);
    try {
        fs.writeFileSync(filePath, JSON.stringify(companyData, null, 2), 'utf8');
    } catch (err) {
        console.error(`Error writing database file for company ${companyId}:`, err);
    }
}

// Seed default company (1 / 123) if global is empty
if (globalData.companies.length === 0) {
    const hash = bcrypt.hashSync("123", 10);
    
    globalData.counters.companies++;
    const id = globalData.counters.companies;
    globalData.companies.push({
        id,
        name: "أحمد سليمان - شركة ريال البركة للتجارة",
        email: "1",
        password_hash: hash,
        created_at: new Date().toISOString()
    });
    saveGlobalToDisk();

    // Create and seed tenant-specific database file
    const companyData = {
        cost_settings: [{
            company_id: id,
            gosi_saudi_rate: 0.22,
            gosi_resident_rate: 0.02,
            ticket_annual_cost: 900.0,
            passport_annual_fee: 650.0,
            work_permit_annual_fee: 9700.0,
            vacation_days_per_year: 21
        }],
        projects: [{ id: 1, company_id: id, name: 'الإدارة العامة' }],
        entities: [{ id: 1, company_id: id, name: 'شركة ريال البركة للتجارة', saudization_cost: 54942.25 }],
        employees: [],
        salaries: [],
        resident_extra_costs: [],
        counters: {
            projects: 1,
            entities: 1,
            employees: 0
        }
    };
    saveCompanyData(id, companyData);
    console.log("Seeded global database and created isolated database for company 1");
}

// Proactive update for name if seeded company had old name
const defaultComp = globalData.companies.find(c => c.id === 1 && c.name === "شركة ريال البركة للتجارة");
if (defaultComp) {
    defaultComp.name = "أحمد سليمان - شركة ريال البركة للتجارة";
    saveGlobalToDisk();
    console.log("Automatically updated default company name in global index");
}

// -------------------------------------------------------------
// GLOBAL OPERATIONS (Auth & Directory)
// -------------------------------------------------------------

function createCompany(name, email, password_hash) {
    const exists = globalData.companies.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (exists) {
        throw new Error('UNIQUE: البريد الإلكتروني مسجل بالفعل');
    }

    globalData.counters.companies++;
    const id = globalData.counters.companies;
    const company = { id, name, email, password_hash, created_at: new Date().toISOString() };
    globalData.companies.push(company);
    saveGlobalToDisk();

    // Initialize tenant database file
    const companyData = {
        cost_settings: [{
            company_id: id,
            gosi_saudi_rate: 0.22,
            gosi_resident_rate: 0.02,
            ticket_annual_cost: 900.0,
            passport_annual_fee: 650.0,
            work_permit_annual_fee: 9700.0,
            vacation_days_per_year: 21
        }],
        projects: [{ id: 1, company_id: id, name: 'الإدارة العامة' }],
        entities: [{ id: 1, company_id: id, name: name, saudization_cost: 0.0 }],
        employees: [],
        salaries: [],
        resident_extra_costs: [],
        counters: {
            projects: 1,
            entities: 1,
            employees: 0
        }
    };
    saveCompanyData(id, companyData);
    return { lastID: id };
}

function getCompanyByEmail(email) {
    return globalData.companies.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
}

function updateCompanyProfile(companyId, name) {
    const id = Number(companyId);
    const idx = globalData.companies.findIndex(c => c.id === id);
    if (idx !== -1) {
        globalData.companies[idx].name = name.trim();
        saveGlobalToDisk();
        return true;
    }
    return false;
}

// -------------------------------------------------------------
// ISOLATED TENANT OPERATIONS (Database per tenant)
// -------------------------------------------------------------

// Cost Settings
function getSettings(companyId) {
    const cData = loadCompanyData(companyId);
    let settings = cData.cost_settings.find(s => s.company_id === companyId);
    if (!settings) {
        settings = {
            company_id: companyId,
            gosi_saudi_rate: 0.22,
            gosi_resident_rate: 0.02,
            ticket_annual_cost: 900.0,
            passport_annual_fee: 650.0,
            work_permit_annual_fee: 9700.0,
            vacation_days_per_year: 21
        };
        cData.cost_settings.push(settings);
        saveCompanyData(companyId, cData);
    }
    return settings;
}

function updateSettings(companyId, settingsData) {
    const cData = loadCompanyData(companyId);
    const idx = cData.cost_settings.findIndex(s => s.company_id === companyId);
    const updated = {
        company_id: companyId,
        gosi_saudi_rate: Number(settingsData.gosi_saudi_rate ?? 0.22),
        gosi_resident_rate: Number(settingsData.gosi_resident_rate ?? 0.02),
        ticket_annual_cost: Number(settingsData.ticket_annual_cost ?? 900),
        passport_annual_fee: Number(settingsData.passport_annual_fee ?? 650),
        work_permit_annual_fee: Number(settingsData.work_permit_annual_fee ?? 9700),
        vacation_days_per_year: Number(settingsData.vacation_days_per_year ?? 21)
    };
    
    if (idx !== -1) {
        cData.cost_settings[idx] = updated;
    } else {
        cData.cost_settings.push(updated);
    }
    saveCompanyData(companyId, cData);
    return true;
}

// Projects
function getProjects(companyId) {
    const cData = loadCompanyData(companyId);
    return cData.projects;
}

function createProject(companyId, name) {
    const cData = loadCompanyData(companyId);
    cData.counters.projects++;
    const id = cData.counters.projects;
    const project = { id, company_id: companyId, name: name.trim() };
    cData.projects.push(project);
    saveCompanyData(companyId, cData);
    return { lastID: id, name: project.name };
}

function deleteProject(id, companyId) {
    const projId = Number(id);
    const cData = loadCompanyData(companyId);
    const initialLength = cData.projects.length;
    cData.projects = cData.projects.filter(p => p.id !== projId);
    
    if (cData.projects.length !== initialLength) {
        // Set project_id to null for affected employees
        cData.employees = cData.employees.map(emp => {
            if (emp.project_id === projId) {
                return { ...emp, project_id: null };
            }
            return emp;
        });
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

// Entities (Sub-companies)
function getEntities(companyId) {
    const cData = loadCompanyData(companyId);
    return cData.entities;
}

function createEntity(companyId, name, saudization_cost = 0) {
    const cData = loadCompanyData(companyId);
    cData.counters.entities++;
    const id = cData.counters.entities;
    const entity = { 
        id, 
        company_id: companyId, 
        name: name.trim(), 
        saudization_cost: Number(saudization_cost || 0) 
    };
    cData.entities.push(entity);
    saveCompanyData(companyId, cData);
    return { lastID: id, name: entity.name, saudization_cost: entity.saudization_cost };
}

function updateEntity(companyId, id, name, saudization_cost) {
    const entId = Number(id);
    const cData = loadCompanyData(companyId);
    const idx = cData.entities.findIndex(e => e.id === entId);
    if (idx !== -1) {
        cData.entities[idx] = {
            ...cData.entities[idx],
            name: name ? name.trim() : cData.entities[idx].name,
            saudization_cost: saudization_cost !== undefined ? Number(saudization_cost) : cData.entities[idx].saudization_cost
        };
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

function deleteEntity(id, companyId) {
    const entId = Number(id);
    const cData = loadCompanyData(companyId);
    const initialLength = cData.entities.length;
    cData.entities = cData.entities.filter(e => e.id !== entId);
    
    if (cData.entities.length !== initialLength) {
        // Set entity_id to null for affected employees
        cData.employees = cData.employees.map(emp => {
            if (emp.entity_id === entId) {
                return { ...emp, entity_id: null };
            }
            return emp;
        });
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

// Employees detailed list
function getEmployeesDetailed(companyId) {
    const cData = loadCompanyData(companyId);
    
    return cData.employees.map(emp => {
        const proj = cData.projects.find(p => p.id === emp.project_id) || null;
        const ent = cData.entities.find(e => e.id === emp.entity_id) || null;
        const sal = cData.salaries.find(s => s.employee_id === emp.id) || {
            basic_salary: 0, housing_allowance: 0, transportation_allowance: 0, living_allowance: 0, other_allowances: 0
        };
        const extra = cData.resident_extra_costs.find(r => r.employee_id === emp.id) || {
            medical_insurance_monthly: 0, health_certificate_monthly: 0, exit_reentry_monthly: 0
        };
        
        return {
            ...emp,
            project_name: proj ? proj.name : 'غير محدد',
            entity_name: ent ? ent.name : 'غير محدد',
            basic_salary: sal.basic_salary,
            housing_allowance: sal.housing_allowance,
            transportation_allowance: sal.transportation_allowance,
            living_allowance: sal.living_allowance,
            other_allowances: sal.other_allowances,
            medical_insurance_monthly: extra.medical_insurance_monthly,
            health_certificate_monthly: extra.health_certificate_monthly,
            exit_reentry_monthly: extra.exit_reentry_monthly
        };
    });
}

// Create employee
function createEmployee(companyId, empData) {
    const { 
        employee_code, name, nationality, gender, status, project_id, entity_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
    } = empData;

    const cData = loadCompanyData(companyId);

    // Check UNIQUE code for company
    const exists = cData.employees.find(e => e.employee_code.toString().trim() === employee_code.toString().trim());
    if (exists) {
        throw new Error('UNIQUE: الرقم الوظيفي مسجل مسبقاً');
    }

    cData.counters.employees++;
    const id = cData.counters.employees;

    // 1. Employee metadata
    const employee = {
        id,
        company_id: companyId,
        employee_code: employee_code.toString().trim(),
        name: name.trim(),
        nationality: nationality.trim(),
        gender: gender.trim(),
        status: status || 'على رأس العمل',
        project_id: project_id ? Number(project_id) : null,
        entity_id: entity_id ? Number(entity_id) : null
    };
    cData.employees.push(employee);

    // 2. Salary details
    const salary = {
        employee_id: id,
        basic_salary: Number(basic_salary || 0),
        housing_allowance: Number(housing_allowance || 0),
        transportation_allowance: Number(transportation_allowance || 0),
        living_allowance: Number(living_allowance || 0),
        other_allowances: Number(other_allowances || 0)
    };
    cData.salaries.push(salary);

    // 3. Resident extra costs
    const extra = {
        employee_id: id,
        medical_insurance_monthly: Number(medical_insurance_monthly || 0),
        health_certificate_monthly: Number(health_certificate_monthly || 0),
        exit_reentry_monthly: Number(exit_reentry_monthly || 0)
    };
    cData.resident_extra_costs.push(extra);

    saveCompanyData(companyId, cData);
    return { lastID: id };
}

// Update employee
function updateEmployee(companyId, empId, empData) {
    const id = Number(empId);
    const cData = loadCompanyData(companyId);
    
    // Find employee
    const empIdx = cData.employees.findIndex(e => e.id === id);
    if (empIdx === -1) {
        throw new Error('Employee not found');
    }

    const { 
        employee_code, name, nationality, gender, status, project_id, entity_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
    } = empData;

    // Check UNIQUE code if changed
    if (employee_code) {
        const codeConflict = cData.employees.find(e => 
            e.id !== id && 
            e.employee_code.toString().trim() === employee_code.toString().trim()
        );
        if (codeConflict) {
            throw new Error('UNIQUE: الرقم الوظيفي مسجل مسبقاً');
        }
    }

    // 1. Update basic details
    cData.employees[empIdx] = {
        ...cData.employees[empIdx],
        employee_code: employee_code ? employee_code.toString().trim() : cData.employees[empIdx].employee_code,
        name: name ? name.trim() : cData.employees[empIdx].name,
        nationality: nationality ? nationality.trim() : cData.employees[empIdx].nationality,
        gender: gender ? gender.trim() : cData.employees[empIdx].gender,
        status: status || cData.employees[empIdx].status,
        project_id: project_id !== undefined ? (project_id ? Number(project_id) : null) : cData.employees[empIdx].project_id,
        entity_id: entity_id !== undefined ? (entity_id ? Number(entity_id) : null) : cData.employees[empIdx].entity_id
    };

    // 2. Update salaries
    const salIdx = cData.salaries.findIndex(s => s.employee_id === id);
    const salary = {
        employee_id: id,
        basic_salary: Number(basic_salary ?? (salIdx !== -1 ? cData.salaries[salIdx].basic_salary : 0)),
        housing_allowance: Number(housing_allowance ?? (salIdx !== -1 ? cData.salaries[salIdx].housing_allowance : 0)),
        transportation_allowance: Number(transportation_allowance ?? (salIdx !== -1 ? cData.salaries[salIdx].transportation_allowance : 0)),
        living_allowance: Number(living_allowance ?? (salIdx !== -1 ? cData.salaries[salIdx].living_allowance : 0)),
        other_allowances: Number(other_allowances ?? (salIdx !== -1 ? cData.salaries[salIdx].other_allowances : 0))
    };

    if (salIdx !== -1) {
        cData.salaries[salIdx] = salary;
    } else {
        cData.salaries.push(salary);
    }

    // 3. Update resident extra costs
    const extIdx = cData.resident_extra_costs.findIndex(r => r.employee_id === id);
    const extra = {
        employee_id: id,
        medical_insurance_monthly: Number(medical_insurance_monthly ?? (extIdx !== -1 ? cData.resident_extra_costs[extIdx].medical_insurance_monthly : 0)),
        health_certificate_monthly: Number(health_certificate_monthly ?? (extIdx !== -1 ? cData.resident_extra_costs[extIdx].health_certificate_monthly : 0)),
        exit_reentry_monthly: Number(exit_reentry_monthly ?? (extIdx !== -1 ? cData.resident_extra_costs[extIdx].exit_reentry_monthly : 0))
    };

    if (extIdx !== -1) {
        cData.resident_extra_costs[extIdx] = extra;
    } else {
        cData.resident_extra_costs.push(extra);
    }

    saveCompanyData(companyId, cData);
    return true;
}

// Delete employee
function deleteEmployee(empId, companyId) {
    const id = Number(empId);
    const cData = loadCompanyData(companyId);
    const initialLength = cData.employees.length;
    cData.employees = cData.employees.filter(e => e.id !== id);

    if (cData.employees.length !== initialLength) {
        cData.salaries = cData.salaries.filter(s => s.employee_id !== id);
        cData.resident_extra_costs = cData.resident_extra_costs.filter(r => r.employee_id !== id);
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

module.exports = {
    createCompany,
    getCompanyByEmail,
    updateCompanyProfile,
    getSettings,
    updateSettings,
    getProjects,
    createProject,
    deleteProject,
    getEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    getEmployeesDetailed,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
