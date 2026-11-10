import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BookOpen, Key, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { authResetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    const e = searchParams.get('email');
    if (t) setToken(t);
    if (e) setEmail(e);
    
    if (!t || !e) {
      toast.error('Link de recuperação inválido ou expirado.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email || !password || !passwordConfirmation) return;
    
    if (password !== passwordConfirmation) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await authResetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao redefinir senha.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <CheckCircle2 size={42} className="text-emerald-500" />
            </div>
            <h1 className="auth-logo-title">Senha Alterada!</h1>
            <p className="auth-logo-subtitle">Sua senha foi redefinida com sucesso.</p>
          </div>
          <Link to="/login" className="auth-btn mt-6">
            <ArrowLeft size={18} />
            Ir para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <BookOpen size={28} />
          </div>
          <h1 className="auth-logo-title">ProvaFácil</h1>
          <p className="auth-logo-subtitle">Redefinir Senha</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <p className="auth-description">
            Crie uma nova senha para sua conta associada ao e-mail: <strong>{email}</strong>
          </p>
          
          <div className="auth-field">
            <label htmlFor="reset-password">Nova Senha</label>
            <div className="auth-pass-wrap">
              <input
                id="reset-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                disabled={!token}
              />
              <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reset-password-confirm">Confirmar Nova Senha</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              placeholder="••••••••"
              required
              disabled={!token}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || !token}>
            {loading ? <Loader2 size={18} className="spin" /> : <Key size={18} />}
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
