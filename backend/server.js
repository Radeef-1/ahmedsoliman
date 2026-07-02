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
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
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
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم المشروع مطلوب' });
    
    try {
        const result = db.createProject(req.user.id, name);
        res.status(201).json({ id: result.lastID, name: result.name });
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
// ENTITIES (SUB-COMPANIES) ENDPOINTS
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
    const { name, saudization_cost } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الكيان مطلوب' });
    
    try {
        const result = db.createEntity(req.user.id, name, saudization_cost);
        res.status(201).json({ id: result.lastID, name: result.name, saudization_cost: result.saudization_cost });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/entities/:id', authenticateToken, (req, res) => {
    const { name, saudization_cost } = req.body;
    try {
        const success = db.updateEntity(req.user.id, req.params.id, name, saudization_cost);
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
        const sheetName = workbook.SheetNames[0]; // read first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawRows = xlsx.utils.sheet_to_json(worksheet);
        
        let successCount = 0;
        let skipCount = 0;
        
        // Get list of existing projects for cache
        const projectsList = db.getProjects(req.user.id);
        const projectCache = {};
        projectsList.forEach(p => {
            projectCache[p.name.trim()] = p.id;
        });

        // Get list of existing entities for cache
        const entitiesList = db.getEntities(req.user.id);
        const entityCache = {};
        entitiesList.forEach(e => {
            entityCache[e.name.trim()] = e.id;
        });
        
        for (const row of rawRows) {
            // Find fields map (support both Arabic and English headers)
            const code = row['الرقم الوظيفي'] || row['الرقم'] || row['employee_code'] || row['code'] || row['ID'];
            const name = row['اسم الموظف'] || row['أسم الموظف'] || row['الاسم'] || row['name'] || row['employee_name'];
            const nationality = row['الجنسية'] || row['nationality'] || 'سعودي';
            const gender = row['النوع'] || row['الجنس'] || row['gender'] || 'ذكر';
            const status = row['حالة الموظف'] || row['الحالة'] || row['status'] || 'على رأس العمل';
            const projectName = row['المشروع'] || row['الموقع'] || row['القسم'] || row['project'] || row['location'];
            const companyName = row['الشركة'] || row['الكيان'] || row['company'] || row['entity'];
            
            const basic = Number(row['الراتب الأساسي'] || row['الراتب'] || row['الراتب '] || row['basic_salary'] || row['salary'] || 0);
            const housing = Number(row['بدل السكن'] || row['بدل سكن'] || row['housing_allowance'] || row['housing'] || 0);
            const trans = Number(row['بدل الانتقال'] || row['بدل انتقال'] || row['transportation_allowance'] || row['trans'] || 0);
            const living = Number(row['بدل معيشة'] || row['بدل المعيشة'] || row['living_allowance'] || row['living'] || 0);
            const other = Number(row['بدلات أخرى'] || row['بدل آخر'] || row['other_allowances'] || row['other'] || 0);
            
            const medical = Number(row['التأمين الطبي'] || row['التأمين الطبي '] || row['التأمين'] || row['medical_insurance'] || row['medical'] || 0);
            const healthCert = Number(row['الشهادة الصحية'] || row['health_certificate'] || 0);
            const exitReentry = Number(row['تأشيرة الخروج والعودة'] || row['exit_reentry'] || 0);
            
            if (!code || !name) {
                skipCount++;
                continue; // ID and Name are critical
            }
            
            // Resolve project ID
            let projectId = null;
            if (projectName && projectName.toString().trim()) {
                const cleanProjName = projectName.toString().trim();
                if (projectCache[cleanProjName]) {
                    projectId = projectCache[cleanProjName];
                } else {
                    // Create new project
                    const projResult = db.createProject(req.user.id, cleanProjName);
                    projectId = projResult.lastID;
                    projectCache[cleanProjName] = projectId;
                }
            }

            // Resolve entity ID
            let entityId = null;
            if (companyName && companyName.toString().trim()) {
                const cleanCompanyName = companyName.toString().trim();
                if (entityCache[cleanCompanyName]) {
                    entityId = entityCache[cleanCompanyName];
                } else {
                    // Create new entity
                    const entResult = db.createEntity(req.user.id, cleanCompanyName, 0);
                    entityId = entResult.lastID;
                    entityCache[cleanCompanyName] = entityId;
                }
            }
            
            // Insert or Update Employee
            const existingEmp = db.getEmployeesDetailed(req.user.id).find(e => e.employee_code.toString().trim() === code.toString().trim());
            
            if (existingEmp) {
                const empId = existingEmp.id;
                db.updateEmployee(req.user.id, empId, {
                    employee_code: code,
                    name,
                    nationality,
                    gender,
                    status,
                    project_id: projectId,
                    entity_id: entityId,
                    basic_salary: basic,
                    housing_allowance: housing,
                    transportation_allowance: trans,
                    living_allowance: living,
                    other_allowances: other,
                    medical_insurance_monthly: medical,
                    health_certificate_monthly: healthCert,
                    exit_reentry_monthly: exitReentry
                });
            } else {
                db.createEmployee(req.user.id, {
                    employee_code: code,
                    name,
                    nationality,
                    gender,
                    status,
                    project_id: projectId,
                    entity_id: entityId,
                    basic_salary: basic,
                    housing_allowance: housing,
                    transportation_allowance: trans,
                    living_allowance: living,
                    other_allowances: other,
                    medical_insurance_monthly: medical,
                    health_certificate_monthly: healthCert,
                    exit_reentry_monthly: exitReentry
                });
            }
            
            successCount++;
        }
        
        fs.unlinkSync(filePath); // delete temp file
        res.json({ message: 'تم استيراد الملف بنجاح', successCount, skipCount });
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
