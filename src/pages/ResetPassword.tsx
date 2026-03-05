import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, TrendingUp, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  // O Supabase redireciona com um token de sessão no hash da URL.
  // Precisamos esperar o onAuthStateChange processar o token antes de permitir o reset.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
    } else {
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
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
          <h1 className="auth-title">Nova Senha</h1>
          <p className="auth-subtitle">
            {done ? 'Senha redefinida com sucesso!' : 'Escolha uma nova senha para sua conta'}
          </p>
        </div>

        {done ? (
          <div className="success-card" style={{ padding: '8px 0 0' }}>
            <CheckCircle size={48} className="success-icon" />
            <p className="success-title" style={{ fontSize: '1.1rem' }}>Senha alterada!</p>
            <p className="success-message">
              Você será redirecionado para o login em instantes...
            </p>
          </div>
        ) : !sessionReady ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Validando link de recuperação...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reset-password" className="form-label">
                Nova senha
              </label>
              <div className="input-wrapper">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm" className="form-label">
                Confirmar nova senha
              </label>
              <div className="input-wrapper">
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input input-with-icon"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-reset-password"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <Lock size={18} />
                  Redefinir senha
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
