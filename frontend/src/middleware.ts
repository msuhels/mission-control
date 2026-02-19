
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decrypt } from "@/lib/auth"

const protectedRoutes = ["/dashboard"]
const publicRoutes = ["/login", "/"]

export default async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname
    const isProtectedRoute = protectedRoutes.includes(path) || path.startsWith("/dashboard")
    const isPublicRoute = publicRoutes.includes(path)

    const cookie = req.cookies.get("session")?.value
    const session = cookie ? await decrypt(cookie).catch(() => null) : null

    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    if (
        isPublicRoute &&
        session &&
        !req.nextUrl.pathname.startsWith("/dashboard")
    ) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
}
