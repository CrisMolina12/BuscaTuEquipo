"use client"

import React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Send, MoreVertical, Circle, Smile, Phone, Mic, X, Pause, Play } from "lucide-react"
import Image from "next/image"

// Crear cliente de Supabase directamente para asegurar configuración correcta de Realtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

interface Mensaje {
  id: string
  contenido: string
  remitente_id: string
  created_at: string
  leido: boolean
  tipo?: 'texto' | 'audio'
  audio_url?: string
  duracion_audio?: number
}

interface Conversacion {
  id: string
  usuario1_id: string
  usuario2_id: string
  publicacion_id: string
  publicaciones: {
    title: string
    publication_type: string
  }
}

// Emojis comunes
const EMOJIS = [
  '😊', '😂', '❤️', '👍', '👏', '🙏', '😍', '🔥',
  '⚽', '🏆', '💪', '👌', '🎯', '✅', '❌', '🤔',
  '😎', '🥳', '😢', '😮', '🙌', '👊', '💯', '⭐'
]

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversacionId = params.id as string
  
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [conversacion, setConversacion] = useState<Conversacion | null>(null)
  const [otroUsuario, setOtroUsuario] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  
  // Estados para emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Estados para audio
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({})
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<{ [key: string]: number }>({})
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const updateUserPresence = useCallback(async (isOnline: boolean, userId: string) => {
    if (!userId) return

    await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        last_seen: new Date().toISOString(),
        is_online: isOnline
      })
  }, [])

  // Cargar chat inicial
  useEffect(() => {
    const loadChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth")
          return
        }
        setCurrentUserId(user.id)

        const { data: conv, error: convError } = await supabase
          .from("conversaciones")
          .select(`
            *,
            publicaciones (
              title,
              publication_type
            )
          `)
          .eq("id", conversacionId)
          .single()

        if (convError || !conv) {
          alert("Conversación no encontrada")
          router.push("/home")
          return
        }

        setConversacion(conv as any)

        const otroUserId = conv.usuario1_id === user.id ? conv.usuario2_id : conv.usuario1_id

        const { data: otroUserData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otroUserId)
          .single()

        setOtroUsuario(otroUserData)

        const { data: msgs } = await supabase
          .from("mensajes")
          .select("*")
          .eq("conversacion_id", conversacionId)
          .order("created_at", { ascending: true })

        setMensajes(msgs || [])
        
        await supabase
          .from("mensajes")
          .update({ leido: true })
          .eq("conversacion_id", conversacionId)
          .neq("remitente_id", user.id)
          .eq("leido", false)

        setLoading(false)
        setTimeout(() => scrollToBottom(), 100)
      } catch (error) {
        console.error("Error loading chat:", error)
        alert("Error al cargar el chat")
        router.push("/home")
      }
    }

    loadChat()
  }, [conversacionId, router, scrollToBottom])

  // Suscripcion a mensajes en tiempo real
  useEffect(() => {
    if (!conversacionId || !currentUserId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages-${conversacionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversacionId}`
        },
        async (payload) => {
          const newMessage = payload.new as Mensaje
          
          setMensajes(prev => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
          
          if (newMessage.remitente_id !== currentUserId) {
            await supabase
              .from("mensajes")
              .update({ leido: true })
              .eq("id", newMessage.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversacionId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Mensaje
          setMensajes(prev => 
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversacionId, currentUserId])

  // Presence y typing
  useEffect(() => {
    if (!conversacionId || !currentUserId || !otroUsuario?.id) return

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current)
    }

    const presenceChannel = supabase.channel(`presence-${conversacionId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const otherUserPresence = state[otroUsuario.id]
        
        if (otherUserPresence && otherUserPresence.length > 0) {
          setIsOtherUserOnline(true)
          const presenceData = otherUserPresence[0] as { typing?: boolean; last_seen?: string }
          setIsOtherUserTyping(presenceData.typing || false)
        } else {
          setIsOtherUserOnline(false)
          setIsOtherUserTyping(false)
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key === otroUsuario.id) {
          setIsOtherUserOnline(true)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === otroUsuario.id) {
          setIsOtherUserOnline(false)
          setIsOtherUserTyping(false)
          setOtherUserLastSeen(new Date().toISOString())
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            typing: false,
          })
        }
      })

    presenceChannelRef.current = presenceChannel
    updateUserPresence(true, currentUserId)

    const heartbeat = setInterval(() => {
      updateUserPresence(true, currentUserId)
    }, 30000)

    return () => {
      clearInterval(heartbeat)
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack()
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
      updateUserPresence(false, currentUserId)
      
      // Limpiar todos los audio elements
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      audioElementsRef.current = {}
    }
  }, [conversacionId, currentUserId, otroUsuario?.id, updateUserPresence])

  useEffect(() => {
    scrollToBottom()
  }, [mensajes, scrollToBottom])

  useEffect(() => {
    if (!otroUsuario?.id) return

    const loadLastSeen = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select('last_seen')
        .eq('user_id', otroUsuario.id)
        .single()

      if (data) {
        setOtherUserLastSeen(data.last_seen)
      }
    }

    loadLastSeen()
  }, [otroUsuario?.id])

  const handleSendMessage = async (e: React.FormEvent, messageContent?: string) => {
    e.preventDefault()
    const content = messageContent || nuevoMensaje.trim()
    if (!content || sending) return

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Mensaje = {
      id: tempId,
      conversacion_id: conversacionId,
      remitente_id: currentUserId,
      contenido: content,
      created_at: new Date().toISOString(),
      leido: false,
      tipo: 'texto'
    } as any

    setMensajes(prev => [...prev, optimisticMessage])
    setNuevoMensaje("")
    setSending(true)
    scrollToBottom()
    
    try {
      const { data, error } = await supabase
        .from("mensajes")
        .insert({
          conversacion_id: conversacionId,
          remitente_id: currentUserId,
          contenido: content,
          tipo: 'texto'
        })
        .select()
        .single()

      if (error) throw error

      setMensajes(prev => 
        prev.map(m => m.id === tempId ? data : m)
      )
    } catch (error) {
      console.error("Error sending message:", error)
      setMensajes(prev => prev.filter(m => m.id !== tempId))
      alert("Error al enviar el mensaje")
      setNuevoMensaje(content)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (value: string) => {
    setNuevoMensaje(value)

    if (presenceChannelRef.current && value.length > 0) {
      presenceChannelRef.current.track({
        online_at: new Date().toISOString(),
        typing: true,
      })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          online_at: new Date().toISOString(),
          typing: false,
        })
      }
    }, 1500)
  }

  const handleEmojiClick = (emoji: string) => {
    setNuevoMensaje(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handlePhoneCall = () => {
    if (!otroUsuario?.telefono) {
      alert("Este usuario no tiene teléfono configurado")
      return
    }

    let cleanNumber = otroUsuario.telefono.replace(/[\s\-\(\)\+]/g, '')
    if (!cleanNumber.startsWith('56') && cleanNumber.length === 9) {
      cleanNumber = '56' + cleanNumber
    }

    window.open(`tel:${cleanNumber}`, '_self')
  }

  // Funciones de grabación de audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Intentar diferentes formatos según compatibilidad
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg'
      }
      
      console.log('Using MIME type:', mimeType)
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("No se pudo acceder al micrófono. Verifica los permisos.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingTime(0)
      setAudioBlob(null)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const sendAudioMessage = async () => {
    if (!audioBlob) return

    setSending(true)
    try {
      // Verificar que el bucket existe
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.id === 'chat-audios')
      
      if (!bucketExists) {
        alert('⚠️ El bucket de audios no está configurado. Por favor contacta al administrador.')
        setSending(false)
        return
      }

      // Detectar extensión del archivo según el tipo MIME
      const mimeType = audioBlob.type
      let extension = 'webm'
      if (mimeType.includes('ogg')) extension = 'ogg'
      else if (mimeType.includes('mp4')) extension = 'mp4'
      else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) extension = 'mp3'
      
      console.log('Uploading audio:', { mimeType, extension, size: audioBlob.size })

      // Subir audio a Supabase Storage
      const fileName = `${currentUserId}/${Date.now()}.${extension}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audios')
        .upload(fileName, audioBlob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        
        // Mensaje de error más específico
        if (uploadError.message.includes('mime type')) {
          alert(`⚠️ Formato de audio no soportado (${mimeType}). Por favor configura el bucket para aceptar archivos de audio.`)
        } else {
          alert(`Error al subir audio: ${uploadError.message}`)
        }
        
        setSending(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(fileName)

      console.log('Audio uploaded successfully:', publicUrl)

      // Crear mensaje de audio
      const { data, error } = await supabase
        .from("mensajes")
        .insert({
          conversacion_id: conversacionId,
          remitente_id: currentUserId,
          contenido: "🎤 Nota de voz",
          tipo: 'audio',
          audio_url: publicUrl,
          duracion_audio: recordingTime
        })
        .select()
        .single()

      if (error) throw error

      setMensajes(prev => [...prev, data])
      setAudioBlob(null)
      setRecordingTime(0)
      scrollToBottom()
    } catch (error) {
      console.error("Error sending audio:", error)
      alert("Error al enviar la nota de voz")
    } finally {
      setSending(false)
    }
  }

  const playAudio = (audioUrl: string, messageId: string) => {
    // Si ya existe el audio element, usarlo
    if (!audioElementsRef.current[messageId]) {
      const audio = new Audio(audioUrl)
      audioElementsRef.current[messageId] = audio
      
      // Listeners para actualizar el progreso
      audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100
        setAudioProgress(prev => ({ ...prev, [messageId]: progress }))
      })
      
      audio.addEventListener('ended', () => {
        setPlayingAudioId(null)
        setAudioProgress(prev => ({ ...prev, [messageId]: 0 }))
      })
      
      // Establecer velocidad inicial
      audio.playbackRate = audioPlaybackRate[messageId] || 1
    }
    
    const audio = audioElementsRef.current[messageId]
    
    if (playingAudioId === messageId) {
      // Pausar
      audio.pause()
      setPlayingAudioId(null)
    } else {
      // Pausar todos los otros audios
      Object.keys(audioElementsRef.current).forEach(id => {
        if (id !== messageId) {
          audioElementsRef.current[id].pause()
        }
      })
      
      // Reproducir este audio
      audio.play()
      setPlayingAudioId(messageId)
    }
  }

  const changePlaybackSpeed = (messageId: string) => {
    const currentRate = audioPlaybackRate[messageId] || 1
    const rates = [1, 1.25, 1.5, 2]
    const currentIndex = rates.indexOf(currentRate)
    const nextRate = rates[(currentIndex + 1) % rates.length]
    
    setAudioPlaybackRate(prev => ({ ...prev, [messageId]: nextRate }))
    
    if (audioElementsRef.current[messageId]) {
      audioElementsRef.current[messageId].playbackRate = nextRate
    }
  }

  const seekAudio = (messageId: string, percentage: number) => {
    if (audioElementsRef.current[messageId]) {
      const audio = audioElementsRef.current[messageId]
      audio.currentTime = (percentage / 100) * audio.duration
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLastSeenText = () => {
    if (isOtherUserTyping) return "Escribiendo..."
    if (isOtherUserOnline) return "En línea"
    if (!otherUserLastSeen) return "Desconectado"

    const lastSeenDate = new Date(otherUserLastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60

    if (diffMinutes < 60) {
      const mins = Math.floor(diffMinutes)
      return `Hace ${mins} min${mins !== 1 ? 's' : ''}`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
    } else {
      const days = Math.floor(diffMinutes / 1440)
      return `Hace ${days} día${days !== 1 ? 's' : ''}`
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else if (diffDays === 1) {
      return "Ayer " + date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }) + " " + date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center px-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Cargando chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header fijo - no necesita scroll */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.push("/home")}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
                aria-label="Volver"
              >
                <ArrowLeft size={20} className="text-slate-700 sm:w-5 sm:h-5" />
              </button>
              
              {otroUsuario && (
                <>
                  <div className="relative flex-shrink-0">
                    {otroUsuario.foto_url || otroUsuario.logo_url ? (
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden ring-2 ring-slate-100">
                        <Image
                          src={otroUsuario.foto_url || otroUsuario.logo_url}
                          alt="Avatar"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ring-2 ring-slate-100">
                        <span className="text-lg sm:text-xl font-semibold text-slate-600">
                          {(otroUsuario.nombre_completo || otroUsuario.nombre_club || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {isOtherUserOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                      {otroUsuario.nombre_completo || otroUsuario.nombre_club}
                    </h2>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {isOtherUserTyping ? (
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : isOtherUserOnline ? (
                        <Circle size={7} className="text-emerald-500 fill-emerald-500 sm:w-2 sm:h-2" />
                      ) : null}
                      <p className={`text-xs sm:text-sm truncate ${
                        isOtherUserTyping 
                          ? 'text-emerald-600 font-medium' 
                          : isOtherUserOnline 
                            ? 'text-emerald-600 font-medium' 
                            : 'text-slate-500'
                      }`}>
                        {getLastSeenText()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {otroUsuario?.telefono && (
                <button 
                  onClick={handlePhoneCall}
                  className="p-2 sm:p-2.5 hover:bg-emerald-50 rounded-lg sm:rounded-xl transition-colors group"
                  title="Llamar"
                >
                  <Phone size={18} className="text-emerald-600 group-hover:text-emerald-700 sm:w-5 sm:h-5" />
                </button>
              )}
              <button className="p-2 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors">
                <MoreVertical size={18} className="text-slate-600 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {conversacion?.publicaciones && (
            <div className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 mb-0.5">Sobre la publicación:</p>
              <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                {conversacion.publicaciones.title}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-3 sm:gap-4">
          {mensajes.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">💬</div>
              <p className="text-slate-600 font-medium mb-1 text-sm sm:text-base">Inicia la conversación</p>
              <p className="text-xs sm:text-sm text-slate-500">Escribe un mensaje para comenzar</p>
            </div>
          ) : (
            mensajes.map((msg, index) => {
              const isMine = msg.remitente_id === currentUserId
              const showDate = index === 0 || 
                new Date(mensajes[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString()
              const isOptimistic = msg.id.startsWith('temp-')
              const isAudio = msg.tipo === 'audio'

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4 sm:my-6">
                      <span className="px-2.5 sm:px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-medium">
                        {new Date(msg.created_at).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long"
                        })}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] ${isMine ? "" : "flex items-start gap-1.5 sm:gap-2"}`}>
                      {!isMine && otroUsuario?.foto_url && (
                        <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={otroUsuario.foto_url || otroUsuario.logo_url}
                            alt="Avatar"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div
                          className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 ${
                            isMine
                              ? `bg-emerald-600 text-white rounded-br-md ${isOptimistic ? 'opacity-70' : ''}`
                              : "bg-white text-slate-900 border border-slate-200 rounded-bl-md shadow-sm"
                          }`}
                        >
                          {isAudio && msg.audio_url ? (
                            <div className="flex flex-col gap-1.5 sm:gap-2 min-w-[180px] sm:min-w-[200px]">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                  onClick={() => playAudio(msg.audio_url!, msg.id)}
                                  className={`p-2 sm:p-2.5 rounded-full ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-100 hover:bg-slate-200'} transition-colors flex-shrink-0`}
                                >
                                  {playingAudioId === msg.id ? (
                                    <Pause size={16} className={`${isMine ? 'text-white' : 'text-slate-700'} sm:w-[18px] sm:h-[18px]`} />
                                  ) : (
                                    <Play size={16} className={`${isMine ? 'text-white' : 'text-slate-700'} sm:w-[18px] sm:h-[18px]`} />
                                  )}
                                </button>
                                
                                <div className="flex-1">
                                  {/* Barra de progreso clickeable */}
                                  <div 
                                    className={`h-1.5 sm:h-2 rounded-full cursor-pointer ${isMine ? 'bg-white/20' : 'bg-slate-200'}`}
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      const x = e.clientX - rect.left
                                      const percentage = (x / rect.width) * 100
                                      seekAudio(msg.id, percentage)
                                    }}
                                  >
                                    <div 
                                      className={`h-full rounded-full transition-all ${isMine ? 'bg-white' : 'bg-emerald-500'}`}
                                      style={{ width: `${audioProgress[msg.id] || 0}%` }}
                                    ></div>
                                  </div>
                                  
                                  <div className="flex justify-between items-center mt-0.5 sm:mt-1">
                                    <p className={`text-xs ${isMine ? 'text-white/80' : 'text-slate-600'}`}>
                                      {formatTime(msg.duracion_audio || 0)}
                                    </p>
                                    
                                    {/* Botón de velocidad */}
                                    <button
                                      onClick={() => changePlaybackSpeed(msg.id)}
                                      className={`text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded ${
                                        isMine 
                                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      } transition-colors`}
                                    >
                                      {audioPlaybackRate[msg.id] || 1}x
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="break-words leading-relaxed text-sm sm:text-base">{msg.contenido}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <p className="text-xs text-slate-500">
                            {formatMessageTime(msg.created_at)}
                          </p>
                          {isMine && (
                            <span className="text-xs text-slate-500">
                              {isOptimistic ? "⏳" : msg.leido ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Preview de audio grabado */}
      {audioBlob && (
        <div className="bg-amber-50 border-t border-amber-200 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-full flex-shrink-0">
                <Mic size={18} className="text-amber-700 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-amber-900 truncate">Nota de voz grabada</p>
                <p className="text-xs text-amber-700">{formatTime(recordingTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setAudioBlob(null)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-amber-300 text-amber-700 rounded-lg sm:rounded-xl hover:bg-amber-50 transition-colors font-medium text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={sendAudioMessage}
                disabled={sending}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl transition-colors font-medium disabled:opacity-50 text-xs sm:text-sm"
              >
                {sending ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de grabación */}
      {isRecording && (
        <div className="bg-red-50 border-t border-red-200 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 bg-red-500 rounded-full animate-pulse flex-shrink-0">
                <Mic size={18} className="text-white sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-red-900 truncate">Grabando nota de voz...</p>
                <p className="text-xs text-red-700">{formatTime(recordingTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={cancelRecording}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-red-300 text-red-700 rounded-lg sm:rounded-xl hover:bg-red-50 transition-colors font-medium text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={stopRecording}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl transition-colors font-medium text-xs sm:text-sm"
              >
                Detener
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input con emojis y audio */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-end gap-1.5 sm:gap-2">
            {/* Botón de emoji */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 sm:p-2.5 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
              >
                <Smile size={20} className="text-slate-600 sm:w-[22px] sm:h-[22px]" />
              </button>

              {/* Picker de emojis */}
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-2 sm:p-3 w-56 sm:w-64 z-10">
                  <div className="flex justify-between items-center mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b border-slate-200">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">Emojis</p>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="p-1 hover:bg-slate-100 rounded-lg"
                    >
                      <X size={14} className="text-slate-600 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-0.5 sm:gap-1 max-h-40 sm:max-h-48 overflow-y-auto">
                    {EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-xl sm:text-2xl hover:bg-slate-100 rounded-lg p-0.5 sm:p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input de texto */}
            <div className="flex-1">
              <textarea
                value={nuevoMensaje}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-slate-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none max-h-24 sm:max-h-32 text-sm sm:text-base text-slate-900 placeholder:text-slate-400"
                style={{
                  minHeight: '40px',
                  maxHeight: '96px',
                }}
                disabled={sending || isRecording}
              />
            </div>

            {/* Botón de audio o enviar */}
            {nuevoMensaje.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all shadow-sm disabled:shadow-none flex-shrink-0"
              >
                {sending ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all shadow-sm flex-shrink-0 ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Mic size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 px-1 hidden sm:block">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </form>
      </div>
    </div>
  )
}