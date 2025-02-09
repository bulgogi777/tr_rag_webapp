"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const { user, logout } = useAuth()

  return (
    <div className="bg-black text-white">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Report Summarizer</h1>
          {user && (
            <Button variant="ghost" onClick={logout} className="text-white hover:text-white/90 hover:bg-white/10">
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

