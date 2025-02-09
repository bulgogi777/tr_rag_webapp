"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { s3, BUCKET_NAME } from "@/lib/s3"
import ReactMarkdown from "react-markdown"

export default function MarkdownViewer({ params }: { params: { filename: string } }) {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchMarkdown = async () => {
      let key = ""
      try {
        // Generate the S3 key
        key = `summaries/${decodeURIComponent(params.filename)}.md`

        // Fetch the markdown content
        const result = await s3
          .getObject({
            Bucket: BUCKET_NAME,
            Key: key,
          })
          .promise()

        // Set the content if found
        if (result.Body) {
          setContent(result.Body.toString("utf-8"))
        }
      } catch (error) {
        console.error(`Error fetching markdown for key ${key}:`, error)
        setError(`Failed to load summary for ${key}. Please try again.`)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkdown()
  }, [params.filename]) // Dependency ensures effect runs if filename changes

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
        <div className="prose max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

