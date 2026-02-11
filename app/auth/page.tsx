"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {supabase} from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rol, setRol] = useState<"jugador" | "club">("jugador")
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Verificar si ya hay sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push("/home")
      } else {
        setCheckingAuth(false)
      }
    }
    
    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    if (isRegister) {
      try {
        // Registro de nuevo usuario
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          console.error("Error registering:", error)
          if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            setErrorMessage("Este correo ya está registrado. Por favor, inicia sesión.")
            setIsRegister(false)
          } else {
            setErrorMessage(error.message)
          }
          setLoading(false)
          return
        }

        if (data.user) {
          // Crear perfil usando la API route
          try {
            const response = await fetch('/api/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                rol: rol,
              }),
            })

            const result = await response.json()

            if (!response.ok) {
              console.error('Error creating profile via API:', result.error)
              // No bloqueamos el registro por esto, el perfil se puede crear después
            } else {
              console.log('Profile created successfully:', result)
            }
          } catch (apiError) {
            console.error('Error calling create-profile API:', apiError)
            // Continuamos de todas formas
          }

          setShowEmailConfirmation(true)
          setLoading(false)
          return
        }
      } catch (error: any) {
        console.error("Unexpected error:", error)
        setErrorMessage(`Error inesperado: ${error.message || 'Por favor, intenta de nuevo'}`)
        setLoading(false)
        return
      }
    } else {
      // Login
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Error logging in:", error)
        setErrorMessage("Credenciales incorrectas. Por favor, verifica tu email y contraseña.")
        setLoading(false)
        return
      }

      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed, rol")
          .eq("id", authData.user.id)
          .single()

        console.log("Login successful, profile:", profile)

        if (profile && !profile.profile_completed) {
          router.push("/profile")
        } else {
          router.push("/home")
        }
      }
    }

    setLoading(false)
  }

  // Mostrar loading mientras verifica sesión
  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
        <div className="text-white text-xl">Verificando sesión...</div>
      </main>
    )
  }

  if (showEmailConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 text-white/10 text-9xl">⚽</div>
          <div className="absolute bottom-20 right-20 text-white/10 text-9xl">⚽</div>
          <div className="absolute top-1/2 right-10 text-white/10 text-7xl">⚽</div>
        </div>

        <div className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 backdrop-blur-sm text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            ¡Revisa tu correo!
          </h1>
          <p className="text-gray-600">
            Te hemos enviado un correo electrónico a <strong className="text-blue-600">{email}</strong>
          </p>
          <p className="text-gray-600 text-sm">
            Por favor, haz clic en el enlace de confirmación para activar tu cuenta y completar tu perfil.
          </p>
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            💡 No olvides revisar tu carpeta de spam si no ves el correo.
          </div>
          <button
            onClick={() => {
              setShowEmailConfirmation(false)
              setIsRegister(false)
            }}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-white/10 text-9xl">⚽</div>
        <div className="absolute bottom-20 right-20 text-white/10 text-9xl">⚽</div>
        <div className="absolute top-1/2 right-10 text-white/10 text-7xl">⚽</div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 backdrop-blur-sm"
      >
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            BuscaTuEquipo
          </h1>
          <p className="text-gray-600 text-sm">{isRegister ? "Crea tu cuenta" : "Inicia sesión"}</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">¿Cómo te registras?</label>
              <select
                className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none bg-white"
                value={rol}
                onChange={(e) => setRol(e.target.value as "jugador" | "club")}
              >
                <option value="jugador">🏃 Jugador</option>
                <option value="club">🏆 Club</option>
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Cargando..." : isRegister ? "✨ Crear cuenta" : "🚀 Ingresar"}
        </button>

        <div className="text-center pt-2">
          <p
            className="text-sm cursor-pointer text-blue-600 hover:text-blue-800 font-medium transition-colors"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMessage("")
            }}
          >
            {isRegister ? "¿Ya tienes cuenta? Inicia sesión →" : "¿No tienes cuenta? Regístrate →"}
          </p>
        </div>
      </form>
    </main>
  )
}