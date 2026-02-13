"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Users, Trophy, MapPin, MessageCircle, Shield, TrendingUp, Search, FileText, Menu, X } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Si ya está autenticado, verificar si tiene perfil completo
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profile?.profile_completed) {
        router.push("/home")
      } else {
        router.push("/onboarding")
      }
    } else {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-6xl animate-bounce">⚽</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-blue-600/10"></div>
        
        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-3xl sm:text-5xl">⚽</div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  BuscaTuEquipo
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Región del Bío Bío</p>
              </div>
            </div>
            
            {/* Desktop Login Button */}
            <button
              onClick={() => router.push("/auth")}
              className="hidden sm:block bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-sm lg:text-base"
            >
              Iniciar Sesión
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-gray-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sm:hidden mt-4 bg-white rounded-xl shadow-lg p-4 space-y-3"
            >
              <button
                onClick={() => router.push("/auth")}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-semibold"
              >
                Iniciar Sesión
              </button>
            </motion.div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Conectamos el Talento Futbolístico de la
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> Región del Bío Bío</span>
            </h2>
            
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed px-4">
              La plataforma número 1 para que jugadores y clubes de la 8ª región de Chile se encuentren. 
              Desde Concepción hasta Arauco, conectando pasión y oportunidades.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <button
                onClick={() => router.push("/auth?type=signup&rol=jugador")}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Users size={20} className="sm:w-6 sm:h-6" />
                Soy Jugador
              </button>
              
              <button
                onClick={() => router.push("/auth?type=signup&rol=club")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Trophy size={20} className="sm:w-6 sm:h-6" />
                Soy Club
              </button>
            </div>

            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-600 px-4">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-green-600 sm:w-4 sm:h-4" />
                <span className="text-center sm:text-left">Concepción • Los Ángeles • Chillán</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-blue-600 sm:w-4 sm:h-4" />
                <span>100% Seguro</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-1 sm:mb-2">500+</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Jugadores Registrados</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">150+</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Clubes Activos</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">1,200+</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Conexiones Exitosas</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-600 mb-1 sm:mb-2">8</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Provincias Cubiertas</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* How It Works - Para Jugadores */}
      <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-green-50 to-green-100">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🏃</div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              ¿Eres Jugador?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 max-w-2xl mx-auto px-4">
              Encuentra tu próximo equipo en minutos
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FileText size={24} className="text-green-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">1. Crea tu Perfil</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Completa tu información deportiva: posición, experiencia, disponibilidad y características.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Search size={24} className="text-green-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">2. Explora Ofertas</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Revisa publicaciones de clubes buscando jugadores en tu posición y categoría.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <MessageCircle size={24} className="text-green-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">3. Conecta</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Contacta directamente con los clubes que te interesan y agenda tus pruebas.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* How It Works - Para Clubes */}
      <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🏆</div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              ¿Eres Club?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 max-w-2xl mx-auto px-4">
              Encuentra el talento que tu equipo necesita
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Shield size={24} className="text-blue-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">1. Regístrate</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Crea el perfil de tu club y obtén verificación oficial para mayor credibilidad.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FileText size={24} className="text-blue-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">2. Publica Ofertas</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Describe qué posiciones necesitas, requisitos y detalles de tu club.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <TrendingUp size={24} className="text-blue-600 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">3. Recibe Candidatos</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Jugadores interesados te contactarán. Revisa perfiles y agenda pruebas.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              ¿Por qué BuscaTuEquipo?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 max-w-2xl mx-auto px-4">
              La plataforma más completa para el fútbol regional
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🎯</div>
              <h5 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">Local y Específico</h5>
              <p className="text-xs sm:text-sm text-gray-700">
                Enfocado 100% en la Región del Bío Bío y sus 8 provincias
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">💬</div>
              <h5 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">Mensajería Directa</h5>
              <p className="text-xs sm:text-sm text-gray-700">
                Comunicación instantánea entre jugadores y clubes
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✅</div>
              <h5 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">Verificación Oficial</h5>
              <p className="text-xs sm:text-sm text-gray-700">
                Clubes verificados para tu seguridad y confianza
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📱</div>
              <h5 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">100% Gratis</h5>
              <p className="text-xs sm:text-sm text-gray-700">
                Sin costos ocultos. Registro y uso completamente gratuito
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-4">
              ¿Listo para dar el próximo paso?
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 px-4">
              Únete a cientos de jugadores y clubes que ya están construyendo su futuro deportivo
            </p>
            <button
              onClick={() => router.push("/auth")}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Comenzar Ahora - Es Gratis
            </button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="text-2xl sm:text-3xl">⚽</div>
                <h4 className="text-lg sm:text-xl font-bold">BuscaTuEquipo</h4>
              </div>
              <p className="text-sm sm:text-base text-gray-400">
                Conectando el talento futbolístico de la Región del Bío Bío
              </p>
            </div>

            <div>
              <h5 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg">Cobertura</h5>
              <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-400">
                <li>• Concepción</li>
                <li>• Los Ángeles</li>
                <li>• Chillán</li>
                <li>• Arauco</li>
                <li>• Bío Bío</li>
                <li>• Ñuble</li>
              </ul>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <h5 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg">Contacto</h5>
              <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-400">
                <li>📧 contacto@buscatuequipo.cl</li>
                <li>📱 +56 9 XXXX XXXX</li>
                <li>📍 Concepción, Región del Bío Bío</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
            <p>© 2024 BuscaTuEquipo. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}