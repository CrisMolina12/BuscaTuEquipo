"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut, User, Users, Search, MessageCircle, List, Plus, Menu, X } from "lucide-react"
import ProfileTab from "@/app/components/ProfileTab"
import PublicacionesTab from "@/app/components/PublicacionesTab"
import CrearPublicacionTab from "@/app/components/CrearPublicacionTab"
import MensajesTab from "@/app/components/MensajesTap"
import MisPublicacionesTab from "@/app/components/MisPublicacionesTab"

interface Profile {
  id: string
  rol: "jugador" | "club"
  email: string
  profile_completed: boolean
  nombre_completo?: string
  edad?: number
  posicion?: string
  pierna?: string
  altura?: number
  peso?: number
  experiencia?: string
  disponibilidad?: string[]
  foto_url?: string
  nombre_club?: string
  ubicacion?: string
  telefono?: string
  descripcion?: string
  logo_url?: string
  categoria?: string
}

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"perfil" | "publicaciones" | "crear" | "mensajes" | "mis-publicaciones">("perfil")
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile?.id) {
      loadUnreadCount()

      const channel = supabase
        .channel('unread-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mensajes'
          },
          () => {
            loadUnreadCount()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile?.id])

  const loadProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push("/auth")
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error || !data.profile_completed) {
      router.push("/profile")
      return
    }

    setProfile(data)
    setLoading(false)
  }

  const loadUnreadCount = async () => {
    if (!profile?.id) return

    try {
      const { data: conversaciones } = await supabase
        .from("conversaciones")
        .select("id")
        .or(`usuario1_id.eq.${profile.id},usuario2_id.eq.${profile.id}`)

      if (!conversaciones || conversaciones.length === 0) {
        setUnreadCount(0)
        return
      }

      const conversacionIds = conversaciones.map(c => c.id)
      
      const { count } = await supabase
        .from("mensajes")
        .select("*", { count: "exact", head: true })
        .in("conversacion_id", conversacionIds)
        .eq("leido", false)
        .neq("remitente_id", profile.id)

      setUnreadCount(count || 0)
    } catch (error) {
      console.error("Error loading unread count:", error)
    }
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const tabs = [
    { id: "perfil" as const, label: "Perfil", icon: profile.rol === "jugador" ? User : Users },
    { id: "publicaciones" as const, label: "Explorar", icon: Search },
    { id: "mis-publicaciones" as const, label: "Mis Publicaciones", icon: List },
    { id: "mensajes" as const, label: "Mensajes", icon: MessageCircle, badge: unreadCount },
    { id: "crear" as const, label: "Publicar", icon: Plus },
  ]

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
      {/* Header elegante */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40" style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20">
            {/* Logo refinado */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                <span className="text-xl sm:text-2xl">⚽</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight">BuscaTuEquipo</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Conecta tu talento</p>
              </div>
            </div>

            {/* Navegación Desktop */}
            <nav className="hidden lg:flex items-center space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative px-4 xl:px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                      isActive
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{tab.label}</span>
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Controles Mobile/Tablet */}
            <div className="flex items-center space-x-2">
              {/* Botón cerrar sesión - Desktop */}
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push("/auth")
                }}
                className="hidden sm:flex items-center space-x-2 px-3 lg:px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              >
                <LogOut size={16} className="lg:w-[18px] lg:h-[18px]" />
                <span className="hidden md:inline text-sm font-medium">Salir</span>
              </button>

              {/* Botón menú móvil */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Menú Mobile/Tablet desplegable */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-100 py-3"
            >
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full relative px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-sm">{tab.label}</span>
                      </div>
                      {tab.badge && tab.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {tab.badge > 9 ? "9+" : tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
                
                {/* Cerrar sesión en menú móvil */}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.push("/auth")
                  }}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center space-x-3 text-red-600 hover:bg-red-50 border-t border-slate-100 mt-2 pt-3"
                >
                  <LogOut size={20} />
                  <span className="text-sm">Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Navegación Tablet - Scroll horizontal */}
          <div className="hidden md:block lg:hidden pb-3 -mx-2 px-2 overflow-x-auto">
            <div className="flex space-x-2 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center space-x-2 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{tab.label}</span>
                    {tab.badge && tab.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "perfil" && <ProfileTab profile={profile} onUpdate={loadProfile} />}
          {activeTab === "publicaciones" && <PublicacionesTab profile={profile} />}
          {activeTab === "mis-publicaciones" && <MisPublicacionesTab profile={profile} />}
          {activeTab === "mensajes" && <MensajesTab profile={profile} onUnreadCountChange={setUnreadCount} />}
          {activeTab === "crear" && (
            <CrearPublicacionTab 
              profile={profile} 
              onPublicacionCreada={() => handleTabChange("mis-publicaciones")}
            />
          )}
        </motion.div>
      </div>
    </main>
  )
}