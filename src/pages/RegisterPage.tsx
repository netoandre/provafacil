import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, passwordConfirmation);
      toast.success(`Bem-vindo(a), ${name}! Conta criada com sucesso.`);
      navigate('/');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg: any) => toast.error(msg));
      } else {
        toast.error(err?.response?.data?.message || 'Erro ao criar conta. Tente novamente.');
      }
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
          <p className="auth-logo-subtitle">Crie sua conta de professor</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reg-name">Nome completo</label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Prof. João Silva"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">E-mail</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="professor@instituicao.edu.br"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Senha</label>
            <div className="auth-pass-wrap">
              <input
                id="reg-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password-confirm">Confirmar senha</label>
            <input
              id="reg-password-confirm"
              type={showPass ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />}
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta?{' '}
          <Link to="/login">Faça login</Link>
        </p>
      </div>
    </div>
  );
}
