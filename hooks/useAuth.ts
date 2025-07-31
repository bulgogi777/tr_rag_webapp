"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { type User, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

const N8N_SPIN_UP_WEBHOOK_URL = "https://webhook-processor-production-6889.up.railway.app/webhook/30bddc9d-8801-4217-a854-d36cf355301d"
const N8N_WEBHOOK_AUTH_KEY = process.env.NEXT_PUBLIC_N8N_WEBHOOK_AUTH_KEY || process.env.N8N_WEBHOOK_AUTH_KEY;

// Module-scoped flag to track if the webhook has been sent for the current session
let isSpinUpWebhookSentForSession = false;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Function to send the webhook (no internal flag check)
  const sendN8nSpinUpWebhook = useCallback(async (currentUser: User) => {
    if (!N8N_SPIN_UP_WEBHOOK_URL || !N8N_WEBHOOK_AUTH_KEY) {
      console.warn("sendN8nSpinUpWebhook: N8N spin-up webhook URL or auth key not configured. Skipping spin-up.")
      return
    }

    try {
      console.log("sendN8nSpinUpWebhook: Sending n8n spin-up webhook...")
      const response = await fetch(N8N_SPIN_UP_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-Auth": N8N_WEBHOOK_AUTH_KEY, // Header Auth
        },
        body: JSON.stringify({
          event: "userLoggedIn",
          timestamp: new Date().toISOString(),
          userId: currentUser.uid, // Include user ID
          userEmail: currentUser.email, // Include user email
        }),
      })

      if (!response.ok) {
        console.error(`sendN8nSpinUpWebhook: Failed to trigger n8n spin-up webhook: ${response.status} ${response.statusText}`)
      } else {
        console.log("sendN8nSpinUpWebhook: n8n spin-up webhook triggered successfully.")
      }
    } catch (error) {
      console.error("sendN8nSpinUpWebhook: Error triggering n8n spin-up webhook:", error)
    }
  }, []); // No dependencies as it uses constants

  useEffect(() => {
    console.log("useEffect: onAuthStateChanged listener mounted.")
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("onAuthStateChanged: User state changed. Current user:", currentUser ? currentUser.uid : "null")
      setUser(currentUser)
      setLoading(false)

      if (currentUser) {
        console.log(`onAuthStateChanged: User is logged in. isSpinUpWebhookSentForSession: ${isSpinUpWebhookSentForSession}`)
        // Only attempt to trigger if not already sent for this session
        if (!isSpinUpWebhookSentForSession) {
          isSpinUpWebhookSentForSession = true; // Set flag immediately to prevent re-triggers
          // Debounce the actual webhook sending
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
          }
          debounceTimer.current = setTimeout(() => {
            console.log("onAuthStateChanged: Debounce timer fired, calling sendN8nSpinUpWebhook.")
            sendN8nSpinUpWebhook(currentUser);
          }, 100); // Short debounce to catch rapid re-renders
        } else {
          console.log("onAuthStateChanged: Webhook already sent for this session. Skipping debounce scheduling.")
        }
      } else {
        // User logged out, reset the flag and clear any pending debounce calls
        console.log("onAuthStateChanged: User logged out. Resetting isSpinUpWebhookSentForSession to false.")
        isSpinUpWebhookSentForSession = false;
        if (debounceTimer.current) {
          console.log("onAuthStateChanged: Clearing debounce timer on logout.")
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
      }
    })

    return () => {
      console.log("useEffect cleanup: Unsubscribing from onAuthStateChanged.")
      unsubscribe();
      // Clear any pending debounce calls on unmount
      if (debounceTimer.current) {
        console.log("useEffect cleanup: Clearing debounce timer on unmount.")
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [sendN8nSpinUpWebhook]); // Dependency on sendN8nSpinUpWebhook

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
