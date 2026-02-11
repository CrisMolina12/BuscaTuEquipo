"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { CheckCircle2, XCircle, Clock, FileText, User, MapPin, Phone, Calendar, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

interface VerificationRequest {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  club_legal_name: string
  club_address: string
  contact_person: string
  contact_phone: string
  document_type: string
  document_url: string
  additional_info: string
  created_at: string
  profiles: {
    nombre_club: string
    logo_url: string
    ubicacion: string
    telefono: string
  }
}

export default function VerificationAdmin() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
  const [processing, setProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("verification_requests")
        .select(`
          *,
          profiles (
            nombre_club,
            logo_url,
            ubicacion,
            telefono
          )
        `)
        .order("created_at", { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error("Error loading requests:", error)
      alert("Error al cargar solicitudes")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm("¿Aprobar esta solicitud de verificación?")) return

    setProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autorizado")

      const { error } = await supabase.rpc('approve_verification', {
        request_id: requestId,
        admin_id: user.id
      })

      if (error) throw error

      alert("✅ Solicitud aprobada correctamente")
      setSelectedRequest(null)
      loadRequests()
    } catch (error: any) {
      console.error(error)
      alert("❌ Error al aprobar: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert("⚠️ Debes especificar un motivo de rechazo")
      return
    }

    if (!confirm("¿Rechazar esta solicitud?")) return

    setProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autorizado")

      const { error } = await supabase.rpc('reject_verification', {
        request_id: requestId,
        admin_id: user.id,
        reason: rejectionReason
      })

      if (error) throw error

      alert("✅ Solicitud rechazada")
      setSelectedRequest(null)
      setRejectionReason("")
      loadRequests()
    } catch (error: any) {
      console.error(error)
      alert("❌ Error al rechazar: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
            <Clock size={14} />
            Pendiente
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            <CheckCircle2 size={14} />
            Aprobada
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            <XCircle size={14} />
            Rechazada
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Panel de Verificación</h1>
          <p className="text-slate-600">Revisa y aprueba solicitudes de verificación de clubes</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Aprobadas
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Rechazadas
            </button>
          </div>
        </div>

        {/* Lista de solicitudes */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando solicitudes...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay solicitudes</h3>
            <p className="text-slate-600">
              {filter === 'pending' ? 'No hay solicitudes pendientes' : `No hay solicitudes ${filter === 'approved' ? 'aprobadas' : 'rechazadas'}`}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {request.profiles?.logo_url ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-slate-200">
                          <Image
                            src={request.profiles.logo_url}
                            alt="Logo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <User size={24} className="text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900">{request.profiles?.nombre_club}</h3>
                        <p className="text-xs text-slate-500">{request.club_legal_name}</p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={14} />
                      <span>{request.club_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={14} />
                      <span>{request.contact_person}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} />
                      <span>{request.contact_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={14} />
                      <span>
                        {new Date(request.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-all text-sm">
                        Revisar Solicitud →
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal de detalle */}
        {selectedRequest && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Detalle de Solicitud</h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2"
                  >
                    ✕
                  </button>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6">
                {/* Información del club */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Información del Club</h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Nombre en Perfil</p>
                      <p className="text-slate-900">{selectedRequest.profiles?.nombre_club}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Nombre Legal</p>
                      <p className="text-slate-900">{selectedRequest.club_legal_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Dirección</p>
                      <p className="text-slate-900">{selectedRequest.club_address}</p>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Información de Contacto</h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Persona de Contacto</p>
                      <p className="text-slate-900">{selectedRequest.contact_person}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Teléfono</p>
                      <p className="text-slate-900">{selectedRequest.contact_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Documento */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Documento de Verificación</h3>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Tipo: {selectedRequest.document_type}
                    </p>
                    <a
                      href={selectedRequest.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      <FileText size={18} />
                      Ver Documento
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Info adicional */}
                {selectedRequest.additional_info && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Información Adicional</h3>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-slate-700">{selectedRequest.additional_info}</p>
                    </div>
                  </div>
                )}

                {/* Acciones (solo si está pendiente) */}
                {selectedRequest.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Motivo de Rechazo (opcional)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Solo si vas a rechazar la solicitud..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processing}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
                      >
                        {processing ? "Procesando..." : "Rechazar"}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
                      >
                        {processing ? "Procesando..." : "✓ Aprobar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}