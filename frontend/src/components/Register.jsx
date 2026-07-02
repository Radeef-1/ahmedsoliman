import React, { useState } from 'react';
import { Mail, KeyRound, Building } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');


export default function Register({ onRegisterSuccess, onNavigateToLogin }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(API_URL + '/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'حدث خطأ أثناء إنشاء الحساب');
            }

            onRegisterSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page rtl">
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <h1>تكلفتي</h1>
                    <p>تسجيل شركة جديدة في النظام للبدء في التحليل</p>
                </div>

                {error && <div className="badge badge-danger" style={{ display: 'block', textAlign: 'center', marginBottom: '20px', padding: '10px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>اسم الشركة أو المؤسسة</label>
                        <div style={{ position: 'relative' }}>
                            <Building className="menu-item-icon" style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
                            <input
                                type="text"
                                className="form-control"
                                style={{ paddingRight: '44px', width: '100%' }}
                                placeholder="شركة ريال البركة للتجارة"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>البريد الإلكتروني للشركة</label>
                        <div style={{ position: 'relative' }}>
                            <Mail className="menu-item-icon" style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
                            <input
                                type="email"
                                className="form-control"
                                style={{ paddingRight: '44px', width: '100%' }}
                                placeholder="info@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>كلمة المرور</label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound className="menu-item-icon" style={{ position: 'absolute', right: '12px', top: '12px', color: '#64748b' }} />
                            <input
                                type="password"
                                className="form-control"
                                style={{ paddingRight: '44px', width: '100%' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', height: '48px' }} disabled={loading}>
                        {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد'}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>لديك حساب بالفعل؟ </span>
                    <a href="#" onClick={(e) => { e.preventDefault(); onNavigateToLogin(); }}>تسجيل الدخول</a>
                </div>
            </div>
        </div>
    );
}
