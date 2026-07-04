const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const dbFolder = path.join(__dirname, 'db');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}

const globalDbPath = path.join(dbFolder, 'global.json');

// Memory storage
let globalData = {
    companies: [],
    counters: {
        companies: 0
    }
};

// Tenant memory cache
const companyCaches = {};

// PostgreSQL Client
let pgClient = null;
const usePostgres = !!process.env.DATABASE_URL;

/**
 * Initialize database (handles PostgreSQL connection and seeding if production)
 */
async function initDatabase() {
    if (usePostgres) {
        console.log("PostgreSQL DATABASE_URL detected. Connecting to Postgres...");
        pgClient = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        await pgClient.connect();
        console.log("Connected to PostgreSQL successfully.");

        // Create tables if not exist
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS global_registry (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS tenant_store (
                company_id INTEGER PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);

        // Load global registry from Postgres
        const res = await pgClient.query("SELECT * FROM global_registry ORDER BY id ASC");
        globalData.companies = res.rows;
        
        // Find max ID for counter
        const maxIdRes = await pgClient.query("SELECT COALESCE(MAX(id), 0) as max_id FROM global_registry");
        globalData.counters.companies = maxIdRes.rows[0].max_id;
        
        console.log(`Loaded ${globalData.companies.length} company profiles from PostgreSQL.`);

        // Seed default company (1 / 123) if empty
        if (globalData.companies.length === 0) {
            const hash = bcrypt.hashSync("123", 10);
            
            globalData.counters.companies++;
            const id = globalData.counters.companies;
            
            // Insert default company
            await pgClient.query(
                "INSERT INTO global_registry (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)",
                [id, "أحمد سليمان - شركة ريال البركة للتجارة", "1", hash, new Date().toISOString()]
            );

            // Seed tenant data
            const companyData = {
                cost_settings: [{
                    company_id: id,
                    gosi_saudi_rate: 0.22,
                    gosi_resident_rate: 0.02,
                    ticket_annual_cost: 900.0,
                    passport_annual_fee: 650.0,
                    work_permit_annual_fee: 9700.0,
                    vacation_days_per_year: 21,
                    unified_number: '7014477116',
                    cr_number: '1010000000'
                }],
                projects: [{ id: 1, company_id: id, name: 'الإدارة العامة', entity_id: 1, branch_id: 1 }],
                entities: [{ id: 1, company_id: id, name: 'شركة ريال البركة للتجارة', unified_number: '7014477116' }],
                branches: [{ id: 1, company_id: id, name: 'جملة ريال البركة', cr_number: '1010000000', entity_id: 1 }],
                employees: [],
                salaries: [],
                resident_extra_costs: [],
                counters: {
                    projects: 1,
                    entities: 1,
                    branches: 1,
                    employees: 0
                }
            };
            
            await pgClient.query(
                "INSERT INTO tenant_store (company_id, data) VALUES ($1, $2)",
                [id, JSON.stringify(companyData)]
            );
            
            // Reload global
            const reloadRes = await pgClient.query("SELECT * FROM global_registry ORDER BY id ASC");
            globalData.companies = reloadRes.rows;
            console.log("Seeded database with default company (Username: 1, Password: 123) in PostgreSQL");
        }
    } else {
        // Fallback Local JSON database loading
        console.log("Using Local JSON database storage.");
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

        // Seed default company (1 / 123) if local database is empty
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

            const companyData = {
                cost_settings: [{
                    company_id: id,
                    gosi_saudi_rate: 0.22,
                    gosi_resident_rate: 0.02,
                    ticket_annual_cost: 900.0,
                    passport_annual_fee: 650.0,
                    work_permit_annual_fee: 9700.0,
                    vacation_days_per_year: 21,
                    unified_number: '7014477116',
                    cr_number: '1010000000'
                }],
                projects: [{ id: 1, company_id: id, name: 'الإدارة العامة', entity_id: 1, branch_id: 1 }],
                entities: [{ id: 1, company_id: id, name: 'شركة ريال البركة للتجارة', unified_number: '7014477116' }],
                branches: [{ id: 1, company_id: id, name: 'جملة ريال البركة', cr_number: '1010000000', entity_id: 1 }],
                employees: [],
                salaries: [],
                resident_extra_costs: [],
                counters: {
                    projects: 1,
                    entities: 1,
                    branches: 1,
                    employees: 0
                }
            };
            saveCompanyData(id, companyData);
            console.log("Seeded global database and created isolated database for company 1");
        }
    }
}

// Save global index to disk/Postgres
function saveGlobalToDisk() {
    if (usePostgres) {
        // Handled directly inside database updates
    } else {
        try {
            fs.writeFileSync(globalDbPath, JSON.stringify(globalData, null, 2), 'utf8');
        } catch (err) {
            console.error('Error writing to global database file:', err);
        }
    }
}

// Load company data (uses memory cache or local disk/Postgres)
function loadCompanyData(companyId) {
    const cid = Number(companyId);
    
    let companyData;
    if (companyCaches[cid]) {
        companyData = companyCaches[cid];
    } else {
        companyData = {
            cost_settings: [],
            projects: [],
            entities: [],
            branches: [],
            employees: [],
            salaries: [],
            resident_extra_costs: [],
            counters: {
                projects: 0,
                entities: 0,
                branches: 0,
                employees: 0
            }
        };

        if (usePostgres) {
            // Cached database fetch is preloaded via middleware
        } else {
            const filePath = path.join(dbFolder, `company_${cid}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    if (fileContent.trim()) {
                        companyData = JSON.parse(fileContent);
                    }
                } catch (err) {
                    console.error(`Error reading database file for company ${cid}:`, err);
                }
            }
        }
        companyCaches[cid] = companyData;
    }
    
    // Safety Initializers for Backward-Compatibility
    if (!companyData.entities) companyData.entities = [];
    if (!companyData.branches) companyData.branches = [];
    if (!companyData.projects) companyData.projects = [];
    if (!companyData.employees) companyData.employees = [];
    if (!companyData.salaries) companyData.salaries = [];
    if (!companyData.resident_extra_costs) companyData.resident_extra_costs = [];
    if (!companyData.cost_settings) companyData.cost_settings = [];
    
    if (!companyData.counters) companyData.counters = {};
    if (companyData.counters.entities === undefined) companyData.counters.entities = companyData.entities.length;
    if (companyData.counters.branches === undefined) companyData.counters.branches = companyData.branches.length;
    if (companyData.counters.projects === undefined) companyData.counters.projects = companyData.projects.length;
    if (companyData.counters.employees === undefined) companyData.counters.employees = companyData.employees.length;
    
    return companyData;
}

// Load tenant database asynchronously from Postgres (used by server middleware)
async function preloadCompanyCache(companyId) {
    const cid = Number(companyId);
    if (!usePostgres) return;
    
    try {
        const res = await pgClient.query("SELECT data FROM tenant_store WHERE company_id = $1", [cid]);
        if (res.rows.length > 0) {
            companyCaches[cid] = res.rows[0].data;
        } else {
            // Initialize new tenant data
            const companyData = {
                cost_settings: [{
                    company_id: cid,
                    gosi_saudi_rate: 0.22,
                    gosi_resident_rate: 0.02,
                    ticket_annual_cost: 900.0,
                    passport_annual_fee: 650.0,
                    work_permit_annual_fee: 9700.0,
                    vacation_days_per_year: 21,
                    unified_number: '',
                    cr_number: ''
                }],
                projects: [{ id: 1, company_id: cid, name: 'الإدارة العامة', entity_id: 1, branch_id: 1 }],
                entities: [{ id: 1, company_id: cid, name: 'الشركة الرئيسية الافتراضية', unified_number: '' }],
                branches: [{ id: 1, company_id: cid, name: 'الفرع الافتراضي', cr_number: '', entity_id: 1 }],
                employees: [],
                salaries: [],
                resident_extra_costs: [],
                counters: {
                    projects: 1,
                    entities: 1,
                    branches: 1,
                    employees: 0
                }
            };
            await pgClient.query(
                "INSERT INTO tenant_store (company_id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [cid, JSON.stringify(companyData)]
            );
            companyCaches[cid] = companyData;
        }
    } catch (err) {
        console.error(`Failed to preload PostgreSQL cache for company ${cid}:`, err);
    }
}

// Save company data (writes to memory cache and local disk/Postgres waves)
function saveCompanyData(companyId, companyData) {
    const cid = Number(companyId);
    companyCaches[cid] = companyData;
    
    if (usePostgres) {
        pgClient.query(
            "INSERT INTO tenant_store (company_id, data) VALUES ($1, $2) ON CONFLICT (company_id) DO UPDATE SET data = EXCLUDED.data",
            [cid, JSON.stringify(companyData)]
        ).catch(err => {
            console.error(`Failed to write PostgreSQL write-through cache for company ${cid}:`, err);
        });
    } else {
        const filePath = path.join(dbFolder, `company_${cid}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(companyData, null, 2), 'utf8');
        } catch (err) {
            console.error(`Error writing database file for company ${cid}:`, err);
        }
    }
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

    // Initialize tenant database
    const companyData = {
        cost_settings: [{
            company_id: id,
            gosi_saudi_rate: 0.22,
            gosi_resident_rate: 0.02,
            ticket_annual_cost: 900.0,
            passport_annual_fee: 650.0,
            work_permit_annual_fee: 9700.0,
            vacation_days_per_year: 21,
            unified_number: '',
            cr_number: ''
        }],
        projects: [{ id: 1, company_id: id, name: 'الإدارة العامة', entity_id: 1, branch_id: 1 }],
        entities: [{ id: 1, company_id: id, name: name, unified_number: '' }],
        branches: [{ id: 1, company_id: id, name: 'الفرع الرئيسي', cr_number: '', entity_id: 1 }],
        employees: [],
        salaries: [],
        resident_extra_costs: [],
        counters: {
            projects: 1,
            entities: 1,
            branches: 1,
            employees: 0
        }
    };
    
    if (usePostgres) {
        pgClient.query(
            "INSERT INTO global_registry (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)",
            [id, company.name, company.email, company.password_hash, company.created_at]
        ).catch(err => {
            console.error("Failed to insert company into Postgres global registry:", err);
        });
        saveCompanyData(id, companyData);
    } else {
        saveCompanyData(id, companyData);
    }
    
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
        
        if (usePostgres) {
            pgClient.query("UPDATE global_registry SET name = $1 WHERE id = $2", [name.trim(), id])
                .catch(err => {
                    console.error("Failed to update company name in Postgres global registry:", err);
                });
        }
        return true;
    }
    return false;
}

// -------------------------------------------------------------
// ISOLATED TENANT OPERATIONS (Database per tenant)
// -------------------------------------------------------------

// Cost Settings (Unified Number and CR Number included)
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
            vacation_days_per_year: 21,
            unified_number: '',
            cr_number: ''
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
        vacation_days_per_year: Number(settingsData.vacation_days_per_year ?? 21),
        unified_number: (settingsData.unified_number ?? '').toString().trim(),
        cr_number: (settingsData.cr_number ?? '').toString().trim()
    };
    
    if (idx !== -1) {
        cData.cost_settings[idx] = updated;
    } else {
        cData.cost_settings.push(updated);
    }
    saveCompanyData(companyId, cData);
    return true;
}

// Legal Entities (Unified Number, No manual Saudization cost)
function getEntities(companyId) {
    const cData = loadCompanyData(companyId);
    return cData.entities;
}

function createEntity(companyId, name, unified_number = '') {
    const cData = loadCompanyData(companyId);
    cData.counters.entities++;
    const id = cData.counters.entities;
    const entity = { 
        id, 
        company_id: companyId, 
        name: name.trim(), 
        unified_number: unified_number.toString().trim()
    };
    cData.entities.push(entity);
    saveCompanyData(companyId, cData);
    return { lastID: id, name: entity.name, unified_number: entity.unified_number };
}

function updateEntity(companyId, id, name, unified_number) {
    const entId = Number(id);
    const cData = loadCompanyData(companyId);
    const idx = cData.entities.findIndex(e => e.id === entId);
    if (idx !== -1) {
        cData.entities[idx] = {
            ...cData.entities[idx],
            name: name ? name.trim() : cData.entities[idx].name,
            unified_number: unified_number !== undefined ? unified_number.toString().trim() : cData.entities[idx].unified_number
        };
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

function deleteEntity(id, companyId) {
    const entId = Number(id);
    const cData = loadCompanyData(companyId);
    
    // 1. Cascade Protection: Check if any Branch is linked to this Legal Entity
    const hasBranches = cData.branches.some(b => b.entity_id === entId);
    if (hasBranches) {
        throw new Error('لا يمكن حذف الكيان القانوني لوجود فروع تابعة له. يرجى حذف الفروع أو نقلها أولاً.');
    }

    // 2. Cascade Protection: Check if any project is linked to this entity
    const hasProjects = cData.projects.some(p => p.entity_id === entId);
    if (hasProjects) {
        throw new Error('لا يمكن حذف الكيان القانوني لوجود مشاريع تابعة له مباشرة. يرجى نقل المشاريع أولاً.');
    }

    const initialLength = cData.entities.length;
    cData.entities = cData.entities.filter(e => e.id !== entId);
    
    if (cData.entities.length !== initialLength) {
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

// Branches Operations
function getBranches(companyId) {
    const cData = loadCompanyData(companyId);
    return cData.branches;
}

function createBranch(companyId, name, cr_number = '', entity_id = null) {
    const cData = loadCompanyData(companyId);
    cData.counters.branches++;
    const id = cData.counters.branches;
    
    const branch = {
        id,
        company_id: companyId,
        name: name.trim(),
        cr_number: cr_number.toString().trim(),
        entity_id: entity_id ? Number(entity_id) : null
    };
    cData.branches.push(branch);
    saveCompanyData(companyId, cData);
    return { lastID: id, name: branch.name };
}

function updateBranch(companyId, id, name, cr_number, entity_id) {
    const brId = Number(id);
    const cData = loadCompanyData(companyId);
    const idx = cData.branches.findIndex(b => b.id === brId);
    if (idx !== -1) {
        cData.branches[idx] = {
            ...cData.branches[idx],
            name: name ? name.trim() : cData.branches[idx].name,
            cr_number: cr_number !== undefined ? cr_number.toString().trim() : cData.branches[idx].cr_number,
            entity_id: entity_id !== undefined ? (entity_id ? Number(entity_id) : null) : cData.branches[idx].entity_id
        };
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

function deleteBranch(id, companyId) {
    const brId = Number(id);
    const cData = loadCompanyData(companyId);

    // 1. Cascade Protection: Check if any Employee is linked to this branch (legal or cost)
    const hasEmployees = cData.employees.some(emp => emp.branch_id === brId || emp.cost_branch_id === brId);
    if (hasEmployees) {
        throw new Error('لا يمكن حذف هذا الفرع لوجود موظفين مسجلين عليه حالياً (قانونياً أو مالياً).');
    }

    // 2. Cascade Protection: Check if any Project is linked to this branch
    const hasProjects = cData.projects.some(p => p.branch_id === brId);
    if (hasProjects) {
        throw new Error('لا يمكن حذف هذا الفرع لارتباط مشاريع نشطة به. يرجى نقل المشاريع أولاً.');
    }

    const initialLength = cData.branches.length;
    cData.branches = cData.branches.filter(b => b.id !== brId);

    if (cData.branches.length !== initialLength) {
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

// Projects (Belongs to Branch or Legal Entity)
function getProjects(companyId) {
    const cData = loadCompanyData(companyId);
    return cData.projects;
}

function createProject(companyId, name, entity_id = null, branch_id = null) {
    const cData = loadCompanyData(companyId);
    cData.counters.projects++;
    const id = cData.counters.projects;
    
    const project = { 
        id, 
        company_id: companyId, 
        name: name.trim(),
        entity_id: entity_id ? Number(entity_id) : null,
        branch_id: branch_id ? Number(branch_id) : null
    };
    cData.projects.push(project);
    saveCompanyData(companyId, cData);
    return { lastID: id, name: project.name };
}

function updateProject(companyId, id, name, entity_id, branch_id) {
    const projId = Number(id);
    const cData = loadCompanyData(companyId);
    const idx = cData.projects.findIndex(p => p.id === projId);
    if (idx !== -1) {
        cData.projects[idx] = {
            ...cData.projects[idx],
            name: name ? name.trim() : cData.projects[idx].name,
            entity_id: entity_id !== undefined ? (entity_id ? Number(entity_id) : null) : cData.projects[idx].entity_id,
            branch_id: branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : cData.projects[idx].branch_id
        };
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

function deleteProject(id, companyId) {
    const projId = Number(id);
    const cData = loadCompanyData(companyId);

    // Cascade Protection: Check if any Employee is linked to this project
    const hasEmployees = cData.employees.some(emp => emp.project_id === projId);
    if (hasEmployees) {
        throw new Error('لا يمكن حذف هذا المشروع لوجود موظفين مسجلين عليه حالياً. يرجى نقلهم أولاً.');
    }

    const initialLength = cData.projects.length;
    cData.projects = cData.projects.filter(p => p.id !== projId);
    
    if (cData.projects.length !== initialLength) {
        saveCompanyData(companyId, cData);
        return true;
    }
    return false;
}

// Employees detailed list (Hierarchical matching included)
function getEmployeesDetailed(companyId) {
    const cData = loadCompanyData(companyId);
    
    return cData.employees.map(emp => {
        // Resolve legal branch and cost branch
        const legalBr = cData.branches.find(b => b.id === emp.branch_id) || null;
        const costBr = cData.branches.find(b => b.id === emp.cost_branch_id) || null;
        
        // Resolve legal entity (derived from legal branch)
        let legalEnt = null;
        if (legalBr && legalBr.entity_id) {
            legalEnt = cData.entities.find(e => e.id === legalBr.entity_id) || null;
        }

        const proj = cData.projects.find(p => p.id === emp.project_id) || null;
        const sal = cData.salaries.find(s => s.employee_id === emp.id) || {
            basic_salary: 0, housing_allowance: 0, transportation_allowance: 0, living_allowance: 0, other_allowances: 0
        };
        const extra = cData.resident_extra_costs.find(r => r.employee_id === emp.id) || {
            medical_insurance_monthly: 0, health_certificate_monthly: 0, exit_reentry_monthly: 0
        };
        
        return {
            ...emp,
            project_name: proj ? proj.name : 'غير محدد',
            legal_branch_name: legalBr ? legalBr.name : 'غير محدد',
            cost_branch_name: costBr ? costBr.name : 'غير محدد',
            legal_entity_name: legalEnt ? legalEnt.name : 'غير محدد',
            legal_entity_id: legalEnt ? legalEnt.id : null,
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

// Create employee (Includes new branch and saudi_type structures)
function createEmployee(companyId, empData) {
    const { 
        employee_code, name, nationality, gender, status, branch_id, cost_branch_id, project_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly,
        saudi_type, hire_date
    } = empData;

    const cData = loadCompanyData(companyId);

    // Check UNIQUE code for company
    const exists = cData.employees.find(e => e.employee_code.toString().trim() === employee_code.toString().trim());
    if (exists) {
        throw new Error('UNIQUE: الرقم الوظيفي مسجل مسبقاً');
    }

    cData.counters.employees++;
    const id = cData.counters.employees;

    // Resolve Legal & Cost Branch IDs
    const resolvedBranchId = branch_id ? Number(branch_id) : null;
    const resolvedCostBranchId = cost_branch_id ? Number(cost_branch_id) : resolvedBranchId;

    // 1. Employee metadata
    const employee = {
        id,
        company_id: companyId,
        employee_code: employee_code.toString().trim(),
        name: name.trim(),
        nationality: nationality.trim(),
        gender: gender.trim(),
        status: status || 'على رأس العمل',
        branch_id: resolvedBranchId,
        cost_branch_id: resolvedCostBranchId,
        project_id: project_id ? Number(project_id) : null,
        saudi_type: nationality.trim() === 'سعودي' ? (saudi_type || 'working') : null,
        hire_date: hire_date || ''
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

// Update employee (Supports cost branch routing and saudi types)
function updateEmployee(companyId, empId, empData) {
    const id = Number(empId);
    const cData = loadCompanyData(companyId);
    
    // Find employee
    const empIdx = cData.employees.findIndex(e => e.id === id);
    if (empIdx === -1) {
        throw new Error('Employee not found');
    }

    const { 
        employee_code, name, nationality, gender, status, branch_id, cost_branch_id, project_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly,
        saudi_type, hire_date
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

    const resolvedBranchId = branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : cData.employees[empIdx].branch_id;
    const resolvedCostBranchId = cost_branch_id !== undefined ? (cost_branch_id ? Number(cost_branch_id) : null) : cData.employees[empIdx].cost_branch_id;

    // 1. Update basic details
    cData.employees[empIdx] = {
        ...cData.employees[empIdx],
        employee_code: employee_code ? employee_code.toString().trim() : cData.employees[empIdx].employee_code,
        name: name ? name.trim() : cData.employees[empIdx].name,
        nationality: nationality ? nationality.trim() : cData.employees[empIdx].nationality,
        gender: gender ? gender.trim() : cData.employees[empIdx].gender,
        status: status || cData.employees[empIdx].status,
        branch_id: resolvedBranchId,
        cost_branch_id: resolvedCostBranchId || resolvedBranchId,
        project_id: project_id !== undefined ? (project_id ? Number(project_id) : null) : cData.employees[empIdx].project_id,
        saudi_type: (nationality || cData.employees[empIdx].nationality) === 'سعودي' 
            ? (saudi_type || cData.employees[empIdx].saudi_type || 'working') 
            : null,
        hire_date: hire_date !== undefined ? hire_date : cData.employees[empIdx].hire_date
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

// Reset company data to defaults
function resetCompanyData(companyId) {
    const cid = Number(companyId);
    const companyData = {
        cost_settings: [{
            company_id: cid,
            gosi_saudi_rate: 0.22,
            gosi_resident_rate: 0.02,
            ticket_annual_cost: 900.0,
            passport_annual_fee: 650.0,
            work_permit_annual_fee: 9700.0,
            vacation_days_per_year: 21,
            unified_number: '',
            cr_number: ''
        }],
        projects: [{ id: 1, company_id: cid, name: 'الإدارة العامة', entity_id: 1, branch_id: 1 }],
        entities: [{ id: 1, company_id: cid, name: 'الشركة الرئيسية الافتراضية', unified_number: '' }],
        branches: [{ id: 1, company_id: cid, name: 'الفرع الافتراضي', cr_number: '', entity_id: 1 }],
        employees: [],
        salaries: [],
        resident_extra_costs: [],
        counters: {
            projects: 1,
            entities: 1,
            branches: 1,
            employees: 0
        }
    };
    saveCompanyData(cid, companyData);
    return true;
}

module.exports = {
    initDatabase,
    preloadCompanyCache,
    createCompany,
    getCompanyByEmail,
    updateCompanyProfile,
    getSettings,
    updateSettings,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    getBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    getEmployeesDetailed,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    resetCompanyData
};
