"use client"

import ProtectedRoute from "@/components/protected-route"
import PdfList from "@/components/pdf-list"
import PdfUpload from "@/components/pdf-upload"
import { useAuth } from "@/hooks/useAuth"
import { useRef } from "react"
import { SiteHeader } from "@/components/site-header"

export default function DashboardPage() {
  const { logout } = useAuth()
  const pdfListRef = useRef<{ loadPdfs: () => void } | null>(null)

  const handleUploadComplete = () => {
    if (pdfListRef.current) {
      pdfListRef.current.loadPdfs()
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-4xl mx-auto py-10 px-8">
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <PdfUpload onUploadComplete={handleUploadComplete} />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <PdfList ref={pdfListRef} />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

