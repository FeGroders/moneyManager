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

export function useBiometrics() {
    const { user } = useAuth()
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

    // Check if biometrics is already enabled for this user
    useEffect(() => {
        if (!user) {
            setIsEnabled(false)
            return
        }
        const saved = localStorage.getItem(`${STORAGE_KEY}:${user.id}`)
        setIsEnabled(!!saved)
    }, [user])

    const enable = useCallback(async () => {
        if (!user || !isSupported) return false

        try {
            // Create a dummy challenge (in a real app, from server)
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)

            // Dummy user ID
            const userId = bufferEncode(user.id)

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: {
                        name: 'Money Manager',
                        id: window.location.hostname,
                    },
                    user: {
                        id: userId,
                        name: user.email || 'user',
                        displayName: user?.user_metadata?.first_name || user.email || 'Usuário',
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 }, // ES256
                        { type: 'public-key', alg: -257 }, // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required',
                        residentKey: 'required',
                    },
                    timeout: 60000,
                    attestation: 'none',
                },
            })

            if (credential && credential.id) {
                // We save the credential id so we can specifically request this one during auth
                localStorage.setItem(`${STORAGE_KEY}:${user.id}`, credential.id)
                setIsEnabled(true)
                return true
            }
            return false
        } catch (error) {
            console.error('Erro ao habilitar biometria:', error)
            return false
        }
    }, [user, isSupported])

    const disable = useCallback(() => {
        if (!user) return
        localStorage.removeItem(`${STORAGE_KEY}:${user.id}`)
        setIsEnabled(false)
    }, [user])

    const authenticate = useCallback(async () => {
        if (!user || !isSupported) return false

        const credentialId = localStorage.getItem(`${STORAGE_KEY}:${user.id}`)
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
                    userVerification: 'required',
                    timeout: 60000,
                },
            })

            if (assertion) {
                // Local auth success
                return true
            }
            return false
        } catch (error) {
            console.error('Erro durante autenticação biométrica:', error)
            return false
        }
    }, [user, isSupported])

    return {
        isSupported,
        isEnabled,
        enable,
        disable,
        authenticate,
    }
}
