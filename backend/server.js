const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const costEngine = require('./costEngine');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'SUPER_SECRET_HR_KEY_2026';

app.use(cors());
app.use(express.json());

// Set up file upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

// JWT authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied, token missing' });
    
    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        
        // Preload company data cache from database if using Postgres
        await db.preloadCompanyCache(user.id);
        
        next();
    });
}

// -------------------------------------------------------------
// AUTH ENDPOINTS
// -------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.createCompany(name.trim(), email.trim(), hash);
        res.status(201).json({ message: 'تم تسجيل الشركة بنجاح' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }
    
    try {
        const company = db.getCompanyByEmail(email.trim());
        if (!company) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        const valid = await bcrypt.compare(password, company.password_hash);
        if (!valid) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        
        const token = jwt.sign({ id: company.id, name: company.name, email: company.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, company: { id: company.id, name: company.name, email: company.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ company: req.user });
});

app.put('/api/auth/profile', authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    
    try {
        db.updateCompanyProfile(req.user.id, name);
        res.json({ message: 'تم تحديث اسم الشركة بنجاح', name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// SETTINGS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/settings', authenticateToken, (req, res) => {
    try {
        const settings = db.getSettings(req.user.id);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', authenticateToken, (req, res) => {
    const { gosi_saudi_rate, gosi_resident_rate, ticket_annual_cost, passport_annual_fee, work_permit_annual_fee, vacation_days_per_year } = req.body;
    
    try {
        db.updateSettings(req.user.id, {
            gosi_saudi_rate, gosi_resident_rate, ticket_annual_cost, 
            passport_annual_fee, work_permit_annual_fee, vacation_days_per_year
        });
        res.json({ message: 'تم تحديث الإعدادات بنجاح' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// PROJECTS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/projects', authenticateToken, (req, res) => {
    try {
        const projects = db.getProjects(req.user.id);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const { name, entity_id, branch_id } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم المشروع مطلوب' });
    
    try {
        const result = db.createProject(req.user.id, name, entity_id, branch_id);
        res.status(201).json({ id: result.lastID, name: result.name, entity_id, branch_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const { name, entity_id, branch_id } = req.body;
    try {
        const success = db.updateProject(req.user.id, req.params.id, name, entity_id, branch_id);
        if (success) {
            res.json({ message: 'تم تحديث المشروع بنجاح' });
        } else {
            res.status(404).json({ error: 'المشروع غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    try {
        const success = db.deleteProject(req.params.id, req.user.id);
        if (success) {
            res.json({ message: 'تم حذف المشروع بنجاح' });
        } else {
            res.status(404).json({ error: 'المشروع غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// ENTITIES (LEGAL ENTITIES) ENDPOINTS
// -------------------------------------------------------------

app.get('/api/entities', authenticateToken, (req, res) => {
    try {
        const entities = db.getEntities(req.user.id);
        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/entities', authenticateToken, (req, res) => {
    const { name, unified_number } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الكيان القانوني مطلوب' });
    
    try {
        const result = db.createEntity(req.user.id, name, unified_number);
        res.status(201).json({ id: result.lastID, name: result.name, unified_number: result.unified_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/entities/:id', authenticateToken, (req, res) => {
    const { name, unified_number } = req.body;
    try {
        const success = db.updateEntity(req.user.id, req.params.id, name, unified_number);
        if (success) {
            res.json({ message: 'تم تحديث الكيان بنجاح' });
        } else {
            res.status(404).json({ error: 'الكيان غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/entities/:id', authenticateToken, (req, res) => {
    try {
        const success = db.deleteEntity(req.params.id, req.user.id);
        if (success) {
            res.json({ message: 'تم حذف الكيان بنجاح' });
        } else {
            res.status(404).json({ error: 'الكيان غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// BRANCHES ENDPOINTS
// -------------------------------------------------------------

app.get('/api/branches', authenticateToken, (req, res) => {
    try {
        const branches = db.getBranches(req.user.id);
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/branches', authenticateToken, (req, res) => {
    const { name, cr_number, entity_id } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الفرع مطلوب' });
    
    try {
        const result = db.createBranch(req.user.id, name, cr_number, entity_id);
        res.status(201).json({ id: result.lastID, name: result.name, cr_number, entity_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/branches/:id', authenticateToken, (req, res) => {
    const { name, cr_number, entity_id } = req.body;
    try {
        const success = db.updateBranch(req.user.id, req.params.id, name, cr_number, entity_id);
        if (success) {
            res.json({ message: 'تم تحديث الفرع بنجاح' });
        } else {
            res.status(404).json({ error: 'الفرع غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/branches/:id', authenticateToken, (req, res) => {
    try {
        const success = db.deleteBranch(req.params.id, req.user.id);
        if (success) {
            res.json({ message: 'تم حذف الفرع بنجاح' });
        } else {
            res.status(404).json({ error: 'الفرع غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// EMPLOYEES ENDPOINTS
// -------------------------------------------------------------

app.get('/api/employees', authenticateToken, (req, res) => {
    try {
        const employees = db.getEmployeesDetailed(req.user.id);
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', authenticateToken, (req, res) => {
    const { 
        employee_code, name, nationality, gender, status, project_id, entity_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
    } = req.body;
    
    if (!employee_code || !name || !nationality || !gender) {
        return res.status(400).json({ error: 'الرقم الوظيفي، الاسم، الجنسية والنوع مطلوبة' });
    }
    
    try {
        const result = db.createEmployee(req.user.id, {
            employee_code, name, nationality, gender, status, project_id, entity_id,
            basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
            medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
        });
        res.status(201).json({ id: result.lastID, message: 'تم إضافة الموظف بنجاح' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'الرقم الوظيفي مسجل مسبقاً' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/employees/:id', authenticateToken, (req, res) => {
    const empId = req.params.id;
    const { 
        employee_code, name, nationality, gender, status, project_id, entity_id,
        basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
        medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
    } = req.body;
    
    try {
        db.updateEmployee(req.user.id, empId, {
            employee_code, name, nationality, gender, status, project_id, entity_id,
            basic_salary, housing_allowance, transportation_allowance, living_allowance, other_allowances,
            medical_insurance_monthly, health_certificate_monthly, exit_reentry_monthly
        });
        res.json({ message: 'تم تحديث بيانات الموظف بنجاح' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'الرقم الوظيفي مسجل مسبقاً' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/employees/:id', authenticateToken, (req, res) => {
    try {
        const success = db.deleteEmployee(req.params.id, req.user.id);
        if (success) {
            res.json({ message: 'تم حذف الموظف بنجاح' });
        } else {
            res.status(404).json({ error: 'الموظف غير موجود' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// CALCULATED COST SHEET ENDPOINT
// -------------------------------------------------------------

app.get('/api/costs', authenticateToken, (req, res) => {
    try {
        const data = costEngine.calculateCompanyCosts(req.user.id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// EXCEL IMPORT ENDPOINT
// -------------------------------------------------------------

app.post('/api/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }
    
    const filePath = req.file.path;
    try {
        const workbook = xlsx.readFile(filePath);
        
        // Find sheets
        const metadataSheet = workbook.Sheets['اسماء الموظفين'] || workbook.Sheets[workbook.SheetNames[0]];
        const salarySheet = workbook.Sheets['بـيـان مرتبات'];
        const residentCostsSheet = workbook.Sheets['تكاليف المقيمين'];
        const saudiCostsSheet = workbook.Sheets['تكاليف السعودة'];
        
        if (!metadataSheet) {
            return res.status(400).json({ error: 'لم يتم العثور على ورقة الموظفين الأساسية في الملف' });
        }
        
        // Convert sheets to JSON
        const metadataRows = xlsx.utils.sheet_to_json(metadataSheet);
        const salaryRows = salarySheet ? xlsx.utils.sheet_to_json(salarySheet) : [];
        const residentCostsRows = residentCostsSheet ? xlsx.utils.sheet_to_json(residentCostsSheet) : [];
        const saudiCostsRows = saudiCostsSheet ? xlsx.utils.sheet_to_json(saudiCostsSheet) : [];
        
        // Create lookup maps by employee code
        const salaryMap = {};
        salaryRows.forEach(row => {
            const code = row['الرقم الوظيفي'] || row['employee_code'] || row['code'] || row['ID'];
            if (code) salaryMap[code.toString().trim()] = row;
        });

        const extraCostsMap = {};
        [...residentCostsRows, ...saudiCostsRows].forEach(row => {
            const code = row['الرقم الوظيفي'] || row['employee_code'] || row['code'] || row['ID'];
            if (code) extraCostsMap[code.toString().trim()] = row;
        });
        
        let successCount = 0;
        let skipCount = 0;
        
        // Load and cache existing structures
        const entitiesList = db.getEntities(req.user.id);
        const entityCache = {};
        entitiesList.forEach(e => {
            entityCache[e.name.trim()] = e.id;
        });
        
        const branchesList = db.getBranches(req.user.id);
        const branchCache = {};
        branchesList.forEach(b => {
            branchCache[b.name.trim() + '_' + b.entity_id] = b.id;
        });
        
        const projectsList = db.getProjects(req.user.id);
        const projectCache = {};
        projectsList.forEach(p => {
            projectCache[p.name.trim() + '_' + (p.branch_id || p.entity_id || '')] = p.id;
        });

        // Date formatter helper
        function formatExcelDate(val) {
            if (!val) return '';
            if (val instanceof Date) {
                return val.toISOString().split('T')[0];
            }
            if (typeof val === 'number') {
                const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                return date.toISOString().split('T')[0];
            }
            return val.toString().trim();
        }
        
        for (const row of metadataRows) {
            const code = row['الرقم الوظيفي'] || row['الرقم'] || row['employee_code'] || row['code'] || row['ID'];
            const name = row['اسم الموظف'] || row['أسم الموظف'] || row['الاسم'] || row['name'] || row['employee_name'];
            
            // Skip headers or empty rows
            if (!code || !name || code.toString().trim() === 'م' || code.toString().trim() === 'الرقم الوظيفي') {
                skipCount++;
                continue;
            }
            
            const cleanCode = code.toString().trim();
            const salaryRow = salaryMap[cleanCode] || {};
            const costRow = extraCostsMap[cleanCode] || {};
            
            const nationality = row['الجنسية'] || row['nationality'] || 'سعودي';
            const gender = row['النوع'] || row['الجنس'] || row['gender'] || 'ذكر';
            const status = row['حالة الموظف'] || row['الحالة'] || row['status'] || 'على رأس العمل';
            const hireDate = formatExcelDate(row['تاريخ بداية العمل']);
            
            const rawLegalEntityName = row['اسم الشركة'] || salaryRow['الشركة'] || row['الشركة'] || 'شركة ريال البركة للتجارة';
            const legalEntityName = rawLegalEntityName.toString().trim();
            const unifiedNumber = row['الالرقم 700'] || row['الرقم 700'] || '';
            
            const rawBranchName = row['الكيان'] || 'جملة ريال البركة';
            const branchName = rawBranchName.toString().trim();
            
            const rawProjectName = row['المشروع'] || row['الموقع'] || 'الإدارة العامة';
            const projectName = rawProjectName.toString().trim();
            
            // Financial calculations (from salaries sheet or fallback)
            const basic = Number(salaryRow['الراتب الأساسي'] || row['الراتب الأساسي'] || 0);
            const housing = Number(salaryRow['بدل السكن'] || row['بدل السكن'] || 0);
            const trans = Number(salaryRow['بدل الانتقال'] || salaryRow['بدل انتقال'] || row['بدل الانتقال'] || 0);
            const living = Number(salaryRow['بدل معيشة'] || salaryRow['بدل المعيشة'] || row['بدل معيشة'] || 0);
            const other = Number(salaryRow['بدلات أخرى'] || salaryRow['بدل آخر'] || row['بدلات أخرى'] || 0);
            
            const medical = Number(costRow['التأمين الطبي'] || costRow['التأمين الطبي '] || row['التأمين الطبي'] || 0);
            const healthCert = Number(costRow['الشهادة الصحية'] || row['الشهادة الصحية'] || 0);
            const exitReentry = Number(costRow['تأشيرة الخروج والعودة'] || costRow['تأشيرة الخروج والعودة '] || row['تأشيرة الخروج والعودة'] || 0);
            
            // 1. Resolve Legal Entity (الكيان الكبير)
            let entityId = null;
            if (entityCache[legalEntityName]) {
                entityId = entityCache[legalEntityName];
            } else {
                const entRes = db.createEntity(req.user.id, legalEntityName, unifiedNumber);
                entityId = entRes.lastID;
                entityCache[legalEntityName] = entityId;
            }
            
            // 2. Resolve Branch (الفرع) linked to Legal Entity
            let branchId = null;
            const branchKey = branchName + '_' + entityId;
            if (branchCache[branchKey]) {
                branchId = branchCache[branchKey];
            } else {
                const brRes = db.createBranch(req.user.id, branchName, '', entityId);
                branchId = brRes.lastID;
                branchCache[branchKey] = branchId;
            }
            
            // 3. Resolve Project (المشروع) linked to Branch
            let projectId = null;
            const projectKey = projectName + '_' + branchId;
            if (projectCache[projectKey]) {
                projectId = projectCache[projectKey];
            } else {
                const projRes = db.createProject(req.user.id, projectName, entityId, branchId);
                projectId = projRes.lastID;
                projectCache[projectKey] = projectId;
            }
            
            // Resolve Saudi Type
            let saudiType = null;
            if (nationality.trim() === 'سعودي') {
                const jobTitle = (row['المسمي الوظيفي'] || '').toString().toLowerCase();
                if (jobTitle.includes('سعودة') || jobTitle.includes('دعم نشاط') || basic <= 2000) {
                    saudiType = 'support';
                } else {
                    saudiType = 'working';
                }
            }
            
            // Insert or Update Employee
            const employeesList = db.getEmployeesDetailed(req.user.id);
            const existingEmp = employeesList.find(e => e.employee_code.toString().trim() === cleanCode);
            
            const payload = {
                employee_code: cleanCode,
                name,
                nationality,
                gender,
                status,
                branch_id: branchId,
                cost_branch_id: branchId,
                project_id: projectId,
                basic_salary: basic,
                housing_allowance: housing,
                transportation_allowance: trans,
                living_allowance: living,
                other_allowances: other,
                medical_insurance_monthly: medical,
                health_certificate_monthly: healthCert,
                exit_reentry_monthly: exitReentry,
                saudi_type: saudiType,
                hire_date: hireDate
            };
            
            if (existingEmp) {
                db.updateEmployee(req.user.id, existingEmp.id, payload);
            } else {
                db.createEmployee(req.user.id, payload);
            }
            
            successCount++;
        }
        
        fs.unlinkSync(filePath); // delete temp file
        res.json({ message: 'تم استيراد كشف الموظفين بنجاح ومطابقته مع الرواتب والتكاليف السحابية', successCount, skipCount });
    } catch (err) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ error: err.message });
    }
});

// Serve static assets from frontend build directory
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
    console.log("Serving frontend static assets from:", frontendDistPath);
} else {
    console.log("Frontend build folder not found at:", frontendDistPath);
}

// Start server after database initialization
db.initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
});
