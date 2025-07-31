"use client"

import { useEffect, useState } from "react"
import { type User, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

const N8N_SPIN_UP_WEBHOOK_URL = "https://webhook-processor-production-6889.up.railway.app/webhook/30bddc9d-8801-4217-a854-d36cf355301d"
const N8N_WEBHOOK_AUTH_KEY = process.env.NEXT_PUBLIC_N8N_WEBHOOK_AUTH_KEY || process.env.N8N_WEBHOOK_AUTH_KEY;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
      if (user) {
        // User logged in, trigger n8n spin-up webhook
        triggerN8nSpinUp()
      }
    })

    return unsubscribe
  }, [])

  const triggerN8nSpinUp = async () => {
    if (!N8N_SPIN_UP_WEBHOOK_URL || !N8N_WEBHOOK_AUTH_KEY) {
      console.warn("N8N spin-up webhook URL or auth key not configured. Skipping spin-up.")
      return
    }

    try {
      console.log("Triggering n8n spin-up webhook...")
      const response = await fetch(N8N_SPIN_UP_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-Auth": N8N_WEBHOOK_AUTH_KEY, // Header Auth
        },
        body: JSON.stringify({ event: "userLoggedIn", timestamp: new Date().toISOString() }),
      })

      if (!response.ok) {
        console.error(`Failed to trigger n8n spin-up webhook: ${response.status} ${response.statusText}`)
      } else {
        console.log("n8n spin-up webhook triggered successfully.")
      }
    } catch (error) {
      console.error("Error triggering n8n spin-up webhook:", error)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // The onAuthStateChanged listener will handle triggering the spin-up webhook
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, login, logout }
}
