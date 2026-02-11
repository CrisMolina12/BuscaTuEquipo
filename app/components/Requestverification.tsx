"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Upload, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface VerificationRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  club_legal_name: string
  created_at: string
  reviewed_at?: string
  rejection_reason?: string
}

export default function RequestVerification({ profile }: { profile: any }) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [existingRequest, setExistingRequest] = useState<VerificationRequest | null>(null)

  // Campos del formulario
  const [clubLegalName, setClubLegalName] = useState("")
  const [clubAddress, setClubAddress] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [documentType, setDocumentType] = useState("RUT")
  const [documentUrl, setDocumentUrl] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")

  useEffect(() => {
    loadExistingRequest()
  }, [])

  const loadExistingRequest = async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setExistingRequest(data)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF o imágenes (JPG, PNG)')
      return
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo debe ser menor a 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `verification-${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `verification-documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)

      setDocumentUrl(publicUrl)
      alert('✅ Documento subido correctamente')
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('❌ Error al subir el documento')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!documentUrl) {
      alert("⚠️ Debes subir un documento de verificación")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: profile.id,
          club_legal_name: clubLegalName,
          club_address: clubAddress,
          contact_person: contactPerson,
          contact_phone: contactPhone,
          document_type: documentType,
          document_url: documentUrl,
          additional_info: additionalInfo,
          status: 'pending'
        })

      if (error) throw error

      alert("✅ Solicitud de verificación enviada correctamente")
      setShowForm(false)
      loadExistingRequest()
    } catch (error: any) {
      console.error(error)
      alert("❌ Error al enviar solicitud: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Si ya está verificado
  if (profile.verified) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <CheckCircle2 size={32} className="text-blue-600" fill="currentColor" />
          <h3 className="text-xl font-bold text-blue-900">Club Verificado</h3>
        </div>
        <p className="text-center text-blue-700 mb-2">
          Tu club ha sido verificado exitosamente
        </p>
        <p className="text-center text-sm text-blue-600">
          Verificado el {new Date(profile.verified_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>
    )
  }

  // Si tiene solicitud pendiente
  if (existingRequest?.status === 'pending') {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Clock size={32} className="text-amber-600" />
          <h3 className="text-xl font-bold text-amber-900">Solicitud en Revisión</h3>
        </div>
        <p className="text-center text-amber-700 mb-2">
          Tu solicitud de verificación está siendo revisada
        </p>
        <p className="text-center text-sm text-amber-600">
          Enviada el {new Date(existingRequest.created_at).toLocaleDateString('es-ES')}
        </p>
        <div className="mt-4 bg-white/50 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Club:</strong> {existingRequest.club_legal_name}
          </p>
        </div>
      </div>
    )
  }

  // Si fue rechazada
  if (existingRequest?.status === 'rejected') {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <XCircle size={32} className="text-red-600" />
          <h3 className="text-xl font-bold text-red-900">Solicitud Rechazada</h3>
        </div>
        <p className="text-center text-red-700 mb-3">
          Tu solicitud fue rechazada
        </p>
        {existingRequest.rejection_reason && (
          <div className="bg-white/50 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-red-800 mb-1">Motivo:</p>
            <p className="text-sm text-red-700">{existingRequest.rejection_reason}</p>
          </div>
        )}
        <button
          onClick={() => {
            setExistingRequest(null)
            setShowForm(true)
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all"
        >
          Solicitar Nuevamente
        </button>
      </div>
    )
  }

  // Formulario de solicitud
  if (showForm) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Solicitar Verificación</h3>
          <button
            onClick={() => setShowForm(false)}
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre Legal del Club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clubLegalName}
              onChange={(e) => setClubLegalName(e.target.value)}
              placeholder="Ej: Club Deportivo Los Tigres SpA"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Dirección del Club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clubAddress}
              onChange={(e) => setClubAddress(e.target.value)}
              placeholder="Ej: Av. Principal 123, Santiago"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Persona de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Nombre completo"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Teléfono de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="56912345678"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tipo de Documento <span className="text-red-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="RUT">RUT/Cédula Jurídica</option>
              <option value="Estatutos">Estatutos del Club</option>
              <option value="Certificado">Certificado de Existencia</option>
              <option value="Licencia">Licencia Municipal</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Documento de Verificación <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              {documentUrl ? (
                <div className="space-y-3">
                  <FileText size={48} className="mx-auto text-green-600" />
                  <p className="text-sm text-green-700 font-semibold">✓ Documento subido</p>
                  <button
                    type="button"
                    onClick={() => setDocumentUrl("")}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Cambiar documento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={48} className="mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Sube PDF o imagen (JPG, PNG)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    disabled={uploading}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-semibold cursor-pointer transition-all"
                  >
                    {uploading ? "Subiendo..." : "Seleccionar archivo"}
                  </label>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Máximo 5MB. Formatos: PDF, JPG, PNG
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Información Adicional (opcional)
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Cualquier información adicional que quieras compartir..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">¿Por qué verificar tu club?</p>
                <ul className="space-y-1 text-blue-700">
                  <li>✓ Badge verificado en tu perfil y publicaciones</li>
                  <li>✓ Mayor confianza de los jugadores</li>
                  <li>✓ Prioridad en resultados de búsqueda</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !documentUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
          >
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </form>
      </div>
    )
  }

  // Botón inicial para mostrar formulario
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
      <div className="flex items-center justify-center gap-3 mb-4">
        <CheckCircle2 size={32} className="text-blue-600" />
        <h3 className="text-xl font-bold text-blue-900">Verifica tu Club</h3>
      </div>
      <p className="text-center text-blue-700 mb-4">
        Obtén el badge de verificación y genera más confianza
      </p>
      <ul className="space-y-2 mb-6 text-sm text-blue-800">
        <li className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-600" />
          Badge visible en perfil y publicaciones
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-600" />
          Mayor credibilidad ante jugadores
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-600" />
          Destaca sobre otros clubes
        </li>
      </ul>
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm"
      >
        Solicitar Verificación
      </button>
    </div>
  )
}