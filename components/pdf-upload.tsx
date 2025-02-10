"use client"

import { useState, useCallback } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

// Add a placeholder for the testConnection function.  You'll need to implement this elsewhere.
const testConnection = async (): Promise<boolean> => {
  // Replace with your actual connection test logic.  This is a placeholder.
  return true
}

export default function PdfUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      const pdfFiles = Array.from(files).filter((file) => file.type === "application/pdf")

      if (pdfFiles.length === 0) {
        alert("Please select PDF files only")
        return
      }

      setUploading(true)
      setError(null)
      try {
        // Test connection first
        const isConnected = await testConnection()
        if (!isConnected) {
          throw new Error("Unable to connect to storage server. Please try again later.")
        }

        const uploadPromises = pdfFiles.map(async (file) => {
          console.log(`Uploading file: ${file.name}`)
          try {
            // Get pre-signed URL for upload
            const urlResponse = await fetch("/api/s3/upload-url", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ filename: file.name }),
            });

            if (!urlResponse.ok) {
              throw new Error("Failed to get upload URL");
            }

            const { uploadUrl } = await urlResponse.json();

            // Upload file using pre-signed URL
            const uploadResponse = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: {
                "Content-Type": "application/pdf",
              },
            });

            if (!uploadResponse.ok) {
              throw new Error("Failed to upload file");
            }

            console.log(`Successfully uploaded ${file.name}`);
          } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            throw err;
          }
        })

        await Promise.all(uploadPromises)
        onUploadComplete()
      } catch (error: any) {
        console.error("Error uploading files:", error)
        setError(error.message || "Failed to upload files. Please try again.")
      } finally {
        setUploading(false)
      }
    },
    [onUploadComplete],
  )

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const { files } = e.dataTransfer
      if (files && files.length > 0) {
        handleFiles(files)
      }
    },
    [handleFiles],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Upload PDF</h2>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card
        className={cn(
          "relative border-2 border-dashed transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                {uploading ? "Uploading..." : "Drop PDF files here or click to select"}
              </p>
              <p className="text-sm text-muted-foreground">Support for multiple files</p>
            </div>
            {uploading && (
              <div className="w-full max-w-xs">
                <Progress value={100} className="h-1" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
