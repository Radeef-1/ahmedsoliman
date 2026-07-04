import React, { useState } from 'react';
import { FileSpreadsheet, Download, Sliders } from 'lucide-react';

export default function PivotReport({ employees = [], summary, entities = [], branches = [], projects = [] }) {
    const [filterEntity, setFilterEntity] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterCostBranch, setFilterCostBranch] = useState('');
    const [filterProject, setFilterProject] = useState('');

    if (!employees || employees.length === 0) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>لا توجد سجلات موظفين لعرض التقرير مجمّعاً...</div>;
    }

    // 1. Filter employees based on active dropdown selections
    const filteredEmployees = employees.filter(emp => {
        const matchesEntity = !filterEntity || emp.legal_entity_id === Number(filterEntity);
        const matchesBranch = !filterBranch || emp.branch_id === Number(filterBranch);
        const matchesCostBranch = !filterCostBranch || emp.cost_branch_id === Number(filterCostBranch);
        const matchesProject = !filterProject || emp.project_id === Number(filterProject);
        return matchesEntity && matchesBranch && matchesCostBranch && matchesProject;
    });

    // 2. Group filtered employees by project
    const projectMap = {};
    filteredEmployees.forEach(emp => {
        const projName = emp.project_name || 'غير محدد';
        if (!projectMap[projName]) {
            projectMap[projName] = {
                name: projName,
                gross_salary: 0,
                gosi: 0,
                medical: 0,
                health_certificate: 0,
                vacation_accrual: 0,
                end_of_service_accrual: 0,
                ticket_accrual: 0,
                passport_fee: 0,
                work_permit_fee: 0,
                exit_reentry: 0,
                saudization_burden: 0,
                total_monthly_cost: 0,
                total_annual_cost: 0
            };
        }
        
        const p = projectMap[projName];
        p.gross_salary += emp.gross_salary || 0;
        p.gosi += emp.gosi || 0;
        p.medical += emp.medical || 0;
        p.health_certificate += emp.health_certificate || 0;
        p.vacation_accrual += emp.vacation_accrual || 0;
        p.end_of_service_accrual += emp.end_of_service_accrual || 0;
        p.ticket_accrual += emp.ticket_accrual || 0;
        p.passport_fee += emp.passport_fee || 0;
        p.work_permit_fee += emp.work_permit_fee || 0;
        p.exit_reentry += emp.exit_reentry || 0;
        p.saudization_burden += emp.saudization_burden || 0;
        p.total_monthly_cost += emp.total_monthly_cost || 0;
        p.total_annual_cost += emp.total_annual_cost || 0;
    });

    const projectsList = Object.values(projectMap).sort((a, b) => b.total_monthly_cost - a.total_monthly_cost);

    // 3. Calculate Grand Totals
    const grandTotal = {
        gross_salary: 0,
        gosi: 0,
        medical: 0,
        health_certificate: 0,
        vacation_accrual: 0,
        end_of_service_accrual: 0,
        ticket_accrual: 0,
        passport_fee: 0,
        work_permit_fee: 0,
        exit_reentry: 0,
        saudization_burden: 0,
        total_monthly_cost: 0,
        total_annual_cost: 0
    };

    projectsList.forEach(p => {
        grandTotal.gross_salary += p.gross_salary;
        grandTotal.gosi += p.gosi;
        grandTotal.medical += p.medical;
        grandTotal.health_certificate += p.health_certificate;
        grandTotal.vacation_accrual += p.vacation_accrual;
        grandTotal.end_of_service_accrual += p.end_of_service_accrual;
        grandTotal.ticket_accrual += p.ticket_accrual;
        grandTotal.passport_fee += p.passport_fee;
        grandTotal.work_permit_fee += p.work_permit_fee;
        grandTotal.exit_reentry += p.exit_reentry;
        grandTotal.saudization_burden += p.saudization_burden;
        grandTotal.total_monthly_cost += p.total_monthly_cost;
        grandTotal.total_annual_cost += p.total_annual_cost;
    });

    // CSV Export function
    const exportToCSV = () => {
        const headers = [
            'المشروع', 'مجموع الرواتب والبدلات', 'مجموع التأمينات الاجتماعية', 
            'مجموع التأمين الطبي', 'مجموع الشهادات الصحية', 'مجموع مخصص الإجازة', 
            'مجموع نهاية الخدمة', 'مجموع مخصص التذاكر', 'مجموع رسوم الجوازات', 
            'مجموع رخص العمل', 'مجموع تأشيرات الخروج والعودة', 'مجموع عبء السعودة',
            'التكلفة الإجمالية (شهري)', 'التكلفة الإجمالية (سنوي)'
        ];

        const rows = projectsList.map(p => [
            p.name, p.gross_salary.toFixed(2), p.gosi.toFixed(2),
            p.medical.toFixed(2), p.health_certificate.toFixed(2), p.vacation_accrual.toFixed(2),
            p.end_of_service_accrual.toFixed(2), p.ticket_accrual.toFixed(2), p.passport_fee.toFixed(2),
            p.work_permit_fee.toFixed(2), p.exit_reentry.toFixed(2), p.saudization_burden.toFixed(2),
            p.total_monthly_cost.toFixed(2), p.total_annual_cost.toFixed(2)
        ]);

        // Add grand total
        rows.push([
            'الإجمالي الكلي', grandTotal.gross_salary.toFixed(2), grandTotal.gosi.toFixed(2),
            grandTotal.medical.toFixed(2), grandTotal.health_certificate.toFixed(2), grandTotal.vacation_accrual.toFixed(2),
            grandTotal.end_of_service_accrual.toFixed(2), grandTotal.ticket_accrual.toFixed(2), grandTotal.passport_fee.toFixed(2),
            grandTotal.work_permit_fee.toFixed(2), grandTotal.exit_reentry.toFixed(2), grandTotal.saudization_burden.toFixed(2),
            grandTotal.total_monthly_cost.toFixed(2), grandTotal.total_annual_cost.toFixed(2)
        ]);

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.join(",") + "\n";
        rows.forEach(row => {
            csvContent += row.map(val => `"${val}"`).join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `تقرير_تكاليف_المشاريع_المفلترة_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="rtl">
            <div className="header-actions">
                <h2>تقرير تجميع التكاليف حسب المشاريع والفروع</h2>
                <button className="btn btn-secondary" onClick={exportToCSV}>
                    <Download className="menu-item-icon" />
                    تصدير التقرير المفلتر (CSV)
                </button>
            </div>

            {/* Top Interactive Filters for Pivot */}
            <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>تصفية بالكيان القانوني</label>
                    <select className="form-control" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
                        <option value="">كل الكيانات القانونية</option>
                        {entities.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
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

            <div className="glass-panel" style={{ padding: '0px' }}>
                <div className="table-container" style={{ margin: '0px', maxHeight: '60vh' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', right: 0, zIndex: 10, background: '#1e293b' }}>تسميات الصفوف (المشاريع)</th>
                                <th>مجموع من الراتب</th>
                                <th>مجموع التأمينات (GOSI)</th>
                                <th>مجموع التأمين الطبي</th>
                                <th>مجموع الشهادة الصحية</th>
                                <th>مجموع تكلفة الأجازة</th>
                                <th>مجموع نهاية الخدمة</th>
                                <th>مجموع تذاكر طيران</th>
                                <th>مجموع جوازات</th>
                                <th>مجموع رخصة العمل</th>
                                <th>مجموع الخروج والعودة</th>
                                <th>مجموع عبء السعودة</th>
                                <th style={{ background: 'rgba(99,102,241,0.1)' }}>إجمالي مجموج شهري</th>
                                <th style={{ background: 'rgba(6,182,212,0.1)' }}>إجمالي مجموع سنوي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectsList.map((p, idx) => (
                                <tr key={idx}>
                                    <td style={{ position: 'sticky', right: 0, zIndex: 2, background: '#1e293b', fontWeight: '600' }}>{p.name}</td>
                                    <td>{p.gross_salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.gosi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.medical.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.health_certificate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.vacation_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.end_of_service_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.ticket_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.passport_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.work_permit_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>{p.exit_reentry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ color: 'var(--success)', fontWeight: '600' }}>{p.saudization_burden.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ background: 'rgba(99,102,241,0.05)', fontWeight: '700' }}>{p.total_monthly_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ background: 'rgba(6,182,212,0.05)', fontWeight: '700' }}>{p.total_annual_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {/* Grand Total Row */}
                            <tr style={{ background: '#1e293b', borderTop: '2px solid var(--primary)', fontWeight: '700' }}>
                                <td style={{ position: 'sticky', right: 0, zIndex: 3, background: '#1e293b', color: 'var(--primary)' }}>الإجمالي الكلي</td>
                                <td>{grandTotal.gross_salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.gosi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.medical.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.health_certificate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.vacation_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.end_of_service_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.ticket_accrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.passport_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.work_permit_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{grandTotal.exit_reentry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ color: 'var(--success)' }}>{grandTotal.saudization_burden.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ background: 'rgba(99,102,241,0.1)', color: '#fff' }}>{grandTotal.total_monthly_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ background: 'rgba(6,182,212,0.1)', color: '#fff' }}>{grandTotal.total_annual_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
