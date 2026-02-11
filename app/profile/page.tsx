"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {supabase} from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function CompleteProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<"jugador" | "club" | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [uploading, setUploading] = useState(false)

  // Jugador fields
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [edad, setEdad] = useState("")
  const [posicion, setPosicion] = useState("")
  const [pierna, setPierna] = useState<"derecha" | "izquierda" | "ambas">("derecha")
  const [altura, setAltura] = useState("")
  const [peso, setPeso] = useState("")
  const [experiencia, setExperiencia] = useState("")
  const [disponibilidad, setDisponibilidad] = useState<string[]>([])
  const [fotoUrl, setFotoUrl] = useState("")

  // Club fields
  const [nombreClub, setNombreClub] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [categoria, setCategoria] = useState("")

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Verificar autenticación
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error getting user:", userError)
        router.push("/auth")
        return
      }

      if (!user) {
        console.log("No user found, redirecting to auth")
        router.push("/auth")
        return
      }

      console.log("User authenticated:", user.id)
      setUserId(user.id)

      // Intentar obtener el perfil
      const profileQuery = await supabase
        .from("profiles")
        .select("rol, profile_completed")
        .eq("id", user.id)

      console.log("Profile query result:", {
        data: profileQuery.data,
        error: profileQuery.error,
        status: profileQuery.status,
        statusText: profileQuery.statusText
      })

      // Manejar errores de la consulta
      if (profileQuery.error) {
        const error = profileQuery.error
        console.error("Error fetching profile:", JSON.stringify(error, null, 2))
        
        // Error común: tabla no existe o no hay permisos
        if (error.message?.includes("relation") || error.code === '42P01') {
          setErrorMessage("La tabla de perfiles no existe. Por favor, contacta al administrador.")
          setLoading(false)
          return
        }
        
        // Error de permisos RLS
        if (error.message?.includes("permission") || error.code === '42501') {
          setErrorMessage("No tienes permisos para acceder a tu perfil. Verifica la configuración de RLS en Supabase.")
          setLoading(false)
          return
        }
        
        setErrorMessage(`Error al cargar el perfil: ${error.message || 'Error desconocido'}`)
        setLoading(false)
        return
      }

      const profiles = profileQuery.data

      // Si no hay datos, el perfil no existe
      if (!profiles || profiles.length === 0) {
        console.log("No profile found, attempting to create one")
        
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            rol: null,
            profile_completed: false
          })
          .select()
          .single()
        
        if (insertError) {
          console.error("Error creating profile:", insertError)
          setErrorMessage("No se pudo crear el perfil. Verifica los permisos de la base de datos.")
          setLoading(false)
          return
        }
        
        console.log("Profile created successfully:", newProfile)
        setErrorMessage("Perfil creado. Por favor, selecciona tu rol primero en la página de registro.")
        setTimeout(() => router.push("/auth"), 3000)
        setLoading(false)
        return
      }

      const profile = profiles[0]

      // Verificar si el perfil ya está completo
      if (profile.profile_completed) {
        console.log("Profile already completed, redirecting to home")
        router.push("/home")
        return
      }

      // Verificar si tiene rol asignado
      if (!profile.rol) {
        console.log("No role assigned")
        setErrorMessage("No se ha asignado un rol. Por favor, completa el registro primero.")
        setTimeout(() => router.push("/auth"), 3000)
        setLoading(false)
        return
      }

      console.log("User role from database:", profile.rol)
      setRole(profile.rol as "jugador" | "club")
      setLoading(false)
      
    } catch (error: any) {
      console.error("Unexpected error in checkUser:", error)
      console.error("Error stack:", error?.stack)
      setErrorMessage(`Error inesperado: ${error?.message || 'Por favor, intenta de nuevo'}`)
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "foto" | "logo") => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setErrorMessage("")

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${type}s/${fileName}`

      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(filePath)

      if (type === "foto") {
        setFotoUrl(publicUrl)
      } else {
        setLogoUrl(publicUrl)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setErrorMessage("Error al subir la imagen. Por favor, intenta de nuevo.")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage("")

    try {
      if (role === "jugador") {
        const { error } = await supabase
          .from("profiles")
          .update({
            nombre_completo: nombreCompleto,
            edad: Number.parseInt(edad),
            posicion,
            pierna,
            altura: Number.parseFloat(altura),
            peso: Number.parseFloat(peso),
            experiencia,
            disponibilidad,
            foto_url: fotoUrl,
            profile_completed: true,
          })
          .eq("id", userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({
            nombre_club: nombreClub,
            ubicacion,
            telefono,
            descripcion,
            logo_url: logoUrl,
            categoria,
            profile_completed: true,
          })
          .eq("id", userId)

        if (error) throw error
      }

      router.push("/home")
    } catch (error) {
      console.error("Error updating profile:", error)
      setErrorMessage("Error al guardar el perfil. Por favor, intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl mb-2">{role === "jugador" ? "🏃" : "🏆"}</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Completa tu perfil
            </h1>
            <p className="text-gray-600 text-sm">
              {role === "jugador"
                ? "Cuéntanos sobre ti para que los clubes puedan encontrarte"
                : "Cuéntanos sobre tu club para atraer a los mejores jugadores"}
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          {role === "jugador" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto de perfil</label>
                <div className="flex items-center space-x-4">
                  {fotoUrl && (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200">
                      <Image src={fotoUrl || "/placeholder.svg"} alt="Foto de perfil" fill className="object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "foto")}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Edad *</label>
                  <input
                    type="number"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    required
                    min="10"
                    max="60"
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posición *</label>
                  <select
                    value={posicion}
                    onChange={(e) => setPosicion(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none bg-white"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Portero">Portero</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pierna hábil *</label>
                  <select
                    value={pierna}
                    onChange={(e) => setPierna(e.target.value as "derecha" | "izquierda" | "ambas")}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none bg-white"
                  >
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm) *</label>
                  <input
                    type="number"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    required
                    min="140"
                    max="220"
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg) *</label>
                  <input
                    type="number"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    required
                    min="40"
                    max="120"
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experiencia</label>
                <textarea
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos sobre tu experiencia en el fútbol..."
                  className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dia) => (
                    <label key={dia} className="flex items-center space-x-2 cursor-pointer">
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
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
                      />
                      <span className="text-sm text-gray-700">{dia}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo del club</label>
                <div className="flex items-center space-x-4">
                  {logoUrl && (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 bg-white">
                      <Image
                        src={logoUrl || "/placeholder.svg"}
                        alt="Logo del club"
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "logo")}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del club *</label>
                  <input
                    type="text"
                    value={nombreClub}
                    onChange={(e) => setNombreClub(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación *</label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    required
                    placeholder="Ciudad, País"
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    required
                    className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none bg-white"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Infantil">Infantil</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Amateur">Amateur</option>
                    <option value="Semi-profesional">Semi-profesional</option>
                    <option value="Profesional">Profesional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del club</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos sobre tu club, su historia, logros..."
                  className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all duration-200 outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold p-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Guardando..." : uploading ? "Subiendo imagen..." : "Completar perfil"}
          </button>
        </form>
      </div>
    </main>
  )
}