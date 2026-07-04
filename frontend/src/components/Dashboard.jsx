import React, { useState } from 'react';
import { Users, Percent, DollarSign, Award, Building2, Landmark, Sliders, Briefcase } from 'lucide-react';

export default function Dashboard({ 
    summary, 
    entitiesBreakdown = [], 
    branchesBreakdown = [], 
    employees = [], 
    entities = [], 
    branches = [], 
    projects = [] 
}) {
    const [filterEntity, setFilterEntity] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterCostBranch, setFilterCostBranch] = useState('');
    const [filterProject, setFilterProject] = useState('');

    if (!summary) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل البيانات...</div>;
    }

    // 1. Recalculate KPIs based on selected filters
    const filteredEmployees = employees.filter(emp => {
        const matchesEntity = !filterEntity || emp.legal_entity_id === Number(filterEntity);
        const matchesBranch = !filterBranch || emp.branch_id === Number(filterBranch);
        const matchesCostBranch = !filterCostBranch || emp.cost_branch_id === Number(filterCostBranch);
        const matchesProject = !filterProject || emp.project_id === Number(filterProject);
        return matchesEntity && matchesBranch && matchesCostBranch && matchesProject;
    });

    const totalHeadcount = filteredEmployees.length;
    const saudiCount = filteredEmployees.filter(e => e.isSaudi).length;
    const saudiWorking = filteredEmployees.filter(e => e.isSaudi && e.saudi_type === 'working').length;
    const saudiSupport = filteredEmployees.filter(e => e.isSaudi && e.saudi_type === 'support').length;
    const residentCount = filteredEmployees.filter(e => !e.isSaudi).length;
    const saudizationRate = totalHeadcount > 0 ? (saudiCount / totalHeadcount) * 100 : 0;
    
    const totalMonthlyPayroll = filteredEmployees.reduce((sum, e) => sum + e.gross_salary, 0);
    const totalMonthlyCost = filteredEmployees.reduce((sum, e) => sum + e.total_monthly_cost, 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    const totalSaudizationBurden = filteredEmployees.reduce((sum, e) => sum + (e.saudization_burden || 0), 0);

    // 2. Process display entities (compliance view)
    const displayEntities = filterEntity 
        ? entitiesBreakdown.filter(e => e.id === Number(filterEntity))
        : entitiesBreakdown;

    // 3. Process display branches (operational view)
    const displayBranches = branchesBreakdown.filter(br => {
        const parentEntity = entities.find(e => e.name === br.parent_entity_name);
        const matchesEnt = !filterEntity || (parentEntity && parentEntity.id === Number(filterEntity));
        const matchesBr = !filterCostBranch || br.id === Number(filterCostBranch);
        return matchesEnt && matchesBr;
    });

    // 4. Project cost breakdown
    const projectCosts = {};
    filteredEmployees.forEach(emp => {
        const projName = emp.project_name || 'غير محدد';
        projectCosts[projName] = (projectCosts[projName] || 0) + emp.total_monthly_cost;
    });

    const projectCostsArray = Object.keys(projectCosts).map(name => ({
        name,
        cost: projectCosts[name]
    })).sort((a, b) => b.cost - a.cost);

    const maxProjectCost = projectCostsArray.length > 0 ? projectCostsArray[0].cost : 1;

    // 5. Circular Gauge parameters
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (saudizationRate / 100) * circumference;

    return (
        <div className="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>لوحة التحكم والمؤشرات الرئيسية</h2>
                {employees.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Sliders style={{ width: '16px' }} />
                        <span>تتحكم الفلاتر أدناه بتفاصيل لوحة التحكم ديناميكياً</span>
                    </div>
                )}
            </div>

            {employees.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px', border: '2px dashed rgba(99, 102, 241, 0.3)', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.02)' }}>
                    <Building2 style={{ width: '64px', height: '64px', color: 'var(--primary)', marginBottom: '20px' }} />
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>مرحباً بك في نظام تكلفتي!</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '550px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                        لا توجد سجلات موظفين مسجلة في حسابك حالياً. يرجى البدء برفع ملف كشف الرواتب والبيانات الخاص بك، أو إضافة موظف يدوياً لحساب التكاليف ونسب التوطين.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>💡 نصيحة: يمكنك استيراد كشف الرواتب مباشرة من صفحة "استيراد من إكسيل"</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top Interactive Filters */}
                    <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>الكيان القانوني الكبير</label>
                            <select className="form-control" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
                                <option value="">كل الكيانات</option>
                                {entities.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} (700)</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>الفرع القانوني (التأمينات)</label>
                            <select className="form-control" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                                <option value="">كل الفروع القانونية</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>الفرع المالي (المصاريف)</label>
                            <select className="form-control" value={filterCostBranch} onChange={(e) => setFilterCostBranch(e.target.value)}>
                                <option value="">كل الفروع المالية</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>المشروع</label>
                            <select className="form-control" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                                <option value="">كل المشاريع</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* KPI Cards Grid */}
                    <div className="kpi-grid" style={{ marginBottom: '24px' }}>
                        <div className="glass-panel kpi-card kpi-blue">
                            <div className="kpi-title">الموظفون النشطون بالفلاتر</div>
                            <div className="kpi-value">{totalHeadcount}</div>
                            <div className="kpi-subtitle">
                                سعودي: {saudiCount} | مقيم: {residentCount}
                            </div>
                        </div>

                        <div className="glass-panel kpi-card kpi-green">
                            <div className="kpi-title">معدل التوطين (السعودة)</div>
                            <div className="kpi-value">{saudizationRate.toFixed(1)}%</div>
                            <div className="kpi-subtitle">
                                عامل: {saudiWorking} | دعم نشاط: {saudiSupport}
                            </div>
                        </div>

                        <div className="glass-panel kpi-card kpi-orange">
                            <div className="kpi-title">المصروف الفعلي للرواتب والبدلات</div>
                            <div className="kpi-value">{totalMonthlyPayroll.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem' }}>ريال</span></div>
                            <div className="kpi-subtitle">لا يشمل الرسوم الحكومية أو عبء السعودة</div>
                        </div>

                        <div className="glass-panel kpi-card kpi-cyan">
                            <div className="kpi-title">إجمالي التكلفة التشغيلية (شهري)</div>
                            <div className="kpi-value">{totalMonthlyCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem' }}>ريال</span></div>
                            <div className="kpi-subtitle">التكلفة السنوية الكلية: {totalAnnualCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} ريال</div>
                        </div>
                    </div>

                    {/* Compliance vs Operational Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        
                        {/* 1. Compliance View */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                <Landmark style={{ color: 'var(--success)', width: '20px', height: '20px' }} />
                                <div>
                                    <h3 style={{ margin: 0 }}>منظور الالتزام والتوطين (Compliance View)</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>الكيانات الكبرى، الأرقام الموحدة 700، ونسب التوطين</span>
                                </div>
                            </div>

                            <div className="table-container" style={{ margin: 0, flexGrow: 1 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>اسم الكيان القانوني</th>
                                            <th>الرقم الموحد (700)</th>
                                            <th>عامل / دعم</th>
                                            <th>سعوديين</th>
                                            <th>مقيمين</th>
                                            <th>نسبة السعودة</th>
                                            <th>تكلفة التوطين</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayEntities.map((ent) => {
                                            const total = ent.saudi_count + ent.resident_count;
                                            const rate = total > 0 ? (ent.saudi_count / total) * 100 : 0;
                                            return (
                                                <tr key={ent.id}>
                                                    <td style={{ fontWeight: '600' }}>{ent.name}</td>
                                                    <td style={{ fontSize: '0.85rem' }}>{ent.unified_number}</td>
                                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {ent.saudi_working || 0} / {ent.saudi_support || 0}
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: 'var(--success)' }}>{ent.saudi_count}</td>
                                                    <td>{ent.resident_count}</td>
                                                    <td style={{ fontWeight: '700' }}>{rate.toFixed(1)}%</td>
                                                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>
                                                        {ent.effective_saudization_cost.toLocaleString()} ريال
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {displayEntities.length === 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد كيانات قانونية مطابقة للفلاتر</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Circular Gauge and Burden Summary */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                                <h3 style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>توزيع نسب السعودة</h3>
                                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                                    <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle
                                            cx="65"
                                            cy="65"
                                            r="50"
                                            fill="transparent"
                                            stroke="rgba(255,255,255,0.05)"
                                            strokeWidth="10"
                                        />
                                        <circle
                                            cx="65"
                                            cy="65"
                                            r="50"
                                            fill="transparent"
                                            stroke="var(--success)"
                                            strokeWidth="10"
                                            strokeDasharray={2 * Math.PI * 50}
                                            strokeDashoffset={2 * Math.PI * 50 - (saudizationRate / 100) * (2 * Math.PI * 50)}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                                        />
                                    </svg>
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{saudizationRate.toFixed(1)}%</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>توطين</div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ marginBottom: '8px' }}>متوسط عبء التوطين الموزع</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                                        يتحمل المقيمون عبء تكاليف السعودة الفعلية للكيانات القانونية للمجموعة بالتساوي.
                                    </p>
                                    <div className="glass-panel" style={{ background: 'rgba(15,23,42,0.4)', border: 'none', padding: '12px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>إجمالي عبء السعودة للفلاتر:</span>
                                            <span style={{ fontWeight: '600' }}>{totalSaudizationBurden.toLocaleString()} ريال</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>عدد الموظفين المقيمين:</span>
                                            <span style={{ fontWeight: '600' }}>{residentCount} موظف</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px dashed var(--success)', borderRadius: '10px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block', marginBottom: '2px' }}>متوسط عبء السعودة للمقيم الواحد</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)' }}>
                                        +{summary.saudization_burden_per_resident.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>ريال/شهري</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Operational View */}
                    <div className="glass-panel" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <Building2 style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
                            <div>
                                <h3 style={{ margin: 0 }}>منظور التشغيل المالي (Financial Operational View)</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>الفروع، أرقام السجلات التجارية، وتوزيع التكاليف التشغيلية الفعلية</span>
                            </div>
                        </div>

                        <div className="table-container" style={{ margin: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>اسم الفرع التشغيلي</th>
                                        <th>رقم السجل التجاري (CR)</th>
                                        <th>الكيان القانوني التابع له</th>
                                        <th>عدد الموظفين</th>
                                        <th>سعوديين</th>
                                        <th>مقيمين</th>
                                        <th>التكلفة الشهرية الفعلية</th>
                                        <th>التكلفة السنوية الكلية</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayBranches.map((br) => (
                                        <tr key={br.id}>
                                            <td style={{ fontWeight: '600' }}>{br.name}</td>
                                            <td style={{ fontSize: '0.85rem' }}>{br.cr_number}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{br.parent_entity_name}</td>
                                            <td style={{ fontWeight: '600' }}>{br.total_count}</td>
                                            <td>{br.saudi_count}</td>
                                            <td>{br.resident_count}</td>
                                            <td style={{ fontWeight: '700', color: 'var(--primary-light)' }}>
                                                {br.total_monthly_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} ريال
                                            </td>
                                            <td style={{ fontWeight: '700' }}>
                                                {br.total_annual_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} ريال
                                            </td>
                                        </tr>
                                    ))}
                                    {displayBranches.length === 0 && (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد فروع تشغيلية مطابقة للفلاتر</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Project Cost Bars */}
                    <div className="glass-panel" style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '20px' }}>تكاليف المشاريع المنسب لها الموظفون</h3>
                        <div className="chart-container">
                            {projectCostsArray.slice(0, 10).map((proj, idx) => {
                                const pct = (proj.cost / maxProjectCost) * 100;
                                return (
                                    <div key={idx} className="bar-chart-row">
                                        <div className="bar-chart-label" title={proj.name}>{proj.name}</div>
                                        <div className="bar-chart-track">
                                            <div className="bar-chart-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="bar-chart-value">
                                            {proj.cost.toLocaleString('en-US', { maximumFractionDigits: 0 })} ريال
                                        </div>
                                    </div>
                                );
                            })}
                            {projectCostsArray.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد مشاريع مضافة حالياً بالفلاتر الحالية</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
