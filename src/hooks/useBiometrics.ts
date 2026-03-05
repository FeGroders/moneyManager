import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Helpers to convert strings to ArrayBuffer and back, needed for WebAuthn APIs
function bufferEncode(value: string): ArrayBuffer {
    return new TextEncoder().encode(value).buffer
}

// Convert Base64 (URL safe) to ArrayBuffer
function base64UrlToArrayBuffer(base64ulr: string): ArrayBuffer {
    const base64 = base64ulr.replace(/-/g, '+').replace(/_/g, '/')
    const binary_string = window.atob(base64)
    const len = binary_string.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
}

const STORAGE_KEY = '@MoneyManager:biometrics'
const CREDENTIALS_KEY = '@MoneyManager:biometrics_creds'

// Obfuscation helpers (Simple Base64 - not encryption, but prevents casual visual inspection)
function obfuscate(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
}

function deobfuscate(str: string): string {
    try {
        return decodeURIComponent(escape(atob(str)))
    } catch (e) {
        return ''
    }
}

export function useBiometrics() {
    const { user, signIn } = useAuth()
    const [isSupported, setIsSupported] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)

    // Check if WebAuthn is supported
    useEffect(() => {
        if (window.PublicKeyCredential) {
            // Check if User Verifying Platform Authenticator is available (e.g. FaceID, TouchID, Windows Hello)
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then((available) => setIsSupported(available))
                .catch(() => setIsSupported(true)) // Assume true if error
        } else {
            setIsSupported(false)
        }
    }, [])

    // Check if biometrics is already enabled
    useEffect(() => {
        // We can be enabled globally if there are saved credentials OR for an active user
        const savedId = localStorage.getItem(STORAGE_KEY)
        setIsEnabled(!!savedId)
    }, [user])

    const enable = useCallback(
        async (email?: string, password?: string) => {
            // We need either a logged in user, or email/password passed in if we're setting it up eagerly
            const targetEmail = email || user?.email
            if (!isSupported || !targetEmail) return false

            try {
                const challenge = new Uint8Array(32)
                window.crypto.getRandomValues(challenge)

                const userId = bufferEncode(user?.id || 'local-user')

                const credential = await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: {
                            name: 'Money Manager',
                            id: window.location.hostname,
                        },
                        user: {
                            id: userId,
                            name: targetEmail,
                            displayName: user?.user_metadata?.first_name || targetEmail,
                        },
                        pubKeyCredParams: [
                            { type: 'public-key', alg: -7 }, // ES256
                            { type: 'public-key', alg: -257 }, // RS256
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: 'platform',
                            userVerification: 'preferred', // Alterado de required para preferred p/ windows
                            residentKey: 'discouraged', // Alterado de required para discouraged p/ evitar forçar MS Authenticator
                        },
                        timeout: 60000,
                        attestation: 'none',
                    },
                })

                if (credential && credential.id) {
                    localStorage.setItem(STORAGE_KEY, credential.id)

                    if (email && password) {
                        // Salvar credenciais ofuscadas para auto-login posterior
                        const str = JSON.stringify({ email, password })
                        localStorage.setItem(CREDENTIALS_KEY, obfuscate(str))
                    }

                    setIsEnabled(true)
                    return true
                }
                return false
            } catch (error) {
                console.error('Erro ao habilitar biometria:', error)
                return false
            }
        },
        [user, isSupported]
    )

    const disable = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(CREDENTIALS_KEY)
        setIsEnabled(false)
    }, [])

    const authenticate = useCallback(async () => {
        if (!isSupported) return false

        const credentialId = localStorage.getItem(STORAGE_KEY)
        if (!credentialId) return false

        try {
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    allowCredentials: [
                        {
                            type: 'public-key',
                            id: base64UrlToArrayBuffer(credentialId),
                        },
                    ],
                    userVerification: 'preferred',
                    timeout: 60000,
                },
            })

            if (assertion) {
                // Biometria passou com sucesso!
                return true
            }
            return false
        } catch (error) {
            console.error('Erro durante autenticação biométrica:', error)
            return false
        }
    }, [isSupported])

    // Um helper que faz a biometria nativa e DEPOIS loga no Supabase
    const authenticateAndSignIn = useCallback(async () => {
        const credsStr = localStorage.getItem(CREDENTIALS_KEY)
        if (!credsStr) return { success: false, error: 'Credenciais não encontradas.' }

        // 1. Validar FaceID
        const authSuccess = await authenticate()
        if (!authSuccess) return { success: false, error: 'Autenticação biométrica falhou.' }

        // 2. Logar no Supabase
        try {
            const { email, password } = JSON.parse(deobfuscate(credsStr))
            const { error } = await signIn(email, password)

            if (error) {
                return { success: false, error: 'E-mail ou senha expirados/inválidos. Faça login novamente.' }
            }
            return { success: true }
        } catch (err) {
            return { success: false, error: 'Falha ao recuperar credenciais. Faça login novamente.' }
        }
    }, [authenticate, signIn])

    return {
        isSupported,
        isEnabled,
        enable,
        disable,
        authenticate,
        authenticateAndSignIn,
    }
}
