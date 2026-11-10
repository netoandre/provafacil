import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Email ou senha incorretos.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <BookOpen size={28} />
          </div>
          <h1 className="auth-logo-title">ProvaFácil</h1>
          <p className="auth-logo-subtitle">Sistema de geração de provas acadêmicas</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="professor@instituicao.edu.br"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Senha</label>
            <div className="auth-pass-wrap">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="auth-forgot">
              <Link to="/forgot-password">Esqueceu a senha?</Link>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>


        <p className="auth-switch">
          Não tem conta?{' '}
          <Link to="/register">Cadastre-se gratuitamente</Link>
        </p>
      </div>
    </div>
  );
}
