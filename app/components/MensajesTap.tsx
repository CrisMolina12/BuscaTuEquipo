// components/MensajesTab.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { MessageCircle, User, Users, Circle } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  rol: "jugador" | "club"
}

interface Conversacion {
  id: string
  usuario1_id: string
  usuario2_id: string
  updated_at: string
  publicaciones: {
    title: string
    publication_type: string
  }
  ultimo_mensaje?: {
    contenido: string
    created_at: string
    remitente_id: string
  }
  mensajes_no_leidos?: number
  otro_usuario?: {
    nombre_completo?: string
    nombre_club?: string
    rol: string
    foto_url?: string
    logo_url?: string
  }
  otro_usuario_online?: boolean
  otro_usuario_last_seen?: string
}

interface MensajesTabProps {
  profile: Profile
  onUnreadCountChange?: (count: number) => void
}

export default function MensajesTab({ profile, onUnreadCountChange }: MensajesTabProps) {
  const router = useRouter()
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversaciones()

    // Suscribirse a cambios en mensajes
    const channel = supabase
      .channel('mensajes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensajes'
        },
        () => {
          loadConversaciones()
        }
      )
      .subscribe()

    // Actualizar presencia cada 30 segundos
    const presenceInterval = setInterval(() => {
      loadConversaciones()
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(presenceInterval)
    }
  }, [])

  const loadConversaciones = async () => {
    setLoading(true)
    try {
      // Obtener conversaciones del usuario
      const { data: convs, error } = await supabase
        .from("conversaciones")
        .select(`
          *,
          publicaciones (
            title,
            publication_type
          )
        `)
        .or(`usuario1_id.eq.${profile.id},usuario2_id.eq.${profile.id}`)
        .order("updated_at", { ascending: false })

      if (error) throw error

      if (!convs || convs.length === 0) {
        setConversaciones([])
        if (onUnreadCountChange) onUnreadCountChange(0)
        setLoading(false)
        return
      }

      // Para cada conversación, obtener detalles
      const conversacionesConDetalles = await Promise.all(
        convs.map(async (conv: any) => {
          // Obtener último mensaje
          const { data: ultimoMensaje } = await supabase
            .from("mensajes")
            .select("contenido, created_at, remitente_id")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Contar mensajes no leídos
          const { count } = await supabase
            .from("mensajes")
            .select("*", { count: "exact", head: true })
            .eq("conversacion_id", conv.id)
            .eq("leido", false)
            .neq("remitente_id", profile.id)

          // Obtener datos del otro usuario
          const otroUserId = conv.usuario1_id === profile.id ? conv.usuario2_id : conv.usuario1_id
          const { data: otroUser } = await supabase
            .from("profiles")
            .select("nombre_completo, nombre_club, rol, foto_url, logo_url")
            .eq("id", otroUserId)
            .single()

          // Obtener presencia del otro usuario
          const { data: presenceData } = await supabase
            .from("user_presence")
            .select("*")
            .eq("user_id", otroUserId)
            .single()

          let isOnline = false
          let lastSeen = null

          if (presenceData) {
            const lastSeenDate = new Date(presenceData.last_seen)
            const now = new Date()
            const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60
            isOnline = diffMinutes < 2
            lastSeen = presenceData.last_seen
          }

          return {
            ...conv,
            ultimo_mensaje: ultimoMensaje,
            mensajes_no_leidos: count || 0,
            otro_usuario: otroUser,
            otro_usuario_online: isOnline,
            otro_usuario_last_seen: lastSeen
          }
        })
      )

      setConversaciones(conversacionesConDetalles)

      // Calcular total de mensajes no leídos
      const totalUnread = conversacionesConDetalles.reduce(
        (sum, conv) => sum + (conv.mensajes_no_leidos || 0),
        0
      )
      if (onUnreadCountChange) onUnreadCountChange(totalUnread)

    } catch (error) {
      console.error("Error loading conversaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  const getLastSeenText = (isOnline: boolean, lastSeen: string | null) => {
    if (isOnline) return "En línea"
    if (!lastSeen) return ""

    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60

    if (diffMinutes < 60) {
      const mins = Math.floor(diffMinutes)
      return `Hace ${mins} min`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `Hace ${hours}h`
    } else {
      const days = Math.floor(diffMinutes / 1440)
      return `Hace ${days}d`
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Cargando conversaciones...</p>
        </div>
      </div>
    )
  }

  if (conversaciones.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-10 sm:p-16 text-center">
        <MessageCircle size={48} className="mx-auto text-slate-300 mb-4 sm:w-16 sm:h-16" />
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No tienes conversaciones</h3>
        <p className="text-sm sm:text-base text-slate-600">
          Cuando contactes a alguien desde una publicación, las conversaciones aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 tracking-tight">Mensajes</h2>
          <p className="text-sm sm:text-base text-slate-600">
            {conversaciones.length} conversacion{conversaciones.length !== 1 ? 'es' : ''}
          </p>
        </div>
        {conversaciones.some(c => (c.mensajes_no_leidos ?? 0) > 0) && (
          <div className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-sm self-start sm:self-auto">
            {conversaciones.reduce((sum, c) => sum + (c.mensajes_no_leidos ?? 0), 0)} sin leer
          </div>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {conversaciones.map((conv) => {
          const hasUnread = (conv.mensajes_no_leidos ?? 0) > 0
          const isOnline = conv.otro_usuario_online ?? false
          
          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => router.push(`/chat/${conv.id}`)}
              className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border transition-all duration-200 p-3 sm:p-4 cursor-pointer ${
                hasUnread 
                  ? "border-emerald-300 shadow-md hover:shadow-lg" 
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Avatar con indicador de en línea */}
                <div className="relative flex-shrink-0">
                  {conv.otro_usuario?.foto_url || conv.otro_usuario?.logo_url ? (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden ring-2 ring-slate-100">
                      <Image
                        src={conv.otro_usuario.foto_url || conv.otro_usuario.logo_url || ""}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ring-2 ring-slate-100">
                      {conv.otro_usuario?.rol === "jugador" ? (
                        <User size={24} className="text-slate-600 sm:w-7 sm:h-7" />
                      ) : (
                        <Users size={24} className="text-slate-600 sm:w-7 sm:h-7" />
                      )}
                    </div>
                  )}
                  {/* Punto verde si está en línea */}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className={`font-bold truncate text-sm sm:text-base ${hasUnread ? "text-slate-900" : "text-slate-800"}`}>
                      {conv.otro_usuario?.nombre_completo || conv.otro_usuario?.nombre_club || "Usuario"}
                    </h3>
                    <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                      {conv.ultimo_mensaje && new Date(conv.ultimo_mensaje.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Estado de presencia */}
                  <div className="flex items-center space-x-1.5 mb-1">
                    {isOnline && (
                      <Circle size={7} className="text-emerald-500 fill-emerald-500 sm:w-2 sm:h-2" />
                    )}
                    <p className={`text-xs ${isOnline ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {getLastSeenText(isOnline, conv.otro_usuario_last_seen ?? null)}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 truncate mb-1">
                    📋 {conv.publicaciones?.title}
                  </p>

                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs sm:text-sm truncate flex-1 ${hasUnread ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                      {conv.ultimo_mensaje ? (
                        <>
                          {conv.ultimo_mensaje.remitente_id === profile.id && (
                            <span className="text-slate-500 font-normal">Tú: </span>
                          )}
                          {conv.ultimo_mensaje.contenido}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No hay mensajes aún</span>
                      )}
                    </p>

                    {hasUnread && (
                      <span className="bg-emerald-600 text-white text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex-shrink-0 shadow-sm">
                        {conv.mensajes_no_leidos}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}