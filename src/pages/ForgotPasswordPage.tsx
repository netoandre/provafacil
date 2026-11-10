import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Send, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authForgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authForgotPassword(email);
      setSent(true);
      toast.success('Link de recuperação enviado!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao enviar e-mail de recuperação.';
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
          <p className="auth-logo-subtitle">Recuperação de Senha</p>
        </div>

        {sent ? (
          <div className="auth-success-msg">
            <p>Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes.</p>
            <Link to="/login" className="auth-btn mt-6">
              <ArrowLeft size={18} />
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <p className="auth-description">
              Informe seu e-mail e enviaremos as instruções para você criar uma nova senha.
            </p>
            
            <div className="auth-field">
              <label htmlFor="forgot-email">E-mail</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="professor@instituicao.edu.br"
                required
                autoFocus
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              {loading ? 'Enviando...' : 'Enviar Link'}
            </button>

            <Link to="/login" className="auth-back-link">
              <ArrowLeft size={16} />
              Voltar para o Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
