
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secretKey = process.env.JWT_SECRET || "secret-key"
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(key)
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ["HS256"],
    })
    return payload
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")
    if (!session) return null
    try {
        return await decrypt(session.value)
    } catch (error) {
        return null
    }
}

export async function login(formData: FormData) {
    const email = formData.get("email")
    const password = formData.get("password")

    if (
        email === process.env.ADMIN_EMAIL &&
        password === process.env.ADMIN_PASSWORD
    ) {
        // Create the session
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const session = await encrypt({ user: { email }, expires })

        // Save the session in a cookie
        const cookieStore = await cookies()
        cookieStore.set("session", session, { expires, httpOnly: true })
        return true
    }
    return false
}

export async function logout() {
    // Destroy the session
    const cookieStore = await cookies()
    cookieStore.set("session", "", { expires: new Date(0) })
}
