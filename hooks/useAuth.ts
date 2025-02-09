"use client"

import { useEffect, useState } from "react"
import { type User, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, login, logout }
}

