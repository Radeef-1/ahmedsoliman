import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');


export default function EmployeesList({ token, projects, entities = [], employees, onDataChange, onUnauthorized }) {
    const [search, setSearch] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterNationality, setFilterNationality] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedEmpId, setSelectedEmpId] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Form fields
    const [employeeCode, setEmployeeCode] = useState('');
    const [name, setName] = useState('');
    const [nationality, setNationality] = useState('سعودي');
    const [gender, setGender] = useState('ذكر');
    const [status, setStatus] = useState('على رأس العمل');
    const [projectId, setProjectId] = useState('');
    const [entityId, setEntityId] = useState('');
    const [basicSalary, setBasicSalary] = useState('');
    const [housingAllowance, setHousingAllowance] = useState('');
    const [transportationAllowance, setTransportationAllowance] = useState('');
    const [livingAllowance, setLivingAllowance] = useState('');
    const [otherAllowances, setOtherAllowances] = useState('');
    const [medicalInsurance, setMedicalInsurance] = useState('');
    const [healthCertificate, setHealthCertificate] = useState('');
    const [exitReentry, setExitReentry] = useState('');

    const localIsSaudi = (nat) => {
        if (!nat) return false;
        const clean = nat.trim().toLowerCase();
        return clean === 'سعودي' || clean === 'سعودية' || clean === 'saudi' || clean === 'saudian';
    };

    const isCurrentSaudi = localIsSaudi(nationality);

    const openAddModal = () => {
        setEditMode(false);
        setSelectedEmpId(null);
        setError('');
        
        // Reset fields
        setEmployeeCode('');
        setName('');
        setNationality('سعودي');
        setGender('ذكر');
        setStatus('على رأس العمل');
        setProjectId(projects.length > 0 ? projects[0].id : '');
        setEntityId(entities.length > 0 ? entities[0].id : '');
        setBasicSalary('');
        setHousingAllowance('');
        setTransportationAllowance('');
        setLivingAllowance('');
        setOtherAllowances('');
        setMedicalInsurance('');
        setHealthCertificate('');
        setExitReentry('');
        
        setModalOpen(true);
    };

    const openEditModal = (emp) => {
        setEditMode(true);
        setSelectedEmpId(emp.id);
        setError('');
        
        // Populate fields
        setEmployeeCode(emp.employee_code || '');
        setName(emp.name || '');
        setNationality(emp.nationality || 'سعودي');
        setGender(emp.gender || 'ذكر');
        setStatus(emp.status || 'على رأس العمل');
        setProjectId(emp.project_id || '');
        setEntityId(emp.entity_id || '');
        setBasicSalary(emp.basic_salary || '');
        setHousingAllowance(emp.housing_allowance || '');
        setTransportationAllowance(emp.transportation_allowance || '');
        setLivingAllowance(emp.living_allowance || '');
        setOtherAllowances(emp.other_allowances || '');
        setMedicalInsurance(emp.medical_insurance_monthly || '');
        setHealthCertificate(emp.health_certificate_monthly || '');
        setExitReentry(emp.exit_reentry_monthly || '');
        
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً؟')) return;
        try {
            const response = await fetch(API_URL + '/api/employees/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                if (onUnauthorized) onUnauthorized();
                return;
            }
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل حذف الموظف');
            }
            onDataChange();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            employee_code: employeeCode,
            name,
            nationality,
            gender,
            status,
            project_id: projectId ? Number(projectId) : null,
            entity_id: entityId ? Number(entityId) : null,
            basic_salary: Number(basicSalary || 0),
            housing_allowance: Number(housingAllowance || 0),
            transportation_allowance: Number(transportationAllowance || 0),
            living_allowance: Number(livingAllowance || 0),
            other_allowances: Number(otherAllowances || 0),
            medical_insurance_monthly: localIsSaudi(nationality) ? 0 : Number(medicalInsurance || 0),
            health_certificate_monthly: localIsSaudi(nationality) ? 0 : Number(healthCertificate || 0),
            exit_reentry_monthly: localIsSaudi(nationality) ? 0 : Number(exitReentry || 0)
        };

        const url = editMode 
            ? API_URL + '/api/employees/' + selectedEmpId
            : API_URL + '/api/employees';
            
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) {
                if (onUnauthorized) onUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'فشل حفظ بيانات الموظف');
            }

            setModalOpen(false);
            onDataChange();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter employees
    const filtered = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                              emp.employee_code.toString().includes(search);
        const matchesProject = !filterProject || emp.project_id === Number(filterProject);
        const matchesEntity = !filterEntity || emp.entity_id === Number(filterEntity);
        const matchesStatus = !filterStatus || emp.status === filterStatus;
        
        let matchesNationality = true;
        if (filterNationality === 'سعودي') {
            matchesNationality = localIsSaudi(emp.nationality);
        } else if (filterNationality === 'مقيم') {
            matchesNationality = !localIsSaudi(emp.nationality);
        }
        
        return matchesSearch && matchesProject && matchesEntity && matchesStatus && matchesNationality;
    });

    return (
        <div className="rtl">
            <div className="header-actions">
                <h2>إدارة سجلات الموظفين والرواتب</h2>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus className="menu-item-icon" />
                    إضافة موظف جديد
                </button>
            </div>

            {/* Filters Dashboard */}
            <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Search style={{ width: '16px' }} /> بحث بالاسم أو الكود
                    </label>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="ابحث هنا..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>تصفية بالشركة / الكيان</label>
                    <select 
                        className="form-control" 
                        value={filterEntity}
                        onChange={(e) => setFilterEntity(e.target.value)}
                    >
                        <option value="">كل الشركات والكيانات</option>
                        {entities.map(ent => (
                            <option key={ent.id} value={ent.id}>{ent.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>تصفية بالمشروع / الفرع</label>
                    <select 
                        className="form-control" 
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                    >
                        <option value="">كل الفروع والمشاريع</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>تصفية بتصنيف الإقامة</label>
                    <select 
                        className="form-control" 
                        value={filterNationality}
                        onChange={(e) => setFilterNationality(e.target.value)}
                    >
                        <option value="">جميع الجنسيات</option>
                        <option value="سعودي">سعوديين</option>
                        <option value="مقيم">مقيمين (غير سعوديين)</option>
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>تصفية بالحالة</label>
                    <select 
                        className="form-control" 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">جميع الحالات</option>
                        <option value="على رأس العمل">على رأس العمل</option>
                        <option value="إجازة">إجازة</option>
                        <option value="استبعاد نهائي">استبعاد نهائي</option>
                    </select>
                </div>
            </div>

            {/* Employees Table */}
            <div className="glass-panel" style={{ padding: '0px' }}>
                <div className="table-container" style={{ margin: '0px' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>الرقم الوظيفي</th>
                                <th>الاسم</th>
                                <th>الجنسية</th>
                                <th>النوع</th>
                                <th>الشركة/الكيان</th>
                                <th>المشروع/الفرع</th>
                                <th>الراتب الأساسي</th>
                                <th>إجمالي البدلات</th>
                                <th>التكلفة الشهرية الكلية</th>
                                <th>الحالة</th>
                                <th>خيارات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((emp) => {
                                const isEmpSaudi = localIsSaudi(emp.nationality);
                                const totalAllowances = Number(emp.housing_allowance || 0) + 
                                                         Number(emp.transportation_allowance || 0) + 
                                                         Number(emp.living_allowance || 0) + 
                                                         Number(emp.other_allowances || 0);
                                return (
                                    <tr key={emp.id}>
                                        <td style={{ fontWeight: '600' }}>{emp.employee_code}</td>
                                        <td>{emp.name}</td>
                                        <td>{emp.nationality}</td>
                                        <td>{emp.gender}</td>
                                        <td style={{ fontWeight: '500', color: 'var(--info)' }}>{emp.entity_name}</td>
                                        <td>{emp.project_name}</td>
                                        <td>{(emp.basic_salary || 0).toLocaleString()} ريال</td>
                                        <td>{totalAllowances.toLocaleString()} ريال</td>
                                        <td style={{ fontWeight: '700', color: '#fff' }}>
                                            {(emp.total_monthly_cost || emp.basic_salary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ريال
                                        </td>
                                        <td>
                                            <span className={`badge ${emp.status === 'على رأس العمل' ? 'badge-success' : emp.status === 'إجازة' ? 'badge-warning' : 'badge-danger'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => openEditModal(emp)}>
                                                    <Edit2 style={{ width: '14px', height: '14px' }} />
                                                </button>
                                                <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleDelete(emp.id)}>
                                                    <Trash2 style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        لا توجد نتائج بحث مطابقة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Edit/Add Employee */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel">
                        <div className="modal-header">
                            <h3>{editMode ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h3>
                            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setModalOpen(false)}>
                                <X style={{ width: '18px', height: '18px' }} />
                            </button>
                        </div>

                        {error && <div className="badge badge-danger" style={{ display: 'block', textAlign: 'center', marginBottom: '20px', padding: '10px' }}>{error}</div>}

                        <form onSubmit={handleFormSubmit}>
                            <h4 style={{ marginBottom: '16px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>البيانات الأساسية</h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>الرقم الوظيفي *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={employeeCode}
                                        onChange={(e) => setEmployeeCode(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>اسم الموظف *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>الجنسية *</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="سعودي، يمني، بنجلاديش..."
                                        value={nationality}
                                        onChange={(e) => setNationality(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>النوع *</label>
                                    <select 
                                        className="form-control"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                    >
                                        <option value="ذكر">ذكر</option>
                                        <option value="أنثى">أنثى</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>الشركة / الكيان *</label>
                                    <select 
                                        className="form-control"
                                        value={entityId}
                                        onChange={(e) => setEntityId(e.target.value)}
                                        required
                                    >
                                        <option value="">اختر الكيان...</option>
                                        {entities.map(ent => (
                                            <option key={ent.id} value={ent.id}>{ent.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>المشروع / الفرع *</label>
                                    <select 
                                        className="form-control"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        required
                                    >
                                        <option value="">اختر المشروع...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>الحالة الوظيفية</label>
                                    <select 
                                        className="form-control"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="على رأس العمل">على رأس العمل</option>
                                        <option value="إجازة">إجازة</option>
                                        <option value="استبعاد نهائي">استبعاد نهائي</option>
                                    </select>
                                </div>
                            </div>

                            <h4 style={{ margin: '24px 0 16px', color: 'var(--success)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>الرواتب والبدلات الشهرية</h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>الراتب الأساسي (ريال)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={basicSalary}
                                        onChange={(e) => setBasicSalary(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>بدل السكن (ريال)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={housingAllowance}
                                        onChange={(e) => setHousingAllowance(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>بدل الانتقال (ريال)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={transportationAllowance}
                                        onChange={(e) => setTransportationAllowance(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>بدل معيشة (ريال)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={livingAllowance}
                                        onChange={(e) => setLivingAllowance(e.target.value)}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>بدلات أخرى (ريال)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        value={otherAllowances}
                                        onChange={(e) => setOtherAllowances(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Resident Extra Costs Form - Only display if not Saudi */}
                            {!isCurrentSaudi && (
                                <>
                                    <h4 style={{ margin: '24px 0 16px', color: 'var(--warning)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>مصاريف المقيم الإضافية المخصصة (شهري)</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>قسط التأمين الطبي للموظف (ريال/شهري)</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={medicalInsurance}
                                                onChange={(e) => setMedicalInsurance(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>تكلفة الشهادة الصحية (ريال/شهري)</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={healthCertificate}
                                                onChange={(e) => setHealthCertificate(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label>رسوم تأشيرة الخروج والعودة (ريال/شهري)</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={exitReentry}
                                                onChange={(e) => setExitReentry(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
