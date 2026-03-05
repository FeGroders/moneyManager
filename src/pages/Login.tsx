import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Informe um e-mail válido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'A senha deve ter no mínimo 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)

    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Ocorreu um erro. Tente novamente.'
      )
      return
    }

    navigate('/dashboard', { replace: true })
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
          <h1 className="auth-title">Money Manager</h1>
          <p className="auth-subtitle">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          {serverError && (
            <div className="alert alert-error" role="alert">
              {serverError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="seu@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <span className="form-error">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input input-with-icon ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
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
            {errors.password && (
              <span className="form-error">{errors.password.message}</span>
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.82rem' }}>
              Esqueceu sua senha?
            </Link>
          </div>

          <button
            type="submit"
            id="btn-login"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Não tem uma conta?{' '}
          <Link to="/register" className="auth-link">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
