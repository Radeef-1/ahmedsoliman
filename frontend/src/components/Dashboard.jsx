import React from 'react';
import { Users, Percent, DollarSign, Award, Building2 } from 'lucide-react';

export default function Dashboard({ summary, employees }) {
    if (!summary) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل البيانات...</div>;
    }

    // Process projects cost breakdown
    const projectCosts = {};
    employees.forEach(emp => {
        const projName = emp.project_name || 'غير محدد';
        projectCosts[projName] = (projectCosts[projName] || 0) + emp.total_monthly_cost;
    });

    const projectCostsArray = Object.keys(projectCosts).map(name => ({
        name,
        cost: projectCosts[name]
    })).sort((a, b) => b.cost - a.cost);

    const maxProjectCost = projectCostsArray.length > 0 ? projectCostsArray[0].cost : 1;

    // Process nationalities breakdown
    const nationalities = {};
    employees.forEach(emp => {
        nationalities[emp.nationality] = (nationalities[emp.nationality] || 0) + 1;
    });
    const natArray = Object.keys(nationalities).map(name => ({
        name,
        count: nationalities[name]
    })).sort((a, b) => b.count - a.count);

    // SVG Circular Gauge parameters for Saudization
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const saudizationRate = summary.saudization_rate || 0;
    const strokeDashoffset = circumference - (saudizationRate / 100) * circumference;

    return (
        <div className="rtl">
            <h2 style={{ marginBottom: '24px' }}>لوحة التحكم والمؤشرات الرئيسية</h2>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
                <div className="glass-panel kpi-card kpi-blue">
                    <div className="kpi-title">إجمالي الموظفين النشطين</div>
                    <div className="kpi-value">{summary.total_employees}</div>
                    <div className="kpi-subtitle">
                        سعودي: {summary.saudi_count} | مقيم: {summary.resident_count}
                    </div>
                </div>

                <div className="glass-panel kpi-card kpi-green">
                    <div className="kpi-title">نسبة التوطين (السعودة)</div>
                    <div className="kpi-value">{saudizationRate.toFixed(1)}%</div>
                    <div className="kpi-subtitle">الهدف المخطط للشركات</div>
                </div>

                <div className="glass-panel kpi-card kpi-orange">
                    <div className="kpi-title">إجمالي الرواتب والبدلات</div>
                    <div className="kpi-value">{summary.total_monthly_payroll.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem' }}>ريال</span></div>
                    <div className="kpi-subtitle">الرواتب الأساسية مع البدلات النشطة</div>
                </div>

                <div className="glass-panel kpi-card kpi-cyan">
                    <div className="kpi-title">إجمالي التكلفة الكلية (شهري)</div>
                    <div className="kpi-value">{summary.total_company_monthly_cost.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem' }}>ريال</span></div>
                    <div className="kpi-subtitle">التكلفة السنوية الكلية: {summary.total_company_annual_cost.toLocaleString('en-US', { maximumFractionDigits: 0 })} ريال</div>
                </div>
            </div>

            {/* Visual Analytics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                
                {/* Saudization Circular Gauge Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                    <h3 style={{ marginBottom: '24px', alignSelf: 'flex-start' }}>مقياس نسب السعودة</h3>
                    <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                            {/* Track Circle */}
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="transparent"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="12"
                            />
                            {/* Fill Circle */}
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="transparent"
                                stroke="var(--success)"
                                strokeWidth="12"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
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
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)' }}>{saudizationRate.toFixed(1)}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>نسبة التوطين</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '24px', display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }} />
                            <span>سعوديين ({summary.saudi_count})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                            <span>مقيمين ({summary.resident_count})</span>
                        </div>
                    </div>
                </div>

                {/* Saudization Burden Allocation Panel */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ marginBottom: '12px' }}>منطق توزيع السعودة للمجموعة</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                            يتم جمع مبالغ السعودة المعتمدة لكل كيان/شركة وتقسيمها على إجمالي عدد المقيمين النشطين للحصول على متوسط عبء موحد وموزع بالعدل.
                        </p>
                        
                        <div className="glass-panel" style={{ background: 'rgba(15,23,42,0.4)', border: 'none', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>مجموع مبالغ السعودة للكيانات:</span>
                                <span style={{ fontWeight: '600' }}>{summary.total_saudization_burden_monthly.toLocaleString('en-US')} ريال</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>عدد الموظفين المقيمين (المجموعة):</span>
                                <span style={{ fontWeight: '600' }}>{summary.resident_count} موظف</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed var(--success)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', marginBottom: '2px' }}>عبء السعودة المضاف شهرياً للمقيم الواحد</div>
                        <div style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--success)' }}>+{summary.saudization_burden_per_resident.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>ريال</span></div>
                    </div>
                </div>
            </div>

            {/* Saudization breakdown by Sub-company (Equivalent to Excel rows 328-337) */}
            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Building2 className="menu-item-icon" style={{ color: 'var(--primary)' }} />
                    <h3>تحليل السعودة وتكاليف التوطين حسب الكيانات والشركات</h3>
                </div>
                
                <div className="table-container" style={{ margin: '0px' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>اسم الشركة/الكيان</th>
                                <th>إجمالي الموظفين</th>
                                <th>عدد السعوديين</th>
                                <th>صافي المقيمين</th>
                                <th>مبلغ السعودة (الشهري)</th>
                                <th>معدل العبء للكيان</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(summary.entities_breakdown || []).map((ent, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: '600' }}>{ent.name}</td>
                                    <td>{ent.total_count}</td>
                                    <td>{ent.saudi_count}</td>
                                    <td>{ent.resident_count}</td>
                                    <td>{ent.effective_saudization_cost.toLocaleString()} ريال</td>
                                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>
                                        {ent.burden_per_resident.toFixed(2)} ريال/مقيم
                                    </td>
                                </tr>
                            ))}
                            {(summary.entities_breakdown || []).length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        لا توجد كيانات مسجلة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Project Cost Bars Card */}
            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '24px' }}>توزيع تكاليف الموظفين حسب المشاريع والفروع</h3>
                <div className="chart-container">
                    {projectCostsArray.slice(0, 8).map((proj, idx) => {
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
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد مشاريع مضافة حالياً</div>
                    )}
                </div>
            </div>

            {/* Nationalities Breakdown List */}
            <div className="glass-panel">
                <h3 style={{ marginBottom: '16px' }}>أكثر الجنسيات تمثيلاً بالشركة</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    {natArray.map((nat, idx) => (
                        <div key={idx} style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '500' }}>{nat.name}</span>
                            <span className="badge badge-info">{nat.count} موظف</span>
                        </div>
                    ))}
                    {natArray.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد بيانات جنسيات حالياً</div>
                    )}
                </div>
            </div>
        </div>
    );
}
