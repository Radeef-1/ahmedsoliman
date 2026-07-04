import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, FileText, UploadCloud, LogOut, Building, Plus, Trash2, Edit2, Save, X, Briefcase } from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import EmployeesList from './components/EmployeesList';
import CostSettings from './components/CostSettings';
import ExcelImport from './components/ExcelImport';
import PivotReport from './components/PivotReport';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [company, setCompany] = useState(JSON.parse(localStorage.getItem('company') || 'null'));
    const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
    
    // App states
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, employees, settings, report, import
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [entities, setEntities] = useState([]);
    const [branches, setBranches] = useState([]);
    const [costsData, setCostsData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Project management states
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectBranchId, setNewProjectBranchId] = useState('');
    const [projectError, setProjectError] = useState('');
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectBranchId, setEditProjectBranchId] = useState('');

    // Entity management states
    const [newEntityName, setNewEntityName] = useState('');
    const [newEntityUnified, setNewEntityUnified] = useState('');
    const [entityError, setEntityError] = useState('');
    const [editingEntityId, setEditingEntityId] = useState(null);
    const [editEntityName, setEditEntityName] = useState('');
    const [editEntityUnified, setEditEntityUnified] = useState('');

    // Branch management states
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchCr, setNewBranchCr] = useState('');
    const [newBranchEntityId, setNewBranchEntityId] = useState('');
    const [branchError, setBranchError] = useState('');
    const [editingBranchId, setEditingBranchId] = useState(null);
    const [editBranchName, setEditBranchName] = useState('');
    const [editBranchCr, setEditBranchCr] = useState('');
    const [editBranchEntityId, setEditBranchEntityId] = useState('');

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
            if (projRes.status === 401 || projRes.status === 403) {
                handleLogout();
                return;
            }
            const projs = await projRes.json();
            if (projRes.ok) setProjects(projs);

            // Get entities (sub-companies)
            const entRes = await fetch(API_URL + '/api/entities', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (entRes.status === 401 || entRes.status === 403) {
                handleLogout();
                return;
            }
            const ents = await entRes.json();
            if (entRes.ok) setEntities(ents);

            // Get branches
            const brRes = await fetch(API_URL + '/api/branches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (brRes.ok) {
                const brs = await brRes.json();
                setBranches(brs);
            }

            // Get costing detailed data
            const costRes = await fetch(API_URL + '/api/costs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (costRes.status === 401 || costRes.status === 403) {
                handleLogout();
                return;
            }
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

    // Project CRUD
    const handleAddProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        setProjectError('');

        // Find entity of the selected branch to auto-assign
        const selectedBranch = branches.find(b => b.id === Number(newProjectBranchId));
        const entityId = selectedBranch ? selectedBranch.entity_id : '';

        try {
            const response = await fetch(API_URL + '/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    name: newProjectName, 
                    branch_id: newProjectBranchId ? Number(newProjectBranchId) : null,
                    entity_id: entityId ? Number(entityId) : null
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل إضافة المشروع');
            
            setNewProjectName('');
            setNewProjectBranchId('');
            setProjects(prev => [...prev, data]);
            fetchData();
        } catch (err) {
            setProjectError(err.message);
        }
    };

    const handleStartEditProject = (proj) => {
        setEditingProjectId(proj.id);
        setEditProjectName(proj.name);
        setEditProjectBranchId(proj.branch_id || '');
    };

    const handleSaveProjectEdit = async (id) => {
        setProjectError('');
        const selectedBranch = branches.find(b => b.id === Number(editProjectBranchId));
        const entityId = selectedBranch ? selectedBranch.entity_id : null;

        try {
            const response = await fetch(API_URL + '/api/projects/' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editProjectName,
                    branch_id: editProjectBranchId ? Number(editProjectBranchId) : null,
                    entity_id: entityId ? Number(entityId) : null
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل تحديث المشروع');
            
            setEditingProjectId(null);
            fetchData();
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

    // Entity CRUD
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
                    unified_number: newEntityUnified 
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل إضافة الكيان');
            
            setNewEntityName('');
            setNewEntityUnified('');
            setEntities(prev => [...prev, data]);
            fetchData();
        } catch (err) {
            setEntityError(err.message);
        }
    };

    const handleStartEditEntity = (ent) => {
        setEditingEntityId(ent.id);
        setEditEntityName(ent.name);
        setEditEntityUnified(ent.unified_number || '');
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
                    unified_number: editEntityUnified
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
        if (!window.confirm('هل أنت متأكد من حذف هذا الكيان؟')) return;
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

    // Branch CRUD
    const handleAddBranch = async (e) => {
        e.preventDefault();
        if (!newBranchName.trim()) return;
        setBranchError('');

        try {
            const response = await fetch(API_URL + '/api/branches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newBranchName,
                    cr_number: newBranchCr,
                    entity_id: newBranchEntityId ? Number(newBranchEntityId) : null
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل إضافة الفرع');

            setNewBranchName('');
            setNewBranchCr('');
            setNewBranchEntityId('');
            setBranches(prev => [...prev, data]);
            fetchData();
        } catch (err) {
            setBranchError(err.message);
        }
    };

    const handleStartEditBranch = (br) => {
        setEditingBranchId(br.id);
        setEditBranchName(br.name);
        setEditBranchCr(br.cr_number || '');
        setEditBranchEntityId(br.entity_id || '');
    };

    const handleSaveBranchEdit = async (id) => {
        setBranchError('');
        try {
            const response = await fetch(API_URL + '/api/branches/' + id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editBranchName,
                    cr_number: editBranchCr,
                    entity_id: editBranchEntityId ? Number(editBranchEntityId) : null
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'فشل تحديث الفرع');

            setEditingBranchId(null);
            fetchData();
        } catch (err) {
            setBranchError(err.message);
        }
    };

    const handleDeleteBranch = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
        try {
            const response = await fetch(API_URL + '/api/branches/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'فشل حذف الفرع');
            }
            setBranches(prev => prev.filter(b => b.id !== id));
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
        <div className="app-container">
            {/* Sidebar Navigation */}
            <div className="sidebar">
                <div className="sidebar-brand">
                    <Building className="brand-logo" />
                    <h2>تكلفتي SaaS</h2>
                </div>
                
                <div className="sidebar-menu">
                    <button 
                        className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <LayoutDashboard className="menu-item-icon" />
                        لوحة التحكم
                    </button>
                    
                    <button 
                        className={`menu-item ${activeTab === 'employees' ? 'active' : ''}`}
                        onClick={() => setActiveTab('employees')}
                    >
                        <Users className="menu-item-icon" />
                        قائمة الموظفين
                    </button>
                    
                    <button 
                        className={`menu-item ${activeTab === 'report' ? 'active' : ''}`}
                        onClick={() => setActiveTab('report')}
                    >
                        <FileText className="menu-item-icon" />
                        تقارير التكاليف (Pivot)
                    </button>
                    
                    <button 
                        className={`menu-item ${activeTab === 'import' ? 'active' : ''}`}
                        onClick={() => setActiveTab('import')}
                    >
                        <UploadCloud className="menu-item-icon" />
                        استيراد من إكسيل
                    </button>
                    
                    <button 
                        className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings className="menu-item-icon" />
                        إعدادات المجموعة
                    </button>
                </div>
                
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="menu-item btn-logout">
                        <LogOut className="menu-item-icon" />
                        تسجيل الخروج
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
                        entitiesBreakdown={costsData?.entities_breakdown || []}
                        branchesBreakdown={costsData?.branches_breakdown || []}
                        employees={employees} 
                        entities={entities}
                        branches={branches}
                        projects={projects}
                    />
                )}

                {activeTab === 'employees' && (
                    <EmployeesList 
                        token={token}
                        projects={projects}
                        entities={entities}
                        branches={branches}
                        employees={employees}
                        onDataChange={fetchData}
                        onUnauthorized={handleLogout}
                    />
                )}

                {activeTab === 'report' && (
                    <PivotReport 
                        employees={employees}
                        summary={costsData?.summary}
                        entities={entities}
                        branches={branches}
                        projects={projects}
                    />
                )}

                {activeTab === 'import' && (
                    <ExcelImport 
                        token={token}
                        onImportSuccess={fetchData}
                        onUnauthorized={handleLogout}
                    />
                )}

                {activeTab === 'settings' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                        <div>
                            {/* General calculations settings */}
                            <CostSettings 
                                token={token}
                                company={company}
                                onCompanyUpdate={(updatedCompany) => {
                                    setCompany(updatedCompany);
                                    localStorage.setItem('company', JSON.stringify(updatedCompany));
                                }}
                                onSettingsUpdated={fetchData}
                                onUnauthorized={handleLogout}
                            />
                            
                            {/* Entity/Sub-company Management Panel */}
                            <div className="glass-panel" style={{ marginTop: '24px' }}>
                                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>إدارة الكيانات والشركات القانونية (الرقم الموحد)</h3>
                                
                                {entityError && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '16px' }}>{entityError}</div>}
                                
                                <form onSubmit={handleAddEntity} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '8px', marginBottom: '20px' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="اسم الكيان القانوني الكبرى..."
                                        value={newEntityName}
                                        onChange={(e) => setNewEntityName(e.target.value)}
                                        required
                                    />
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="الرقم الموحد (700)..."
                                        value={newEntityUnified}
                                        onChange={(e) => setNewEntityUnified(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary">
                                        <Plus style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </form>

                                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {entities.map(ent => (
                                        <div key={ent.id} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', gap: '8px' }}>
                                            {editingEntityId === ent.id ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto auto', gap: '6px', alignItems: 'center' }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={editEntityName}
                                                        onChange={(e) => setEditEntityName(e.target.value)}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={editEntityUnified}
                                                        onChange={(e) => setEditEntityUnified(e.target.value)}
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
                                                            الرقم الموحد: {ent.unified_number || 'غير محدد'}
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
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد كيانات قانونية مضافة</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Branches & Projects */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Branches Management */}
                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>إدارة الفروع والسجلات التجارية</h3>
                                
                                {branchError && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '16px' }}>{branchError}</div>}
                                
                                <form onSubmit={handleAddBranch} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="اسم الفرع..."
                                            value={newBranchName}
                                            onChange={(e) => setNewBranchName(e.target.value)}
                                            required
                                        />
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="رقم السجل التجاري..."
                                            value={newBranchCr}
                                            onChange={(e) => setNewBranchCr(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select 
                                            className="form-control"
                                            value={newBranchEntityId}
                                            onChange={(e) => setNewBranchEntityId(e.target.value)}
                                            required
                                            style={{ flexGrow: 1 }}
                                        >
                                            <option value="">اختر الكيان القانوني التابع له الفرع...</option>
                                            {entities.map(e => (
                                                <option key={e.id} value={e.id}>{e.name} (700: {e.unified_number})</option>
                                            ))}
                                        </select>
                                        <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                                            <Plus style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    </div>
                                </form>

                                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {branches.map(br => (
                                        <div key={br.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', gap: '8px' }}>
                                            {editingBranchId === br.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={editBranchName}
                                                            onChange={(e) => setEditBranchName(e.target.value)}
                                                        />
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={editBranchCr}
                                                            onChange={(e) => setEditBranchCr(e.target.value)}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className="form-control"
                                                            value={editBranchEntityId}
                                                            onChange={(e) => setEditBranchEntityId(e.target.value)}
                                                            required
                                                            style={{ flexGrow: 1 }}
                                                        >
                                                            <option value="">اختر الكيان القانوني...</option>
                                                            {entities.map(e => (
                                                                <option key={e.id} value={e.id}>{e.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className="btn btn-primary" style={{ padding: '8px' }} onClick={() => handleSaveBranchEdit(br.id)}>
                                                            <Save style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setEditingBranchId(null)}>
                                                            <X style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{br.name}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                                                            سجل تجاري: {br.cr_number || 'بدون سجل'} | تابع لـ: {entities.find(e => e.id === br.entity_id)?.name || 'غير معروف'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--text-secondary)' }} onClick={() => handleStartEditBranch(br)}>
                                                            <Edit2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteBranch(br.id)}>
                                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {branches.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد فروع مضافة</div>
                                    )}
                                </div>
                            </div>

                            {/* Projects Management */}
                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>إدارة المشاريع والتوزيع</h3>
                                
                                {projectError && <div className="badge badge-danger" style={{ display: 'block', marginBottom: '16px' }}>{projectError}</div>}
                                
                                <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="اسم المشروع الجديد..."
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        required
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            className="form-control"
                                            value={newProjectBranchId}
                                            onChange={(e) => setNewProjectBranchId(e.target.value)}
                                            style={{ flexGrow: 1 }}
                                        >
                                            <option value="">اختر الفرع التابع له المشروع (اختياري)...</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} (تابع لـ: {entities.find(e => e.id === b.entity_id)?.name})</option>
                                            ))}
                                        </select>
                                        <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                                            <Plus style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    </div>
                                </form>

                                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {projects.map(p => (
                                        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', gap: '8px' }}>
                                            {editingProjectId === p.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        value={editProjectName}
                                                        onChange={(e) => setEditProjectName(e.target.value)}
                                                    />
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <select
                                                            className="form-control"
                                                            value={editProjectBranchId}
                                                            onChange={(e) => setEditProjectBranchId(e.target.value)}
                                                            style={{ flexGrow: 1 }}
                                                        >
                                                            <option value="">اختر الفرع...</option>
                                                            {branches.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className="btn btn-primary" style={{ padding: '8px' }} onClick={() => handleSaveProjectEdit(p.id)}>
                                                            <Save style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => setEditingProjectId(null)}>
                                                            <X style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                                                            الفرع: {branches.find(b => b.id === p.branch_id)?.name || 'عام / مستقل'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--text-secondary)' }} onClick={() => handleStartEditProject(p)}>
                                                            <Edit2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button className="btn" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteProject(p.id)}>
                                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد مشاريع مضافة</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
