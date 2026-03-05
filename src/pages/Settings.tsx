import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Save, CheckCircle, AlertCircle, Lock, Eye, EyeOff, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // UI state
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Load existing metadata on mount
  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name ?? '')
      setLastName(user.user_metadata.last_name ?? '')
      setPhone(user.user_metadata.phone ?? '')
      setBirthDate(user.user_metadata.birth_date ?? '')
    }
  }, [user])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        birth_date: birthDate,
      },
    })

    setProfileLoading(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setPasswordLoading(true)

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    })

    if (signInError) {
      setPasswordLoading(false)
      setPasswordError('Senha atual incorreta.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setPasswordLoading(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  const avatarLetter =
    firstName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    'U'

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie suas informações pessoais e segurança da conta</p>
      </div>

      <div className="settings-grid">
        {/* Profile Section */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <User size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Informações Pessoais</h2>
              <p className="settings-card-subtitle">Atualize seus dados de perfil</p>
            </div>
          </div>

          {/* Avatar preview */}
          <div className="settings-avatar-row">
            <div className="settings-avatar">{avatarLetter}</div>
            <div className="settings-avatar-info">
              <span className="settings-avatar-name">
                {firstName || lastName
                  ? `${firstName} ${lastName}`.trim()
                  : 'Sem nome definido'}
              </span>
              <span className="settings-avatar-email">{user?.email}</span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="settings-first-name">
                  Nome
                </label>
                <input
                  id="settings-first-name"
                  type="text"
                  className="form-input"
                  placeholder="Digite seu nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-last-name">
                  Sobrenome
                </label>
                <input
                  id="settings-last-name"
                  type="text"
                  className="form-input"
                  placeholder="Digite seu sobrenome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="settings-phone">
                  Telefone
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-birth-date">
                  Data de nascimento
                </label>
                <input
                  id="settings-birth-date"
                  type="date"
                  className="form-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">
                E-mail
              </label>
              <input
                id="settings-email"
                type="email"
                className="form-input"
                value={user?.email ?? ''}
                disabled
                title="O e-mail não pode ser alterado aqui"
              />
              <span className="form-hint">O e-mail não pode ser alterado nesta tela.</span>
            </div>

            {profileError && (
              <div className="settings-alert settings-alert-error">
                <AlertCircle size={16} />
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="settings-alert settings-alert-success">
                <CheckCircle size={16} />
                Perfil atualizado com sucesso!
              </div>
            )}

            <div className="settings-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileLoading}
                id="btn-save-profile"
              >
                {profileLoading ? (
                  <span className="btn-loading">Salvando...</span>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Password Section */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Segurança</h2>
              <p className="settings-card-subtitle">Altere sua senha de acesso</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label className="form-label" htmlFor="settings-current-password">
                Senha atual
              </label>
              <div className="input-password-wrapper">
                <input
                  id="settings-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label="Alternar visibilidade da senha"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-new-password">
                Nova senha
              </label>
              <div className="input-password-wrapper">
                <input
                  id="settings-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Mínimo de 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label="Alternar visibilidade da nova senha"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-confirm-password">
                Confirmar nova senha
              </label>
              <div className="input-password-wrapper">
                <input
                  id="settings-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Alternar visibilidade da confirmação de senha"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="settings-alert settings-alert-error">
                <AlertCircle size={16} />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="settings-alert settings-alert-success">
                <CheckCircle size={16} />
                Senha alterada com sucesso!
              </div>
            )}

            <div className="settings-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading}
                id="btn-save-password"
              >
                {passwordLoading ? (
                  <span className="btn-loading">Salvando...</span>
                ) : (
                  <>
                    <Save size={16} />
                    Alterar senha
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Logout Section */}
        <section className="settings-card settings-card-danger">
          <div className="settings-card-header">
            <div className="settings-card-icon settings-card-icon-danger">
              <LogOut size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Sessão</h2>
              <p className="settings-card-subtitle">Encerrar sua sessão no Money Manager</p>
            </div>
          </div>
          <div className="settings-logout-row">
            <p className="settings-logout-desc">Ao sair, você precisará fazer login novamente para acessar sua conta.</p>
            <button
              id="btn-logout"
              className="btn btn-danger"
              onClick={handleSignOut}
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
