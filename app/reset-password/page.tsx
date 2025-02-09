"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError("")

    try {
      await sendPasswordResetEmail(auth, email)
      setStatus("success")
    } catch (error) {
      console.error("Password reset error:", error)
      setError("Failed to send password reset email. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="min-h-[calc(100vh-88px)] flex items-start justify-center pt-20">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <div className="space-y-4">
                <p className="text-sm text-green-600">
                  Password reset email sent! Please check your inbox and follow the instructions.
                </p>
                <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={status === "loading"}>
                  {status === "loading" ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button variant="link" className="w-full" onClick={() => router.push("/login")}>
                  Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

