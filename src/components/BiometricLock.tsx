import React, { useState, useEffect } from 'react'
import { Lock, Fingerprint } from 'lucide-react'
import { useBiometrics } from '@/hooks/useBiometrics'
import { useAuth } from '@/contexts/AuthContext'

export function BiometricLock({ children }: { children: React.ReactNode }) {
  const { isEnabled, authenticate } = useBiometrics()
  const { user } = useAuth()
  
  // Only locked initially if the user has enabled it and they are logged in
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto prompt on mount if it's locked
  useEffect(() => {
    if (isEnabled && user && !isUnlocked) {
      handleUnlock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, user])

  const handleUnlock = async () => {
    if (isAuthenticating) return
    setError(null)
    setIsAuthenticating(true)
    
    try {
      const success = await authenticate()
      if (success) {
        setIsUnlocked(true)
      } else {
        setError('Não foi possível verificar a biometria. Tente novamente.')
      }
    } catch (err) {
      setError('Erro ao acionar biometria.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Se não tem usuário ou biometria não está ativada, ou já desbloqueou
  if (!user || !isEnabled || isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="auth-layout" style={{ justifyContent: 'center' }}>
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="auth-card" style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, color: 'var(--primary)' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: 16, borderRadius: '50%' }}>
            <Lock size={48} />
          </div>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: 8 }}>App Bloqueado</h1>
        <p className="auth-subtitle" style={{ marginBottom: 32 }}>
          Por segurança, use o Face ID ou Touch ID para acessar o aplicativo.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleUnlock}
          disabled={isAuthenticating}
          className="btn btn-primary btn-full"
          style={{ height: 56, fontSize: '1.1rem' }}
        >
          {isAuthenticating ? (
            <span className="btn-spinner" />
          ) : (
            <>
              <Fingerprint size={24} />
              Desbloquear App
            </>
          )}
        </button>
      </div>
    </div>
  )
}
