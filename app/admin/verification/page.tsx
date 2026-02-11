"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Clock, FileText, User, MapPin, Phone, Calendar, ExternalLink, Search, Download, Shield, AlertCircle, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
  reviewed_at?: string
  rejection_reason?: string
  reviewed_by?: string
  user?: {
    nombre_club: string
    logo_url: string
    ubicacion: string
    telefono: string
    email: string
  }
  profiles?: {
    nombre_club: string
    logo_url: string
    ubicacion: string
    telefono: string
    email: string
  }
}

const getProfile = (request: VerificationRequest) => {
  return request.profiles || request.user || {
    nombre_club: '',
    logo_url: '',
    ubicacion: '',
    telefono: '',
    email: ''
  }
}

export default function AdminVerificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [adminData, setAdminData] = useState<any>(null)
  const [adminCheckError, setAdminCheckError] = useState<string>("")

  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<VerificationRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
  const [processing, setProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isAdmin && adminData) {
      loadRequests()
    }
  }, [isAdmin, adminData])

  useEffect(() => {
    filterAndSearchRequests()
  }, [requests, filter, searchTerm])

  const checkAdmin = async () => {
    try {
      console.log("🔐 Verificando permisos de administrador...")
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.log("❌ Usuario no autenticado")
        router.push("/login")
        return
      }

      setCurrentUser(user)
      console.log("✓ Usuario autenticado:", user.email)

      // MÉTODO PREFERIDO: Usar función RPC (evita problemas de RLS)
      try {
        console.log("📡 Verificando via RPC...")
        const { data: isAdminRPC, error: rpcError } = await supabase
          .rpc('check_is_admin', { check_user_id: user.id })

        if (rpcError) {
          console.warn("⚠️ RPC no disponible:", rpcError.message)
          throw rpcError
        }

        if (isAdminRPC === true) {
          console.log("✅ Acceso de administrador confirmado (vía RPC)")
          setAdminData({ role: 'admin', user_id: user.id, method: 'rpc' })
          setIsAdmin(true)
          setLoading(false)
          return
        } else {
          console.log("❌ Usuario no es administrador")
          setIsAdmin(false)
          setLoading(false)
          return
        }
        
      } catch (rpcErr: any) {
        console.log("⚠️ Función RPC no disponible, intentando consulta directa...")
        
        const { data: adminData, error: adminError } = await supabase
          .from("admins")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (adminError) {
          console.error("❌ Error al consultar tabla admins:", adminError.message)
          
          if (adminError.message.includes("infinite recursion")) {
            setAdminCheckError(
              "Error de configuración: Recursión infinita en políticas RLS. " +
              "Ejecuta el archivo 'fix-admin-rls.sql' en Supabase SQL Editor."
            )
          } else if (adminError.code === '42P01') {
            setAdminCheckError("La tabla 'admins' no existe. Ejecuta el archivo 'fix-admin-rls.sql'.")
          } else if (adminError.code === '42883') {
            setAdminCheckError("La función 'check_is_admin' no existe. Ejecuta el archivo 'fix-admin-rls.sql'.")
          } else {
            setAdminCheckError(`Error: ${adminError.message}`)
          }
          
          setIsAdmin(false)
          setLoading(false)
          return
        }

        if (!adminData) {
          console.log("❌ Usuario no encontrado en tabla admins")
          setIsAdmin(false)
          setLoading(false)
          return
        }

        console.log("✅ Acceso confirmado (consulta directa)")
        setAdminData(adminData)
        setIsAdmin(true)
      }
      
    } catch (error: any) {
      console.error("❌ Error crítico:", error)
      setAdminCheckError(`Error crítico: ${error.message || 'Error desconocido'}`)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      console.log("📋 Cargando solicitudes...")

      const { data, error } = await supabase
        .from("verification_requests")
        .select(`
          *,
          profiles:user_id (
            nombre_club,
            logo_url,
            ubicacion,
            telefono,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("⚠️ Error en consulta con join:", error.message)
        
        const { data: basicData, error: basicError } = await supabase
          .from("verification_requests")
          .select("*")
          .order("created_at", { ascending: false })

        if (basicError) throw basicError

        const requestsWithProfiles = await Promise.all(
          (basicData || []).map(async (request) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("nombre_club, logo_url, ubicacion, telefono, email")
              .eq("id", request.user_id)
              .single()

            return {
              ...request,
              profiles: profile || null
            } as VerificationRequest
          })
        )

        setRequests(requestsWithProfiles)
        calculateStats(requestsWithProfiles)
      } else {
        setRequests(data || [])
        calculateStats(data || [])
      }
      
      console.log("✅ Solicitudes cargadas")
      
    } catch (error: any) {
      console.error("❌ Error al cargar solicitudes:", error)
      alert(`❌ Error: ${error.message}`)
      setRequests([])
      setFilteredRequests([])
    }
  }

  const calculateStats = (data: VerificationRequest[]) => {
    setStats({
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length
    })
  }

  const filterAndSearchRequests = () => {
    let filtered = requests

    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(r => 
        r.club_legal_name.toLowerCase().includes(search) ||
        getProfile(r)?.nombre_club?.toLowerCase().includes(search) ||
        r.contact_person.toLowerCase().includes(search) ||
        r.club_address.toLowerCase().includes(search)
      )
    }

    setFilteredRequests(filtered)
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm("¿Aprobar esta solicitud de verificación?")) return

    setProcessing(true)
    try {
      const { error } = await supabase.rpc('approve_verification', {
        request_id: requestId,
        admin_id: currentUser.id
      })

      if (error) throw error

      alert("✅ Solicitud aprobada correctamente")
      setSelectedRequest(null)
      await loadRequests()
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
      const { error } = await supabase.rpc('reject_verification', {
        request_id: requestId,
        admin_id: currentUser.id,
        reason: rejectionReason
      })

      if (error) throw error

      alert("✅ Solicitud rechazada")
      setSelectedRequest(null)
      setRejectionReason("")
      await loadRequests()
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold border border-amber-200">
            <Clock size={14} />
            Pendiente
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
            <CheckCircle2 size={14} />
            Aprobada
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold border border-red-200">
            <XCircle size={14} />
            Rechazada
          </span>
        )
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Fecha', 'Club', 'Nombre Legal', 'Contacto', 'Teléfono', 'Estado', 'Fecha Revisión'].join(','),
      ...filteredRequests.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        getProfile(r)?.nombre_club || '',
        r.club_legal_name,
        r.contact_person,
        r.contact_phone,
        r.status,
        r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `verificaciones-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold text-lg">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <Lock size={40} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Acceso Restringido</h1>
            <p className="text-slate-600 mb-6">
              No tienes permisos de administrador para acceder a esta página.
            </p>
            
            {adminCheckError && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Error Técnico:</p>
                    <p className="text-sm text-amber-800 mb-3">{adminCheckError}</p>
                    
                    {adminCheckError.includes("fix-admin-rls.sql") && (
                      <div className="bg-white rounded-lg p-3 border border-amber-300">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Solución:</p>
                        <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                          <li>Descarga el archivo SQL generado</li>
                          <li>Ve a Supabase Dashboard → SQL Editor</li>
                          <li>Pega y ejecuta el código SQL</li>
                          <li>Recarga esta página</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-6">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Solo usuarios con rol de administrador</span> pueden acceder al panel de verificación.
              </p>
            </div>
            
            <button
              onClick={() => router.push("/home")}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-lg"
            >
              Volver al Inicio
            </button>
            
            <p className="text-sm text-slate-500 mt-4">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Verificación</h1>
              <p className="text-slate-600">Gestiona las solicitudes de verificación de clubes</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
                  {adminData?.role || 'Admin'}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-600 mb-1">Total</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-4">
              <p className="text-sm font-semibold text-amber-700 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-amber-900">{stats.pending}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl shadow-sm border border-emerald-200 p-4">
              <p className="text-sm font-semibold text-emerald-700 mb-1">Aprobadas</p>
              <p className="text-3xl font-bold text-emerald-900">{stats.approved}</p>
            </div>
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Rechazadas</p>
              <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por club, contacto, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas ({stats.total})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'pending'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                Pendientes ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'approved'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                Aprobadas ({stats.approved})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'rejected'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Rechazadas ({stats.rejected})
              </button>
              
              <button
                onClick={exportToCSV}
                className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <Download size={18} />
                <span className="hidden md:inline">Exportar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Solicitudes */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {searchTerm ? "Sin resultados" : "No hay solicitudes"}
            </h3>
            <p className="text-slate-600">
              {searchTerm 
                ? "Intenta con otros términos de búsqueda" 
                : filter === 'pending' 
                  ? 'No hay solicitudes pendientes de revisión'
                  : `No hay solicitudes ${filter === 'approved' ? 'aprobadas' : 'rechazadas'}`
              }
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getProfile(request)?.logo_url ? (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-slate-200 flex-shrink-0">
                            <Image
                              src={getProfile(request).logo_url}
                              alt="Logo"
                              width={56}
                              height={56}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ring-2 ring-slate-200 flex-shrink-0">
                            <User size={28} className="text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate text-lg">
                            {getProfile(request)?.nombre_club}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">{request.club_legal_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{request.club_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} className="flex-shrink-0" />
                        <span className="truncate">{request.contact_person}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="flex-shrink-0" />
                        <span>{request.contact_phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="flex-shrink-0" />
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
                      <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl font-semibold transition-all shadow-sm group-hover:shadow-lg flex items-center justify-center gap-2">
                        Revisar Solicitud
                        <ExternalLink size={16} />
                      </button>
                    )}
                    
                    {request.status === 'approved' && (
                      <div className="text-center text-sm text-emerald-700 font-semibold py-2">
                        Aprobada el {new Date(request.reviewed_at!).toLocaleDateString('es-ES')}
                      </div>
                    )}
                    
                    {request.status === 'rejected' && (
                      <div className="text-center text-sm text-red-700 font-semibold py-2">
                        Rechazada el {new Date(request.reviewed_at!).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal de Detalle */}
        <AnimatePresence>
          {selectedRequest && (
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
              onClick={() => setSelectedRequest(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* Header del Modal */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white sticky top-0 z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Detalle de Solicitud</h2>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {getProfile(selectedRequest)?.logo_url && (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white/30">
                        <Image
                          src={getProfile(selectedRequest).logo_url}
                          alt="Logo"
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{getProfile(selectedRequest)?.nombre_club}</h3>
                      <p className="text-emerald-100 text-sm">{selectedRequest.club_legal_name}</p>
                    </div>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                {/* Contenido del Modal */}
                <div className="p-6 space-y-6">
                  {/* Información del Club */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <User size={18} className="text-slate-700" />
                      </div>
                      Información del Club
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Nombre en Perfil</p>
                          <p className="text-slate-900 font-medium">{getProfile(selectedRequest)?.nombre_club}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Nombre Legal</p>
                          <p className="text-slate-900 font-medium">{selectedRequest.club_legal_name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Dirección</p>
                        <p className="text-slate-900 font-medium">{selectedRequest.club_address}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Ubicación en Perfil</p>
                        <p className="text-slate-900 font-medium">{getProfile(selectedRequest)?.ubicacion}</p>
                      </div>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Phone size={18} className="text-slate-700" />
                      </div>
                      Información de Contacto
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Persona de Contacto</p>
                          <p className="text-slate-900 font-medium">{selectedRequest.contact_person}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Teléfono</p>
                          <p className="text-slate-900 font-medium">{selectedRequest.contact_phone}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Email</p>
                        <p className="text-slate-900 font-medium">{getProfile(selectedRequest)?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documento */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <FileText size={18} className="text-slate-700" />
                      </div>
                      Documento de Verificación
                    </h3>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-3">
                        Tipo: {selectedRequest.document_type}
                      </p>
                      <a
                        href={selectedRequest.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-lg"
                      >
                        <FileText size={18} />
                        Ver Documento
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Información Adicional */}
                  {selectedRequest.additional_info && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <AlertCircle size={18} className="text-slate-700" />
                        </div>
                        Información Adicional
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-slate-700 leading-relaxed">{selectedRequest.additional_info}</p>
                      </div>
                    </div>
                  )}

                  {/* Motivo de rechazo */}
                  {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                    <div>
                      <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <XCircle size={18} className="text-red-700" />
                        </div>
                        Motivo de Rechazo
                      </h3>
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <p className="text-red-800 leading-relaxed">{selectedRequest.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-4 pt-4 border-t-2 border-slate-200">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Motivo de Rechazo (opcional - solo si vas a rechazar)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Ej: El documento no es legible. Por favor sube una imagen más clara."
                          rows={4}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleReject(selectedRequest.id)}
                          disabled={processing}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-sm hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <XCircle size={20} />
                              Rechazar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={processing}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-sm hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={20} />
                              Aprobar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}