"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black text-white dark:bg-background/95 dark:text-foreground backdrop-blur supports-[backdrop-filter]:bg-black dark:supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Report Summarizer</h1>
          {user && (
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={logout}
                className="text-white hover:text-white/90 hover:bg-white/10 dark:text-foreground dark:hover:text-foreground dark:hover:bg-accent"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
