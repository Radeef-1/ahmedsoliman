import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, FileText, UploadCloud, LogOut, Building, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import EmployeesList from './components/EmployeesList';
import CostSettings from './components/CostSettings';
import ExcelImport from './components/ExcelImport';
import PivotReport from './components/PivotReport';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [company, setCompany] = useState(JSON.parse(localStorage.getItem('company') || 'null'));
    const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
    
    // App states
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, employees, settings, report, import
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [entities, setEntities] = useState([]);
    const [costsData, setCostsData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Project management states
    const [newProjectName, setNewProjectName] = useState('');
    const [projectError, setProjectError] = useState('');

    // Entity management states
    const [newEntityName, setNewEntityName] = useState('');
    const [newEntityCost, setNewEntityCost] = useState('');
    const [entityError, setEntityError] = useState('');
    const [editingEntityId, setEditingEntityId] = useState(null);
    const [editEntityName, setEditEntityName] = useState('');
    const [editEntityCost, setEditEntityCost] = useState('');

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get projects
            const projRes = await fetch(API_URL + '/api/projects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const projs = await projRes.json();
            if (projRes.ok) setProjects(projs);

            // Get entities (sub-companies)
            const entRes = await fetch(API_URL + '/api/entities', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const ents = await entRes.json();
            if (entRes.ok) setEntities(ents);

            // Get costing detailed data
            const costRes = await fetch(API_URL + '/api/costs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const costs = await costRes.json();
            if (costRes.ok) {
                setCostsData(costs);
                setEmployees(costs.employees || []);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = (newToken, newCompany) => {
        setToken(newToken);
        setCompany(newCompany);
        setActiveTab('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('company');
        setToken('');
        setCompany(null);
        setAuthScreen('login');
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        setProjectError('');

        try {
            const response = await fetch(API_URL + '/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newProjectName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل إضافة المشروع');
            
            setNewProjectName('');
            setProjects(prev => [...prev, data]);
        } catch (err) {
            setProjectError(err.message);
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المشروع؟ سيتم إلغاء ربط الموظفين المرتبطين به.')) return;
        try {
            const response = await fetch(API_URL + '/api/projects/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل حذف المشروع');
            }
            setProjects(prev => prev.filter(p => p.id !== id));
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAddEntity = async (e) => {
        e.preventDefault();
        if (!newEntityName.trim()) return;
        setEntityError('');

        try {
            const response = await fetch(API_URL + '/api/entities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    name: newEntityName, 
                    saudization_cost: Number(newEntityCost || 0) 
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل إضافة الكيان');
            
            setNewEntityName('');
            setNewEntityCost('');
            setEntities(prev => [...prev, data]);
            fetchData();
        } catch (err) {
            setEntityError(err.message);
        }
    };

    const handleStartEditEntity = (ent) => {
        setEditingEntityId(ent.id);
        setEditEntityName(ent.name);
        setEditEntityCost(ent.saudization_cost);
    };

    const handleSaveEntityEdit = async (id) => {
        setEntityError('');
        try {
            const response = await fetch(API_URL + '/api/entities/' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editEntityName,
                    saudization_cost: Number(editEntityCost || 0)
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل تحديث الكيان');
            
            setEditingEntityId(null);
            fetchData();
        } catch (err) {
            setEntityError(err.message);
        }
    };

    const handleDeleteEntity = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الكيان؟ سيتم إلغاء ربط الموظفين المرتبطين به.')) return;
        try {
            const response = await fetch(API_URL + '/api/entities/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل حذف الكيان');
            }
            setEntities(prev => prev.filter(e => e.id !== id));
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    // Render Auth Screen if not logged in
    if (!token) {
        if (authScreen === 'register') {
            return (
                <Register 
                    onRegisterSuccess={() => setAuthScreen('login')}
                    onNavigateToLogin={() => setAuthScreen('login')}
                />
            );
        }
        return (
            <Login 
                onLoginSuccess={handleLoginSuccess}
                onNavigateToRegister={() => setAuthScreen('register')}
            />
        );
    }

    return (
        <div className="app-container rtl">
            {/* Sidebar navigation */}
            <div className="sidebar">
                <div>
                    <div className="sidebar-logo">
                        <Building className="menu-item-icon" style={{ strokeWidth: 2.5 }} />
                        <span>تكلفتي</span>
                    </div>

                    <ul className="sidebar-menu">
                        <li 
                            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <LayoutDashboard className="menu-item-icon" />
                            <span>لوحة التحكم</span>
                        </li>
                        <li 
                            className={`menu-item ${activeTab === 'employees' ? 'active' : ''}`}
                            onClick={() => setActiveTab('employees')}
                        >
                            <Users className="menu-item-icon" />
                            <span>الموظفين والرواتب</span>
                        </li>
                        <li 
                            className={`menu-item ${activeTab === 'report' ? 'active' : ''}`}
                            onClick={() => setActiveTab('report')}
                        >
                            <FileText className="menu-item-icon" />
                            <span>تقرير المشاريع</span>
                        </li>
                        <li 
                            className={`menu-item ${activeTab === 'import' ? 'active' : ''}`}
                            onClick={() => setActiveTab('import')}
                        >
                            <UploadCloud className="menu-item-icon" />
                            <span>استيراد الإكسيل</span>
                        </li>
                        <li 
                            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            <Settings className="menu-item-icon" />
                            <span>إعدادات التكاليف</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المستخدِم الحالي</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {company?.name}
                        </div>
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%', gap: '10px' }} onClick={handleLogout}>
                        <LogOut style={{ width: '16px' }} />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </div>

            {/* Main content display area */}
            <div className="main-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div className="company-badge">
                        بوابة إدارة التكاليف: {company?.name}
                    </div>
                    {loading && <div className="badge badge-info" style={{ animation: 'pulse 1.5s infinite' }}>جاري المزامنة...</div>}
                </div>

                {activeTab === 'dashboard' && (
                    <Dashboard 
                        summary={costsData?.summary} 
                        employees={employees} 
                    />
                )}

                {activeTab === 'employees' && (
                    <EmployeesList 
                        token={token}
                        projects={projects}
                        entities={entities}
                        employees={employees}
                        onDataChange={fetchData}
                    />
                )}

                {activeTab === 'report' && (
                    <PivotReport 
                        employees={employees}
                        summary={costsData?.summary}
                    />
                )}

                {activeTab === 'import' && (
                    <ExcelImport 
                        token={token}
                        onImportSuccess={fetchData}
                    />
                )}

                {activeTab === 'settings' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                        <div>
                            <CostSettings 
                                token={token}
                                company={company}
                                onCompanyUpdate={(updatedCompany) => {
                                    setCompany(updatedCompany);
                                    localStorage.setItem('company', JSON.stringify(updatedCompany));
                                }}
                                onSettingsUpdated={fetchData}
                            />
                            
                            {/* Entity/Sub-company Management Panel */}
                            <div className="glass-panel" style={{ marginTop: '24px' }}>
                                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>إدارة الكيانات والشركات الفرعية</h3>
                                
                                {entityError && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '16px' }}>{entityError}</div>}
                                
                                <form onSubmit={handleAddEntity} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '20px' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="اسم الكيان الفرعي..."
                                        value={newEntityName}
                                        onChange={(e) => setNewEntityName(e.target.value)}
                                        required
                                    />
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        placeholder="مبلغ السعودة..."
                                        value={newEntityCost}
                                        onChange={(e) => setNewEntityCost(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary">
                                        <Plus style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </form>

                                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {entities.map(ent => (
                                        <div key={ent.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', gap: '8px' }}>
                                            {editingEntityId === ent.id ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: '6px', alignItems: 'center' }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={editEntityName}
                                                        onChange={(e) => setEditEntityName(e.target.value)}
                                                    />
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        value={editEntityCost}
                                                        onChange={(e) => setEditEntityCost(e.target.value)}
                                                    />
                                                    <button className="btn btn-primary" style={{ padding: '6px' }} onClick={() => handleSaveEntityEdit(ent.id)}>
                                                        <Save style={{ width: '14px', height: '14px' }} />
                                                    </button>
                                                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setEditingEntityId(null)}>
                                                        <X style={{ width: '14px', height: '14px' }} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{ent.name}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                                                            مبلغ السعودة: {(ent.saudization_cost || 0).toLocaleString()} ريال/شهري
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--text-secondary)' }} onClick={() => handleStartEditEntity(ent)}>
                                                            <Edit2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteEntity(ent.id)}>
                                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {entities.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد كيانات مضافة</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Project Management Panel */}
                        <div className="glass-panel" style={{ height: 'fit-content' }}>
                            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>إدارة المشاريع والفروع</h3>
                            
                            {projectError && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '16px' }}>{projectError}</div>}
                            
                            <form onSubmit={handleAddProject} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    style={{ flexGrow: 1 }}
                                    placeholder="اسم المشروع الجديد..."
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                                    <Plus style={{ width: '16px', height: '16px' }} />
                                </button>
                            </form>

                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {projects.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                                        <button className="btn" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteProject(p.id)}>
                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    </div>
                                ))}
                                {projects.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد مشاريع مضافة</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
