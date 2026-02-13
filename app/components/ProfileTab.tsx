// components/ProfileTab.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Edit3, Save, UserCircle2, Users, MapPin, Award, Phone, Upload, X } from "lucide-react"
import Image from "next/image"
import VerifiedBadge from "@/app/components/Verifiedbadge"
import RequestVerification from "@/app/components/Requestverification"

interface Profile {
  id: string
  rol: "jugador" | "club"
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
  verified?: boolean
  verified_at?: string
  verification_badge_type?: string
}

export default function ProfileTab({ profile, onUpdate }: { profile: Profile; onUpdate: () => void }) {
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Función para normalizar ubicación (igual formato que otros usuarios)
  const normalizeUbicacion = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Estados para edición (Jugador)
  const [nombreCompleto, setNombreCompleto] = useState(profile.nombre_completo || "")
  const [edad, setEdad] = useState(profile.edad?.toString() || "")
  const [posicion, setPosicion] = useState(profile.posicion || "")
  const [pierna, setPierna] = useState(profile.pierna || "")
  const [altura, setAltura] = useState(profile.altura?.toString() || "")
  const [peso, setPeso] = useState(profile.peso?.toString() || "")
  const [experiencia, setExperiencia] = useState(profile.experiencia || "")
  const [disponibilidad, setDisponibilidad] = useState<string[]>(profile.disponibilidad || [])
  const [telefonoJugador, setTelefonoJugador] = useState(profile.telefono || "")
  const [ubicacionJugador, setUbicacionJugador] = useState(profile.ubicacion || "")

  // Estados para edición (Club)
  const [nombreClub, setNombreClub] = useState(profile.nombre_club || "")
  const [ubicacion, setUbicacion] = useState(profile.ubicacion || "")
  const [telefono, setTelefono] = useState(profile.telefono || "")
  const [descripcion, setDescripcion] = useState(profile.descripcion || "")
  const [categoria, setCategoria] = useState(profile.categoria || "")
  
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(profile.foto_url || profile.logo_url || "")

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `${profile.rol === 'jugador' ? 'fotos' : 'logos'}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      alert('✅ Imagen subida exitosamente')
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('❌ Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    // Validaciones para jugador
    if (profile.rol === "jugador") {
      if (!nombreCompleto.trim()) {
        alert("❌ El nombre completo es obligatorio")
        return
      }
      if (!edad || parseInt(edad) < 10 || parseInt(edad) > 60) {
        alert("❌ La edad debe estar entre 10 y 60 años")
        return
      }
      if (!posicion) {
        alert("❌ Debes seleccionar una posición")
        return
      }
      if (!telefonoJugador.trim()) {
        alert("❌ El teléfono es obligatorio")
        return
      }
      if (!ubicacionJugador.trim()) {
        alert("❌ La ubicación es obligatoria")
        return
      }
      if (!altura || parseFloat(altura) < 100 || parseFloat(altura) > 250) {
        alert("❌ La altura debe estar entre 100 y 250 cm")
        return
      }
      if (!peso || parseFloat(peso) < 30 || parseFloat(peso) > 200) {
        alert("❌ El peso debe estar entre 30 y 200 kg")
        return
      }
      if (!pierna) {
        alert("❌ Debes seleccionar tu pierna hábil")
        return
      }
    }

    // Validaciones para club
    if (profile.rol === "club") {
      if (!nombreClub.trim()) {
        alert("❌ El nombre del club es obligatorio")
        return
      }
      if (!ubicacion.trim()) {
        alert("❌ La ubicación es obligatoria")
        return
      }
      if (!telefono.trim()) {
        alert("❌ El teléfono es obligatorio")
        return
      }
      if (!categoria) {
        alert("❌ Debes seleccionar una categoría")
        return
      }
    }

    setSubmitting(true)
    try {
      // Normalizar ubicación para que "Hualqui" y "hualqui" sean lo mismo
      const normalizarUbicacion = (ubi: string) => {
        return ubi
          .trim()
          .toLowerCase()
          .normalize("NFD") // Descomponer caracteres con acentos
          .replace(/[\u0300-\u036f]/g, "") // Eliminar marcas diacríticas (acentos)
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      const updateData = profile.rol === "jugador"
        ? {
            nombre_completo: nombreCompleto.trim(),
            edad: parseInt(edad),
            posicion,
            pierna,
            altura: parseFloat(altura),
            peso: parseFloat(peso),
            experiencia: experiencia.trim(),
            disponibilidad,
            foto_url: imageUrl,
            telefono: telefonoJugador.trim(),
            ubicacion: normalizarUbicacion(ubicacionJugador),
          }
        : {
            nombre_club: nombreClub.trim(),
            ubicacion: normalizarUbicacion(ubicacion),
            telefono: telefono.trim(),
            descripcion: descripcion.trim(),
            categoria,
            logo_url: imageUrl,
          }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", profile.id)

      if (error) throw error

      setEditMode(false)
      onUpdate()
      alert("✅ Perfil actualizado correctamente")
    } catch (error) {
      console.error(error)
      alert("❌ Error al actualizar el perfil")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header del perfil - más elegante */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 sm:mb-6">
        <div className="p-5 sm:p-6 lg:p-10">
          <div className="flex flex-col lg:flex-row items-start gap-5 sm:gap-6 lg:gap-8">
            {/* Avatar elegante */}
            <div className="relative group mx-auto lg:mx-0">
              {imageUrl ? (
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-xl sm:rounded-2xl overflow-hidden ring-4 ring-slate-100">
                  <Image src={imageUrl} alt="Foto" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ring-4 ring-slate-100">
                  {profile.rol === "jugador" ? (
                    <UserCircle2 size={56} className="text-slate-400 sm:w-16 sm:h-16 lg:w-[72px] lg:h-[72px]" />
                  ) : (
                    <Users size={56} className="text-slate-400 sm:w-16 sm:h-16 lg:w-[72px] lg:h-[72px]" />
                  )}
                </div>
              )}
              
              {editMode && (
                <label className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-emerald-600 hover:bg-emerald-700 p-2 sm:p-2.5 rounded-lg sm:rounded-xl cursor-pointer shadow-lg transition-colors">
                  <Upload size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 text-center lg:text-left w-full lg:w-auto">
              <div className="mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight truncate max-w-full">
                    {profile.nombre_completo || profile.nombre_club || "Usuario"}
                  </h1>
                  {profile.rol === "club" && profile.verified && (
                    <VerifiedBadge 
                      verified={profile.verified} 
                      size="lg"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs sm:text-sm font-semibold border border-emerald-200">
                    {profile.rol === "jugador" ? "⚽ Jugador" : "🏆 Club"}
                  </span>
                  {profile.rol === "jugador" && profile.posicion && (
                    <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold">
                      {profile.posicion}
                    </span>
                  )}
                  {profile.rol === "club" && profile.categoria && (
                    <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold">
                      {profile.categoria}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center lg:justify-start">
                {editMode && (
                  <button
                    onClick={() => setEditMode(false)}
                    className="inline-flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all text-sm sm:text-base"
                  >
                    <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>Cancelar</span>
                  </button>
                )}
                <button
                  onClick={() => (editMode ? handleSave() : setEditMode(true))}
                  disabled={submitting}
                  className={`inline-flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all shadow-sm text-sm sm:text-base ${
                    editMode
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {editMode ? (
                    <>
                      <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span>{submitting ? "Guardando..." : "Guardar"}</span>
                    </>
                  ) : (
                    <>
                      <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span>Editar Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats elegantes */}
        {profile.rol === "jugador" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 bg-slate-50">
            {profile.edad && (
              <div className="p-3 sm:p-4 lg:p-5 text-center border-r border-slate-200">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{profile.edad}</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Años</p>
              </div>
            )}
            {profile.altura && (
              <div className="p-3 sm:p-4 lg:p-5 text-center border-r border-slate-200 lg:border-r">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{profile.altura}</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">cm</p>
              </div>
            )}
            {profile.peso && (
              <div className="p-3 sm:p-4 lg:p-5 text-center border-r border-slate-200">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{profile.peso}</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">kg</p>
              </div>
            )}
            {profile.pierna && (
              <div className="p-3 sm:p-4 lg:p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 capitalize">{profile.pierna.charAt(0)}</p>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Pierna {profile.pierna}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido del perfil */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {profile.rol === "jugador" ? (
          <>
            {/* Información Personal */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <UserCircle2 className="text-emerald-600" size={20} />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Información Personal</h2>
              </div>
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      placeholder="Ej: Juan Pérez González"
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg break-words">{profile.nombre_completo}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                      Edad <span className="text-red-500">*</span>
                    </label>
                    {editMode ? (
                      <input
                        type="number"
                        value={edad}
                        onChange={(e) => setEdad(e.target.value)}
                        placeholder="Ej: 25"
                        min="10"
                        max="60"
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.edad} años</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                      Posición <span className="text-red-500">*</span>
                    </label>
                    {editMode ? (
                      <select
                        value={posicion}
                        onChange={(e) => setPosicion(e.target.value)}
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Portero">Portero</option>
                        <option value="Defensa">Defensa</option>
                        <option value="Mediocampista">Mediocampista</option>
                        <option value="Delantero">Delantero</option>
                      </select>
                    ) : (
                      <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.posicion}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Teléfono / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={telefonoJugador}
                      onChange={(e) => setTelefonoJugador(e.target.value)}
                      placeholder="+56912345678"
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg break-all">{profile.telefono || "No especificado"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Ubicación / Comuna <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <>
                      <input
                        type="text"
                        value={ubicacionJugador}
                        onChange={(e) => setUbicacionJugador(e.target.value)}
                        placeholder="Ej: Concepción, Hualqui, Talcahuano"
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <p className="text-xs text-slate-500 mt-1">💡 Escribe la comuna tal como la conoces</p>
                    </>
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.ubicacion || "No especificada"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Características Físicas */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Award className="text-emerald-600" size={20} />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Características</h2>
              </div>
              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                      Altura (cm) <span className="text-red-500">*</span>
                    </label>
                    {editMode ? (
                      <input
                        type="number"
                        value={altura}
                        onChange={(e) => setAltura(e.target.value)}
                        placeholder="Ej: 175"
                        min="100"
                        max="250"
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.altura} cm</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                      Peso (kg) <span className="text-red-500">*</span>
                    </label>
                    {editMode ? (
                      <input
                        type="number"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="Ej: 70"
                        min="30"
                        max="200"
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.peso} kg</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Pierna Hábil <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <select
                      value={pierna}
                      onChange={(e) => setPierna(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="derecha">Derecha</option>
                      <option value="izquierda">Izquierda</option>
                      <option value="ambas">Ambas</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg capitalize">{profile.pierna}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Experiencia */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:col-span-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Experiencia</h2>
              {editMode ? (
                <textarea
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  rows={5}
                  placeholder="Describe tu experiencia deportiva..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm sm:text-base"
                />
              ) : (
                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">{profile.experiencia || "No especificada"}</p>
              )}
            </div>

            {/* Disponibilidad */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:col-span-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Disponibilidad</h2>
              {editMode ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dia) => (
                    <label key={dia} className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200">
                      <input
                        type="checkbox"
                        checked={disponibilidad.includes(dia)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDisponibilidad([...disponibilidad, dia])
                          } else {
                            setDisponibilidad(disponibilidad.filter((d) => d !== dia))
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs sm:text-sm font-medium text-slate-700">{dia}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.disponibilidad && profile.disponibilidad.length > 0 ? (
                    profile.disponibilidad.map((dia) => (
                      <span key={dia} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-200">
                        {dia}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No especificada</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Información del Club */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Users className="text-emerald-600" size={20} />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Información del Club</h2>
              </div>
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Nombre del Club <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={nombreClub}
                      onChange={(e) => setNombreClub(e.target.value)}
                      placeholder="Ej: Club Deportivo Municipal"
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg break-words">{profile.nombre_club}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Ubicación <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <>
                      <input
                        type="text"
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value)}
                        placeholder="Ej: Concepción, Hualqui, Talcahuano"
                        required
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <p className="text-xs text-slate-500 mt-1">💡 Escribe la comuna tal como la conoces</p>
                    </>
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg flex items-center">
                      <MapPin size={16} className="mr-2 text-slate-500 sm:w-[18px] sm:h-[18px]" />
                      {profile.ubicacion}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+56912345678"
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg flex items-center break-all">
                      <Phone size={16} className="mr-2 text-slate-500 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                      {profile.telefono}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      required
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Infantil">Infantil</option>
                      <option value="Juvenil">Juvenil</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Semi-profesional">Semi-profesional</option>
                      <option value="Profesional">Profesional</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-medium text-base sm:text-lg">{profile.categoria}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Descripción del Club */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Sobre el Club</h2>
              {editMode ? (
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={10}
                  placeholder="Describe tu club..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm sm:text-base"
                />
              ) : (
                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">{profile.descripcion || "No especificada"}</p>
              )}
            </div>

            {/* Sección de Verificación - Solo para Clubes */}
            {!editMode && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Verificación del Club</h2>
                <RequestVerification profile={profile} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}