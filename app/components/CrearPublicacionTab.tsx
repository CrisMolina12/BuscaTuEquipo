// components/CrearPublicacionTab.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Send, CheckCircle } from "lucide-react"

interface Profile {
  id: string
  rol: "jugador" | "club"
  nombre_completo?: string
  nombre_club?: string
}

interface CrearPublicacionTabProps {
  profile: Profile
  onPublicacionCreada?: () => void
}

export default function CrearPublicacionTab({ profile, onPublicacionCreada }: CrearPublicacionTabProps) {
  const [titulo, setTitulo] = useState("")
  const [contenido, setContenido] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!titulo.trim() || !contenido.trim()) {
      alert("Por favor completa todos los campos")
      return
    }

    setSubmitting(true)

    try {
      const publicationType = profile.rol === "jugador" ? "busco_equipo" : "busco_jugador"

      const { error } = await supabase.from("publicaciones").insert({
        user_id: profile.id,
        title: titulo,
        content: contenido,
        publication_type: publicationType,
      })

      if (error) throw error

      // Mostrar mensaje de éxito
      setShowSuccess(true)
      
      // Limpiar formulario
      setTitulo("")
      setContenido("")

      // Después de 2 segundos, cambiar a la pestaña de publicaciones
      setTimeout(() => {
        setShowSuccess(false)
        if (onPublicacionCreada) {
          onPublicacionCreada()
        }
      }, 2000)

    } catch (error) {
      console.error("Error creating publication:", error)
      alert("❌ Error al crear la publicación")
    } finally {
      setSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4 sm:w-20 sm:h-20" />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">¡Publicación creada!</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">Tu publicación está ahora visible para todos</p>
        <div className="animate-pulse text-blue-600 text-sm sm:text-base">Redirigiendo a publicaciones...</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-5 sm:p-6 lg:p-8 mb-4 sm:mb-6 text-white">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          {profile.rol === "jugador" ? "🏃 Busco Equipo" : "🏆 Busco Jugador"}
        </h2>
        <p className="text-sm sm:text-base text-white/90">
          {profile.rol === "jugador"
            ? "Cuéntale a los clubes qué estás buscando y por qué eres el jugador perfecto para ellos."
            : "Describe qué tipo de jugador necesitas y los requisitos para unirse a tu equipo."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
            Título de la publicación <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder={
              profile.rol === "jugador"
                ? "Ej: Delantero experimentado busca equipo amateur"
                : "Ej: Buscamos mediocampista para equipo juvenil"
            }
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={100}
            className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 p-3 sm:p-4 rounded-xl transition-all duration-200 outline-none text-base sm:text-lg"
            required
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">{titulo.length}/100 caracteres</p>
            {titulo.length > 80 && (
              <p className="text-xs text-orange-500">⚠️ Acercándose al límite</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
            Descripción detallada <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder={
              profile.rol === "jugador"
                ? "Describe tu experiencia, disponibilidad, objetivos, etc."
                : "Describe los requisitos, horarios de entrenamiento, nivel del equipo, etc."
            }
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={8}
            maxLength={1000}
            className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 p-3 sm:p-4 rounded-xl transition-all duration-200 outline-none resize-none text-sm sm:text-base leading-relaxed"
            required
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">{contenido.length}/1000 caracteres</p>
            {contenido.length > 800 && (
              <p className="text-xs text-orange-500">⚠️ Acercándose al límite</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="text-2xl sm:text-3xl flex-shrink-0">💡</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-blue-900 mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">Consejos para tu publicación:</h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {profile.rol === "jugador" ? (
                  <>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Menciona tu posición y experiencia</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Indica tu disponibilidad de horarios</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Comparte tus objetivos deportivos</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Sé honesto sobre tu nivel actual</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Especifica la posición que buscas</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Menciona el nivel y categoría del equipo</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Indica horarios de entrenamiento</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                      <span className="text-blue-800 text-xs sm:text-sm">Describe la cultura del club</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !titulo.trim() || !contenido.trim()}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 sm:space-x-3 text-base sm:text-lg"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
              <span>Publicando...</span>
            </>
          ) : (
            <>
              <Send size={20} className="sm:w-6 sm:h-6" />
              <span>Publicar Ahora</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
            {(profile.nombre_completo || profile.nombre_club || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500">Publicando como:</p>
            <p className="font-bold text-sm sm:text-base text-gray-800 truncate">
              {profile.rol === "jugador" ? profile.nombre_completo : profile.nombre_club}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}