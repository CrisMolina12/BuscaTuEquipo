import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/auth"]
  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Si el usuario está autenticado y trata de ir a /auth, redirigir según su estado
  if (session && isPublicRoute) {
    // Verificar si debe completar su perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", session.user.id)
      .maybeSingle()

    if (profile && !profile.profile_completed) {
      return NextResponse.redirect(new URL("/profile", req.url))
    }
    
    return NextResponse.redirect(new URL("/home", req.url))
  }

  // Si el usuario no está autenticado y trata de acceder a rutas protegidas
  if (!session && !isPublicRoute && req.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/auth", req.url))
  }

  // Si el usuario está autenticado, verificar si debe completar su perfil
  if (session && req.nextUrl.pathname !== "/profile" && req.nextUrl.pathname !== "/auth") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", session.user.id)
      .maybeSingle()

    if (profile && !profile.profile_completed) {
      return NextResponse.redirect(new URL("/profile", req.url))
    }
  }

  // Redirigir desde "/" a la página apropiada
  if (req.nextUrl.pathname === "/") {
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", session.user.id)
        .maybeSingle()

      if (profile && !profile.profile_completed) {
        return NextResponse.redirect(new URL("/profile", req.url))
      }
      
      return NextResponse.redirect(new URL("/home", req.url))
    } else {
      return NextResponse.redirect(new URL("/auth", req.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}