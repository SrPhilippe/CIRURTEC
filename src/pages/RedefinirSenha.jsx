import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../assets/images/logo-cirurtec.png';
import '../pages/Login.css'; // Reusing Login styles for consistency

const RedefinirSenha = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const oobCode = searchParams.get('oobCode') || searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!oobCode) {
            setMessage({ type: 'error', text: 'Token inválido ou ausente.' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setMessage({ type: 'success', text: 'Senha redefinida com sucesso!' });
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            console.error(error);
            let errorMsg = 'Erro ao redefinir senha.';
            if (error.code === 'auth/expired-action-code') errorMsg = 'O link expirou.';
            if (error.code === 'auth/invalid-action-code') errorMsg = 'Link inválido.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    if (!oobCode) {
        return (
            <div className="login-container">
                <div className="login-card" style={{ textAlign: 'center' }}>
                     <img src={logo} alt="CIRURTEC" className="login-logo" />
                     <div className="alert-message error">
                        <AlertCircle size={20} />
                        <span>Link inválido ou expirado.</span>
                     </div>
                     <button className="login-button" onClick={() => navigate('/login')}>
                        Voltar ao Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="CIRURTEC" className="login-logo" />
                    <h2>Nova Senha</h2>
                    <p>Digite sua nova senha abaixo.</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nova Senha</label>
                        <div className="input-with-icon">
                            <Lock className="input-icon" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="******"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirmar Senha</label>
                        <div className="input-with-icon">
                            <Lock className="input-icon" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="******"
                                required
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div className={`alert-message ${message.type}`}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Salvando...' : 'Redefinir Senha'}
                    </button>
                    
                    <div className="login-footer">
                         <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                            Voltar ao Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenha;
