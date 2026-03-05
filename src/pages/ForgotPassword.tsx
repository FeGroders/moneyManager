import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, TrendingUp, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Informe seu e-mail.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço informado.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <TrendingUp size={28} />
          </div>
          <h1 className="auth-title">Recuperar Senha</h1>
          <p className="auth-subtitle">
            {sent
              ? 'Verifique sua caixa de entrada'
              : 'Enviaremos um link para redefinir sua senha'}
          </p>
        </div>

        {sent ? (
          <div className="success-card" style={{ padding: '8px 0 0' }}>
            <CheckCircle size={48} className="success-icon" />
            <p className="success-title" style={{ fontSize: '1.1rem' }}>E-mail enviado!</p>
            <p className="success-message">
              Enviamos um link de recuperação para <strong>{email}</strong>.
              Verifique também sua pasta de spam.
            </p>
            <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
              <ArrowLeft size={18} />
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">
                E-mail da conta
              </label>
              <div className="input-wrapper">
                <input
                  id="forgot-email"
                  type="email"
                  className="form-input input-with-icon"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <span className="input-icon-btn" style={{ pointerEvents: 'none' }}>
                  <Mail size={18} />
                </span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-forgot-password"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <Mail size={18} />
                  Enviar link de recuperação
                </>
              )}
            </button>
          </form>
        )}

        {!sent && (
          <p className="auth-footer-text">
            Lembrou a senha?{' '}
            <Link to="/login" className="auth-link">
              Voltar para o Login
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
