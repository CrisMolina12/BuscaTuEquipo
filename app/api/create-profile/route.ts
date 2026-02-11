// app/api/create-profile/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente de Supabase con privilegios de servicio (service_role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Esta es la clave secreta
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { userId, email, rol } = await request.json()

    if (!userId || !email || !rol) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el perfil ya existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ 
        success: true, 
        message: 'Perfil ya existe' 
      })
    }

    // Crear el perfil con privilegios de administrador
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        rol: rol,
        profile_completed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}