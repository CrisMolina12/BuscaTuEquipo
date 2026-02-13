"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Calendar, Trash2, Eye, Pause, Play, FileText, CheckCircle, PauseCircle } from "lucide-react"

interface Profile {
  rol: "jugador" | "club"
  id: string
}

interface Publicacion {
  id: string
  title: string
  content: string
  publication_type: string
  created_at: string
  activa: boolean
}

export default function MisPublicacionesTab({ profile }: { profile: Profile }) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ activas: 0, pausadas: 0, total: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadMisPublicaciones()
  }, [])

  const loadMisPublicaciones = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("publicaciones")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setPublicaciones(data || [])
      
      const activas = data?.filter(p => p.activa !== false).length || 0
      const pausadas = data?.filter(p => p.activa === false).length || 0
      setStats({
        activas,
        pausadas,
        total: data?.length || 0
      })
    } catch (error) {
      console.error("Error loading publicaciones:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("publicaciones")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Error al eliminar la publicacion")
    } else {
      setDeleteConfirm(null)
      loadMisPublicaciones()
    }
  }

  const handleToggleActiva = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("publicaciones")
      .update({ activa: !currentState })
      .eq("id", id)

    if (!error) {
      loadMisPublicaciones()
    }
  }

  const handleViewStats = async (id: string) => {
    alert("Funcion de estadisticas proximamente")
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs sm:text-sm text-slate-500">Cargando publicaciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Mis Publicaciones</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Gestiona tus publicaciones activas y pausadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
            <FileText size={16} className="text-slate-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
            <CheckCircle size={16} className="text-emerald-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.activas}</p>
          <p className="text-xs text-slate-500">Activas</p>
        </div>
        <div className="bg-amber-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
            <PauseCircle size={16} className="text-amber-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pausadas}</p>
          <p className="text-xs text-slate-500">Pausadas</p>
        </div>
      </div>

      {/* Lista de publicaciones */}
      {publicaciones.length === 0 ? (
        <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-8 sm:p-10 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <FileText size={24} className="text-slate-400 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-1">No tienes publicaciones</h3>
          <p className="text-xs sm:text-sm text-slate-500">Crea tu primera publicacion para empezar a conectar</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {publicaciones.map((pub, index) => (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg sm:rounded-xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Contenido principal */}
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                  <h3 className="font-semibold text-sm sm:text-base text-slate-800 flex-1 line-clamp-1">{pub.title}</h3>
                  <span className={`shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                    pub.activa !== false
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {pub.activa !== false ? "Activa" : "Pausada"}
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-2 sm:mb-3">{pub.content}</p>
                
                <div className="flex items-center text-xs text-slate-400">
                  <Calendar size={11} className="mr-1.5 sm:w-3 sm:h-3" />
                  {new Date(pub.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>

              {/* Aviso de pausada */}
              {pub.activa === false && (
                <div className="bg-amber-50 px-3 sm:px-4 py-2 sm:py-2.5 border-t border-amber-100">
                  <p className="text-xs text-amber-700">
                    Esta publicacion no es visible para otros usuarios
                  </p>
                </div>
              )}

              {/* Acciones */}
              <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                <button
                  onClick={() => handleToggleActiva(pub.id, pub.activa !== false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                    pub.activa !== false
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {pub.activa !== false ? <Pause size={14} className="sm:w-4 sm:h-4" /> : <Play size={14} className="sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{pub.activa !== false ? "Pausar" : "Activar"}</span>
                  <span className="sm:hidden">{pub.activa !== false ? "Pausar" : "Activar"}</span>
                </button>

                <button
                  onClick={() => handleViewStats(pub.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Eye size={14} className="sm:w-4 sm:h-4" />
                  <span>Stats</span>
                </button>

                <button
                  onClick={() => setDeleteConfirm(pub.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                  <span className="sm:hidden">Borrar</span>
                </button>
              </div>

              {/* Confirmacion de eliminar */}
              {deleteConfirm === pub.id && (
                <div className="bg-red-50 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-red-100">
                  <p className="text-xs sm:text-sm text-red-700 mb-2 sm:mb-3">Seguro que quieres eliminar esta publicacion?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(pub.id)}
                      className="flex-1 bg-red-500 text-white text-xs sm:text-sm font-medium py-1.5 sm:py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Si, eliminar
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 bg-white text-slate-600 text-xs sm:text-sm font-medium py-1.5 sm:py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}