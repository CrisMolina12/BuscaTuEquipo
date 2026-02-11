// components/PublicacionesTab.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { User, Users, Calendar, Trash2, Eye, MessageSquare, Phone, Search, Pause, Play, Filter, X, SlidersHorizontal } from "lucide-react"
import Image from "next/image"
import VerifiedBadge from "@/app/components/Verifiedbadge"

interface Profile {
  rol: "jugador" | "club"
  id: string
}

interface Publicacion {
  id: string
  user_id: string
  title: string
  content: string
  publication_type: string
  created_at: string
  activa?: boolean
  profiles: {
    nombre_completo?: string
    nombre_club?: string
    rol: string
    foto_url?: string
    logo_url?: string
    telefono?: string
    posicion?: string
    edad?: number
    ubicacion?: string
    categoria?: string
    disponibilidad?: string[]
    verified?: boolean
    verification_badge_type?: string
  } | null
}

export default function PublicacionesTab({ profile }: { profile: Profile }) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Estados de filtros
  const [showFilters, setShowFilters] = useState(false)
  const [filterPosicion, setFilterPosicion] = useState<string>("")
  const [filterEdadMin, setFilterEdadMin] = useState<string>("")
  const [filterEdadMax, setFilterEdadMax] = useState<string>("")
  const [filterUbicacion, setFilterUbicacion] = useState<string>("")
  const [filterDisponibilidad, setFilterDisponibilidad] = useState<string>("")
  const [sortBy, setSortBy] = useState<"reciente" | "antiguo">("reciente")

  useEffect(() => {
    loadPublicaciones()
  }, [])

  const loadPublicaciones = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: pubData, error: pubError } = await supabase
        .from("publicaciones")
        .select("*")
        .order("created_at", { ascending: false })

      if (pubError) {
        setError(`Error al cargar publicaciones`)
        setLoading(false)
        return
      }

      if (!pubData || pubData.length === 0) {
        setPublicaciones([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(pubData.map(p => p.user_id))]

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nombre_completo, nombre_club, rol, foto_url, logo_url, telefono, posicion, edad, ubicacion, categoria, disponibilidad, verified, verification_badge_type")
        .in("id", userIds)

      const publicacionesConPerfiles = pubData.map(pub => {
        const perfil = profilesData?.find(p => p.id === pub.user_id)
        return { ...pub, profiles: perfil || null }
      })
      
      setPublicaciones(publicacionesConPerfiles)
    } catch (error: any) {
      setError(`Error al cargar`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta publicación permanentemente?")) return
    const { error } = await supabase.from("publicaciones").delete().eq("id", id)
    if (!error) loadPublicaciones()
  }

  const handleToggleActiva = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("publicaciones")
      .update({ activa: !currentState })
      .eq("id", id)

    if (!error) loadPublicaciones()
  }

  const handleStartChat = async (publicacionId: string, otroUsuarioId: string) => {
    try {
      const { data: existingConv } = await supabase
        .from("conversaciones")
        .select("id")
        .eq("publicacion_id", publicacionId)
        .or(`and(usuario1_id.eq.${profile.id},usuario2_id.eq.${otroUsuarioId}),and(usuario1_id.eq.${otroUsuarioId},usuario2_id.eq.${profile.id})`)
        .maybeSingle()

      if (existingConv) {
        window.location.href = `/chat/${existingConv.id}`
        return
      }

      const { data: newConv, error } = await supabase
        .from("conversaciones")
        .insert({
          publicacion_id: publicacionId,
          usuario1_id: profile.id,
          usuario2_id: otroUsuarioId,
        })
        .select()
        .single()

      if (error) throw error
      window.location.href = `/chat/${newConv.id}`
    } catch (error) {
      alert("Error al crear el chat")
    }
  }

  const handleViewProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) {
      setSelectedProfile(data)
      setShowProfileModal(true)
    }
  }

  const handleWhatsApp = (telefono: string, nombre: string) => {
    if (!telefono) {
      alert("Usuario sin teléfono configurado")
      return
    }
    
    let cleanNumber = telefono.replace(/[\s\-\(\)\+]/g, '')
    if (!cleanNumber.startsWith('56') && cleanNumber.length === 9) {
      cleanNumber = '56' + cleanNumber
    }
    
    const message = encodeURIComponent(`Hola ${nombre}, vi tu publicación en BuscaTuEquipo.`)
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank')
  }

  const clearFilters = () => {
    setFilterPosicion("")
    setFilterEdadMin("")
    setFilterEdadMax("")
    setFilterUbicacion("")
    setFilterDisponibilidad("")
    setSearchTerm("")
  }

  const hasActiveFilters = () => {
    return filterPosicion || filterEdadMin || filterEdadMax || filterUbicacion || filterDisponibilidad
  }

  // Obtener valores únicos para los filtros
    const getUniqueValues = (field: keyof NonNullable<Publicacion["profiles"]>) => {
      const values = publicaciones
        .map(pub => pub.profiles?.[field])
        .filter((value): value is string => value !== null && value !== undefined && value !== "")
      return [...new Set(values)].sort()
    }

  const posiciones = ["Portero", "Defensa", "Mediocampista", "Delantero"]
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
  const ubicaciones = getUniqueValues("ubicacion")

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando publicaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
        <h3 className="text-red-900 font-bold mb-2 text-lg">Error al cargar</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button onClick={loadPublicaciones} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  const filteredPublicaciones = publicaciones
    .filter((pub) => {
      // IMPORTANTE: Filtrar por tipo de publicación según el rol
      // Si eres JUGADOR → ves publicaciones de CLUBES (busco_jugador)
      // Si eres CLUB → ves publicaciones de JUGADORES (busco_equipo)
      if (profile.rol === "jugador") {
        // Eres jugador, ves clubes que buscan jugadores
        if (pub.publication_type !== "busco_jugador") return false
      } else {
        // Eres club, ves jugadores que buscan equipo
        if (pub.publication_type !== "busco_equipo") return false
      }
      
      // Búsqueda por texto
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          pub.title.toLowerCase().includes(searchLower) ||
          pub.content.toLowerCase().includes(searchLower) ||
          pub.profiles?.nombre_completo?.toLowerCase().includes(searchLower) ||
          pub.profiles?.nombre_club?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Filtro de ubicación - APLICABLE A AMBOS ROLES
      if (filterUbicacion && pub.profiles?.ubicacion !== filterUbicacion) return false

      // Filtros para cuando eres CLUB buscando JUGADORES
      if (profile.rol === "club") {
        // Filtrar por posición del jugador
        if (filterPosicion && pub.profiles?.posicion !== filterPosicion) return false
        
        // Filtrar por edad del jugador - CON DEBUG
        if (filterEdadMin) {
          const minEdad = parseInt(filterEdadMin)
          if (!pub.profiles?.edad || pub.profiles.edad < minEdad) {
            return false
          }
        }
        
        if (filterEdadMax) {
          const maxEdad = parseInt(filterEdadMax)
          if (!pub.profiles?.edad || pub.profiles.edad > maxEdad) {
            return false
          }
        }
        
        // Filtrar por disponibilidad del jugador
        if (filterDisponibilidad && pub.profiles?.disponibilidad) {
          if (!pub.profiles.disponibilidad.includes(filterDisponibilidad)) return false
        }
      }

      // NO hay filtros para jugadores (categoría eliminada porque todos son amateur)

      return true
    })
    .sort((a, b) => {
      if (sortBy === "reciente") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
    })

  const totalPublicaciones = publicaciones.filter((pub) =>
    profile.rol === "jugador"
      ? pub.publication_type === "busco_jugador"  // Jugador ve clubes
      : pub.publication_type === "busco_equipo"   // Club ve jugadores
  ).length

  return (
    <div>
      {/* Header elegante */}
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            {profile.rol === "jugador" ? "Clubes Buscando Jugadores" : "Jugadores Buscando Equipo"}
          </h2>
          <p className="text-slate-600">Encuentra tu próxima oportunidad</p>
        </div>
        
        {/* Búsqueda y filtros */}
        <div className="space-y-4">
          <div className="flex gap-3">
            {/* Barra de búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por título, descripción o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3.5 rounded-xl font-semibold transition-all shadow-sm flex items-center gap-2 ${
                showFilters || hasActiveFilters()
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={20} />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters() && (
                <span className="bg-white text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {[filterPosicion, filterEdadMin, filterEdadMax, filterUbicacion, filterDisponibilidad].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros expandible */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Filter size={18} />
                      Filtros de búsqueda
                    </h3>
                    {hasActiveFilters() && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                      >
                        <X size={16} />
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Filtro de ubicación - DISPONIBLE PARA AMBOS ROLES */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Ubicación</label>
                      <select
                        value={filterUbicacion}
                        onChange={(e) => setFilterUbicacion(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Todas las ubicaciones</option>
                        {ubicaciones.map(ubi => (
                          <option key={ubi} value={ubi}>{ubi}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtros para CLUBES buscando JUGADORES */}
                    {profile.rol === "club" && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Posición del jugador</label>
                          <select
                            value={filterPosicion}
                            onChange={(e) => setFilterPosicion(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          >
                            <option value="">Todas las posiciones</option>
                            {posiciones.map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Edad mínima</label>
                          <input
                            type="number"
                            placeholder="Ej: 18"
                            value={filterEdadMin}
                            onChange={(e) => setFilterEdadMin(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Edad máxima</label>
                          <input
                            type="number"
                            placeholder="Ej: 30"
                            value={filterEdadMax}
                            onChange={(e) => setFilterEdadMax(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Disponibilidad</label>
                          <select
                            value={filterDisponibilidad}
                            onChange={(e) => setFilterDisponibilidad(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          >
                            <option value="">Cualquier día</option>
                            {diasSemana.map(dia => (
                              <option key={dia} value={dia}>{dia}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Filtros para JUGADORES buscando CLUBES */}
                    {/* Nota: Categoría eliminada porque todos los clubes son amateur */}

                    {/* Ordenar por - DISPONIBLE PARA AMBOS */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Ordenar por</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "reciente" | "antiguo")}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="reciente">Más recientes</option>
                        <option value="antiguo">Más antiguos</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              Mostrando <span className="font-bold text-slate-900">{filteredPublicaciones.length}</span> de{" "}
              <span className="font-bold text-slate-900">{totalPublicaciones}</span> publicaciones
            </p>
            {hasActiveFilters() && (
              <p className="text-emerald-600 font-semibold">
                {[filterPosicion, filterEdadMin, filterEdadMax, filterUbicacion, filterDisponibilidad].filter(Boolean).length} filtro(s) activo(s)
              </p>
            )}
          </div>
        </div>
      </div>

      {filteredPublicaciones.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            {searchTerm || hasActiveFilters() ? "Sin resultados" : "No hay publicaciones"}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || hasActiveFilters()
              ? "Intenta ajustar los filtros o términos de búsqueda"
              : "Aún no hay publicaciones disponibles"}
          </p>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPublicaciones.map((pub) => (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Header card elegante */}
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {pub.profiles?.foto_url || pub.profiles?.logo_url ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white flex-shrink-0">
                        <Image
                          src={pub.profiles.foto_url || pub.profiles.logo_url || ""}
                          alt="Avatar"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ring-2 ring-white flex-shrink-0">
                        {pub.profiles?.rol === "jugador" ? <User size={22} className="text-slate-600" /> : <Users size={22} className="text-slate-600" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-900 truncate">
                          {pub.profiles?.nombre_completo || pub.profiles?.nombre_club || "Usuario"}
                        </p>
                        {pub.profiles?.rol === "club" && pub.profiles?.verified && (
                          <VerifiedBadge verified={pub.profiles.verified} size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center mt-0.5">
                        <Calendar size={12} className="mr-1" />
                        {new Date(pub.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Botones mejorados para tu publicación */}
                  {pub.user_id === profile.id && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActiva(pub.id, pub.activa !== false)}
                        className={`p-2 rounded-lg transition-all ${
                          pub.activa !== false 
                            ? "bg-amber-100 hover:bg-amber-200 text-amber-700" 
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                        }`}
                        title={pub.activa !== false ? "Pausar publicación" : "Reactivar publicación"}
                      >
                        {pub.activa !== false ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(pub.id)}
                        className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all"
                        title="Eliminar publicación"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  pub.publication_type === "busco_equipo" 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}>
                  {pub.publication_type === "busco_equipo" ? "🏃 Busco Equipo" : "🏆 Busco Jugador"}
                </span>
              </div>

              {/* Contenido */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-900 mb-3 line-clamp-2 leading-snug">
                  {pub.title}
                </h3>

                <p className="text-slate-600 text-sm mb-5 line-clamp-3 leading-relaxed">
                  {pub.content}
                </p>

                {/* Acciones mejoradas */}
                {pub.user_id === profile.id ? (
                  <div className={`px-4 py-3 rounded-xl text-center text-sm font-semibold border ${
                    pub.activa !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {pub.activa !== false ? "✓ Publicación activa" : "⏸ Publicación pausada"}
                  </div>
                ) : pub.activa === false ? (
                  <div className="px-4 py-3 rounded-xl text-center text-sm font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    Publicación no disponible
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button 
                      onClick={() => handleViewProfile(pub.user_id)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center space-x-2"
                    >
                      <Eye size={18} />
                      <span>Ver Perfil Completo</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleStartChat(pub.id, pub.user_id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
                      >
                        <MessageSquare size={16} />
                        <span>Chat</span>
                      </button>
                      <button 
                        onClick={() => handleWhatsApp(
                          pub.profiles?.telefono || '',
                          pub.profiles?.nombre_completo || pub.profiles?.nombre_club || 'Usuario'
                        )}
                        className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
                      >
                        <Phone size={16} />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Perfil elegante */}
      {showProfileModal && selectedProfile && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowProfileModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header modal */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white relative">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all"
              >
                ✕
              </button>
              <div className="flex items-center space-x-4">
                {selectedProfile.foto_url || selectedProfile.logo_url ? (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white/30">
                    <Image
                      src={selectedProfile.foto_url || selectedProfile.logo_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 ring-4 ring-white/30 flex items-center justify-center">
                    {selectedProfile.rol === "jugador" ? <User size={36} className="text-white" /> : <Users size={36} className="text-white" />}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold">
                      {selectedProfile.nombre_completo || selectedProfile.nombre_club}
                    </h2>
                    {selectedProfile.rol === "club" && selectedProfile.verified && (
                      <VerifiedBadge 
                        verified={selectedProfile.verified} 
                        size="lg"
                      />
                    )}
                  </div>
                  <p className="text-emerald-100">
                    {selectedProfile.rol === "jugador" ? selectedProfile.posicion : selectedProfile.categoria}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-8">
              {selectedProfile.rol === "jugador" ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Edad</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedProfile.edad}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Posición</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedProfile.posicion}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Pierna</p>
                      <p className="text-2xl font-bold text-slate-900 capitalize">{selectedProfile.pierna}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Altura/Peso</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedProfile.altura}/{selectedProfile.peso}</p>
                    </div>
                  </div>

                  {selectedProfile.experiencia && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Experiencia</p>
                      <p className="text-slate-700 leading-relaxed">{selectedProfile.experiencia}</p>
                    </div>
                  )}

                  {selectedProfile.disponibilidad?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-3">Disponibilidad</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.disponibilidad.map((dia: string) => (
                          <span key={dia} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
                            {dia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Ubicación</p>
                      <p className="font-semibold text-slate-900">{selectedProfile.ubicacion}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1 font-medium">Categoría</p>
                      <p className="font-semibold text-slate-900">{selectedProfile.categoria}</p>
                    </div>
                  </div>

                  {selectedProfile.descripcion && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Sobre el Club</p>
                      <p className="text-slate-700 leading-relaxed">{selectedProfile.descripcion}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedProfile.telefono && (
                <button
                  onClick={() => {
                    handleWhatsApp(selectedProfile.telefono, selectedProfile.nombre_completo || selectedProfile.nombre_club)
                    setShowProfileModal(false)
                  }}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <Phone size={20} />
                  <span>Contactar por WhatsApp</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}