"use client"

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react"
import { s3, BUCKET_NAME, ensureBucket, testConnection, listObjects } from "@/lib/s3"

interface PdfFile {
  name: string
  uploadDate: string
  downloadUrl: string
  hasSummary: boolean
  fullPath: string
}

interface PdfListRef {
  loadPdfs: () => Promise<void>
}

type SortField = "name" | "date"
type SortOrder = "asc" | "desc"
type FilterType = "all" | "withSummary" | "withoutSummary"

const PdfList = forwardRef<PdfListRef>((_, ref) => {
  const [pdfs, setPdfs] = useState<PdfFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("date") // Updated default sort field
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc") // Updated default sort order
  const [filterType, setFilterType] = useState<FilterType>("all")
  const router = useRouter()

  // Memoize the loadPdfs function to prevent unnecessary recreations
  const loadPdfs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isConnected = await testConnection(3)
      if (!isConnected) {
        throw new Error("Unable to connect to storage server after multiple attempts. Please try again later.")
      }

      await ensureBucket()
      const uploadsList = await listObjects("uploads/")
      const summariesList = await listObjects("summaries/")

      const summaryFiles = new Set(
        (summariesList.Contents || [])
          .map((item) => item.Key?.replace("summaries/", "").replace(".md", ""))
          .filter(Boolean),
      )

      const pdfPromises = (uploadsList.Contents || [])
        .filter((item) => item.Key && item.Key.endsWith(".pdf"))
        .map(async (item) => {
          if (!item.Key) return null

          const fileName = item.Key.replace("uploads/", "")
          if (!fileName) return null

          try {
            const downloadParams = {
              Bucket: BUCKET_NAME,
              Key: item.Key,
              Expires: 3600,
            }

            const downloadUrl = s3.getSignedUrl("getObject", downloadParams)
            const name = fileName.replace(".pdf", "")

            return {
              name: fileName,
              uploadDate: item.LastModified
                ? new Date(item.LastModified).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Unknown",
              downloadUrl,
              hasSummary: summaryFiles.has(name),
              fullPath: item.Key,
            }
          } catch (err) {
            console.error(`Error processing file ${fileName}:`, err)
            return null
          }
        })

      let pdfList = (await Promise.all(pdfPromises)).filter((item): item is PdfFile => item !== null)

      // Apply filtering
      pdfList = filterPdfs(pdfList, filterType)

      // Apply sorting
      pdfList = sortPdfs(pdfList, sortField, sortOrder)

      setPdfs(pdfList)
    } catch (error: any) {
      console.error("Error loading PDFs:", error)
      setError(error.message || "Failed to load PDFs. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [filterType, sortField, sortOrder]) // Include only the dependencies that should trigger a reload

  // Memoize the filter and sort functions
  const filterPdfs = useCallback((pdfs: PdfFile[], filter: FilterType) => {
    switch (filter) {
      case "withSummary":
        return pdfs.filter((pdf) => pdf.hasSummary)
      case "withoutSummary":
        return pdfs.filter((pdf) => !pdf.hasSummary)
      default:
        return pdfs
    }
  }, [])

  const sortPdfs = useCallback((pdfs: PdfFile[], field: SortField, order: SortOrder) => {
    return [...pdfs].sort((a, b) => {
      let comparison = 0
      if (field === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (field === "date") {
        comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
      }
      return order === "asc" ? comparison : -comparison
    })
  }, [])

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"))
      } else {
        setSortField(field)
        setSortOrder("asc")
      }
    },
    [sortField],
  )

  // Load PDFs when sort or filter changes
  useEffect(() => {
    loadPdfs()
  }, [loadPdfs]) // loadPdfs is memoized with sortField, sortOrder, and filterType dependencies

  useImperativeHandle(
    ref,
    () => ({
      loadPdfs,
    }),
    [loadPdfs],
  )

  const generateSummary = async (pdf: PdfFile) => {
    setGeneratingIds((prev) => new Set(prev).add(pdf.name))
    try {
      const response = await fetch(
        "https://primary-production-4d0b.up.railway.app/webhook-test/a23f9a53-56d5-44c0-8c44-10cce1e5d066",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfName: pdf.name,
            objectPath: pdf.fullPath,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.statusText}`)
      }

      const responseBody = await response.json()
      console.log("Summary generation response:", responseBody)
      await loadPdfs()
    } catch (error: any) {
      console.error("Error generating summary:", error)
      alert(error.message || "Failed to generate summary. Please try again.")
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev)
        next.delete(pdf.name)
        return next
      })
    }
  }

  const deletePdf = async (pdf: PdfFile) => {
    if (!confirm(`Are you sure you want to delete ${pdf.name}?`)) {
      return
    }

    try {
      // Delete the PDF
      await s3
        .deleteObject({
          Bucket: BUCKET_NAME,
          Key: pdf.fullPath,
        })
        .promise()

      // If there's a summary, delete it too
      if (pdf.hasSummary) {
        const summaryKey = `summaries/${pdf.name.replace(".pdf", ".md")}`
        await s3
          .deleteObject({
            Bucket: BUCKET_NAME,
            Key: summaryKey,
          })
          .promise()
      }

      await loadPdfs()
    } catch (error) {
      console.error("Error deleting file:", error)
      alert("Failed to delete file. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>{error}</p>
        <Button onClick={() => loadPdfs()} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">PDF Documents</h2>
        <div className="flex gap-4">
          <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              <SelectItem value="withSummary">With Summary</SelectItem>
              <SelectItem value="withoutSummary">Need Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[40%_60%] gap-4 px-4 py-2 font-medium text-sm text-gray-500">
          <button
            className="flex items-center gap-1 hover:text-gray-700 justify-left"
            onClick={() => toggleSort("name")}
          >
            Filename
            {sortField === "name" &&
              (sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
          </button>
          <button
            className="flex items-center gap-1 hover:text-gray-700 justify-center text-center w-[200px]"
            onClick={() => toggleSort("date")}
          >
            Upload Date
            {sortField === "date" &&
              (sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
          </button>
        </div>
        {pdfs.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No PDF documents found. Upload some files to get started.</div>
        ) : (
          pdfs.map((pdf) => (
            <div
              key={pdf.name}
              className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow transition-shadow"
            >
              <div className="grid grid-cols-[60%_40%] gap-4 flex-1 items-center pr-4">
                <h3 className="font-medium truncate">{pdf.name}</h3>
                <p className="text-sm text-gray-500 text-center">{pdf.uploadDate}</p>
              </div>
              <div className="flex gap-2">
                {pdf.hasSummary ? (
                  <Button
                    variant="outline"
                    className="w-[160px] active:scale-95 transition-transform"
                    onClick={() => router.push(`/summaries/${encodeURIComponent(pdf.name.replace(".pdf", ""))}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Summary
                  </Button>
                ) : (
                  <Button
                    onClick={() => generateSummary(pdf)}
                    disabled={generatingIds.has(pdf.name)}
                    className="w-[160px] active:scale-95 transition-transform"
                  >
                    {generatingIds.has(pdf.name) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Summary"
                    )}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deletePdf(pdf)}
                  className="active:scale-95 transition-transform"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

PdfList.displayName = "PdfList"

export default PdfList

