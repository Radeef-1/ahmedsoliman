import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowLeftRight } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


export default function ExcelImport({ token, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile) => {
        setError('');
        setResult(null);
        
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            setError('امتداد الملف غير صالح. يرجى رفع ملف إكسل بصيغة .xlsx أو .xls فقط.');
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(API_URL + '/api/import', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'فشل استيراد الملف');
            }

            setResult(data);
            setFile(null);
            if (onImportSuccess) onImportSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rtl">
            <h2 style={{ marginBottom: '24px' }}>استيراد الموظفين من ملف إكسل</h2>

            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>تعليمات شيت الإكسيل (Excel Template Instructions)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    يمكنك رفع شيت إكسيل يحتوي على بيانات الموظفين ورواتبهم وبدلاتهم دفعة واحدة. يجب أن يحتوي الملف في الورقة الأولى (Sheet 1) على الأعمدة التالية بأسماء واضحة (باللغة العربية أو الإنجليزية):
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '0.85rem', marginBottom: '24px' }}>
                    <div style={{ padding: '12px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ color: 'var(--primary)' }}>بيانات الموظف الأساسية:</strong>
                        <ul style={{ paddingRight: '18px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                            <li>الرقم الوظيفي (أو employee_code) * إجباري</li>
                            <li>اسم الموظف (أو name) * إجباري</li>
                            <li>الجنسية (nationality) * افتراضي: سعودي</li>
                            <li>النوع (gender) * ذكر / أنثى</li>
                            <li>المشروع أو الموقع (project)</li>
                            <li>حالة الموظف (status) * على رأس العمل / إجازة ...</li>
                        </ul>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ color: 'var(--success)' }}>الرواتب والبدلات (شهري):</strong>
                        <ul style={{ paddingRight: '18px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                            <li>الراتب الأساسي (basic_salary)</li>
                            <li>بدل السكن (housing_allowance)</li>
                            <li>بدل الانتقال (transportation_allowance)</li>
                            <li>بدل معيشة (living_allowance)</li>
                            <li>بدلات أخرى (other_allowances)</li>
                        </ul>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <strong style={{ color: 'var(--warning)' }}>تكاليف المقيمين الإضافية (شهري):</strong>
                        <ul style={{ paddingRight: '18px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                            <li>التأمين الطبي (medical_insurance)</li>
                            <li>الشهادة الصحية (health_certificate)</li>
                            <li>تأشيرة الخروج والعودة (exit_reentry)</li>
                        </ul>
                    </div>
                </div>

                {/* Upload Zone */}
                <div 
                    className="upload-zone"
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('excel-file-input').click()}
                    style={{ borderStyle: dragActive ? 'solid' : 'dashed', borderColor: dragActive ? 'var(--primary)' : 'var(--border-color)' }}
                >
                    <input 
                        type="file" 
                        id="excel-file-input" 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                    />
                    <UploadCloud className="upload-zone-icon" />
                    {file ? (
                        <div>
                            <p style={{ fontWeight: '600', color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <FileSpreadsheet style={{ color: 'var(--success)' }} />
                                {file.name}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                                الحجم: {(file.size / 1024).toFixed(1)} كيلوبايت - انقر لتغيير الملف
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontWeight: '600', fontSize: '1.05rem' }}>اسحب وأفلت ملف الإكسيل هنا، أو انقر للتصفح</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                                الامتدادات المدعومة: .xlsx, .xls
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                        <AlertTriangle style={{ width: '20px', height: '20px' }} />
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', color: '#fff', fontSize: '0.9rem' }}>
                        <CheckCircle style={{ width: '24px', height: '24px', color: 'var(--success)', flexShrink: 0 }} />
                        <div>
                            <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>اكتملت العملية بنجاح!</strong>
                            <span>تم استيراد/تحديث <strong>{result.successCount}</strong> موظفاً بنجاح. وتم تجاهل <strong>{result.skipCount}</strong> صفاً بسبب نقص البيانات الأساسية.</span>
                        </div>
                    </div>
                )}

                {file && (
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
                            {loading ? 'جاري الاستيراد والتحديث...' : 'بدء الاستيراد الآن'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
