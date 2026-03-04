import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, UserPlus, TrendingUp, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'E-mail é obrigatório')
      .email('Informe um e-mail válido'),
    password: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const passwordValue = watch('password', '')

  const passwordChecks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
  }

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    const { error } = await signUp(data.email, data.password)

    if (error) {
      setServerError(
        error.message.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : 'Ocorreu um erro. Tente novamente.'
      )
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  if (success) {
    return (
      <div className="auth-layout">
        <div className="auth-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
        <div className="auth-card success-card">
          <CheckCircle className="success-icon" size={56} />
          <h2 className="success-title">Conta criada!</h2>
          <p className="success-message">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    )
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
          <h1 className="auth-title">Criar conta</h1>
          <p className="auth-subtitle">Comece a gerenciar suas finanças</p>
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
                autoComplete="new-password"
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

            {passwordValue.length > 0 && (
              <ul className="password-checks">
                <li className={passwordChecks.length ? 'check-ok' : 'check-fail'}>
                  {passwordChecks.length ? '✓' : '○'} Mínimo 8 caracteres
                </li>
                <li className={passwordChecks.uppercase ? 'check-ok' : 'check-fail'}>
                  {passwordChecks.uppercase ? '✓' : '○'} Uma letra maiúscula
                </li>
                <li className={passwordChecks.number ? 'check-ok' : 'check-fail'}>
                  {passwordChecks.number ? '✓' : '○'} Um número
                </li>
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirmar senha</label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={`form-input input-with-icon ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="form-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          <button
            type="submit"
            id="btn-register"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner" />
            ) : (
              <>
                <UserPlus size={18} />
                Criar conta
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Já tem uma conta?{' '}
          <Link to="/login" className="auth-link">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
