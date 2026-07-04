import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Building } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default function CostSettings({ token, company, onCompanyUpdate, onSettingsUpdated, onUnauthorized }) {
    const [settings, setSettings] = useState({
        gosi_saudi_rate: 0.22,
        gosi_resident_rate: 0.02,
        ticket_annual_cost: 900.0,
        passport_annual_fee: 650.0,
        work_permit_annual_fee: 9700.0,
        vacation_days_per_year: 21,
        unified_number: '',
        cr_number: ''
    });

    const [companyName, setCompanyName] = useState(company?.name || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch(API_URL + '/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                if (onUnauthorized) onUnauthorized();
                return;
            }
            const data = await response.json();
            if (response.ok && data) {
                setSettings({
                    ...data,
                    unified_number: data.unified_number || '',
                    cr_number: data.cr_number || ''
                });
            } else {
                throw new Error(data.error || 'فشل جلب الإعدادات');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        try {
            // 1. Save company profile name if changed
            if (companyName.trim() && companyName !== company?.name) {
                const profRes = await fetch(API_URL + '/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: companyName })
                });
                
                if (profRes.status === 401 || profRes.status === 403) {
                    if (onUnauthorized) onUnauthorized();
                    return;
                }

                const profData = await profRes.json();
                if (!profRes.ok) {
                    throw new Error(profData.error || 'فشل تحديث اسم الشركة');
                }
                
                // Update local storage and App state
                if (onCompanyUpdate) {
                    onCompanyUpdate({ ...company, name: companyName.trim() });
                }
            }

            // 2. Save settings
            const response = await fetch(API_URL + '/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (response.status === 401 || response.status === 403) {
                if (onUnauthorized) onUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'فشل حفظ الإعدادات');
            }

            setMessage('تم حفظ الإعدادات بنجاح!');
            if (onSettingsUpdated) onSettingsUpdated();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (key, val) => {
        setSettings(prev => ({
            ...prev,
            [key]: (key === 'unified_number' || key === 'cr_number') ? val : Number(val)
        }));
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل الإعدادات...</div>;

    return (
        <div className="rtl">
            <h2 style={{ marginBottom: '24px' }}>إعدادات التكاليف ونسب الحساب</h2>

            {message && <div className="badge badge-success" style={{ display: 'block', textAlign: 'center', marginBottom: '20px', padding: '10px' }}>{message}</div>}
            {error && <div className="badge badge-danger" style={{ display: 'block', textAlign: 'center', marginBottom: '20px', padding: '10px' }}>{error}</div>}

            <form onSubmit={handleSave} className="glass-panel">
                {/* Section 1: Company Profile Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <Building className="menu-item-icon" style={{ color: 'var(--primary)' }} />
                    <h3>الملف الشخصي المنشأة الرئيسي</h3>
                </div>
                
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>اسم المستخدم الحالي / اسم الشركة</label>
                    <input
                        type="text"
                        className="form-control"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="أحمد سليمان - شركة ريال البركة للتجارة"
                        required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>يظهر هذا الاسم في القائمة الجانبية للتطبيق وفي التقارير المالية</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <div className="form-group">
                        <label>الرقم الموحد الرئيسي للمجموعة (700)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={settings.unified_number || ''}
                            onChange={(e) => handleInputChange('unified_number', e.target.value)}
                            placeholder="7014477116"
                        />
                    </div>
                    <div className="form-group">
                        <label>رقم السجل التجاري الرئيسي للشركة</label>
                        <input
                            type="text"
                            className="form-control"
                            value={settings.cr_number || ''}
                            onChange={(e) => handleInputChange('cr_number', e.target.value)}
                            placeholder="1010000000"
                        />
                    </div>
                </div>

                {/* Section 2: Financial Settings */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <Settings className="menu-item-icon" style={{ color: 'var(--primary)' }} />
                    <h3>النسب ورسوم الهوية والعمل</h3>
                </div>

                <div className="form-grid">
                    {/* GOSI Rates */}
                    <div className="form-group">
                        <label>نسبة التأمينات الاجتماعية للسعوديين (GOSI)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={settings.gosi_saudi_rate}
                            onChange={(e) => handleInputChange('gosi_saudi_rate', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مثال: 0.22 تعني 22% (تتحملها المنشأة)</span>
                    </div>

                    <div className="form-group">
                        <label>نسبة التأمينات للمقيمين (الأخطار المهنية)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={settings.gosi_resident_rate}
                            onChange={(e) => handleInputChange('gosi_resident_rate', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مثال: 0.02 تعني 2%</span>
                    </div>

                    {/* Reruits fees */}
                    <div className="form-group">
                        <label>الرسوم السنوية لرخصة مكتب العمل (ريال)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={settings.work_permit_annual_fee}
                            onChange={(e) => handleInputChange('work_permit_annual_fee', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>القيمة الافتراضية للقطاع التجاري: 9,700 ريال سنوياً</span>
                    </div>

                    <div className="form-group">
                        <label>الرسوم السنوية لتجديد الإقامة والجوازات (ريال)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={settings.passport_annual_fee}
                            onChange={(e) => handleInputChange('passport_annual_fee', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>القيمة الافتراضية للشركات: 650 ريال سنوياً</span>
                    </div>

                    {/* Flight & Leaves */}
                    <div className="form-group">
                        <label>التكلفة السنوية لتذاكر الطيران لكل مقيم (ريال)</label>
                        <input
                            type="number"
                            className="form-control"
                            value={settings.ticket_annual_cost}
                            onChange={(e) => handleInputChange('ticket_annual_cost', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>مثال: تذكرة بقيمة 1,800 ريال كل سنتين = 900 ريال سنوياً</span>
                    </div>

                    <div className="form-group">
                        <label>أيام الإجازة السنوية المستحقة</label>
                        <input
                            type="number"
                            className="form-control"
                            value={settings.vacation_days_per_year}
                            onChange={(e) => handleInputChange('vacation_days_per_year', e.target.value)}
                            required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>القانونية في السعودية: 21 يوماً (أو 30 يوماً بعد 5 سنوات)</span>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Save className="menu-item-icon" />
                        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </button>
                </div>
            </form>
            
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px' }}>
                <AlertCircle className="menu-item-icon" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>تأثير التغييرات:</strong> سيقوم النظام تلقائياً وبشكل فوري بإعادة حساب التكلفة الكلية الشهرية والسنوية لجميع الموظفين المقيمين، بالإضافة إلى تحديث نسب وتكاليف السعودة الموزعة بناءً على المعايير الجديدة التي تحددها هنا.
                </p>
            </div>
        </div>
    );
}
