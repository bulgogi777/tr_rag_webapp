"use client"

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react"

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
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const router = useRouter()

  const loadPdfs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Add cache-busting query parameter and no-cache headers
      const response = await fetch("/api/s3/list-pdfs?" + new Date().getTime(), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (!response.ok) {
        throw new Error("Failed to load PDFs")
      }

      const responseData = await response.json()
      console.log("Raw response data:", responseData)
      
      const { pdfs: fetchedPdfs } = responseData
      console.log("Fetched PDFs:", fetchedPdfs)

      // Apply filtering and sorting
      const filteredPdfs = filterPdfs(fetchedPdfs, filterType)
      console.log("Filtered PDFs:", filteredPdfs)
      
      const sortedPdfs = sortPdfs(filteredPdfs, sortField, sortOrder)
      console.log("Sorted PDFs:", sortedPdfs)

      setPdfs(sortedPdfs)
    } catch (error: any) {
      console.error("Error loading PDFs:", error)
      setError(error.message || "Failed to load PDFs. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [filterType, sortField, sortOrder])

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

  const refreshData = useCallback(async () => {
    await loadPdfs()
    // Force Next.js to revalidate and refresh the entire page
    router.refresh()
  }, [loadPdfs, router])

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

  useEffect(() => {
    loadPdfs()
  }, [loadPdfs])

  useImperativeHandle(
    ref,
    () => ({
      loadPdfs: refreshData,
    }),
    [refreshData],
  )

  const generateSummary = async (pdf: PdfFile) => {
    setGeneratingIds((prev) => new Set(prev).add(pdf.name))
    try {
      const response = await fetch(
        "https://webhook-processor-production-6889.up.railway.app/webhook/a23f9a53-56d5-44c0-8c44-10cce1e5d066",
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
      
      if (responseBody.Error === "Summary already exists") {
        console.log("Summary already exists, forcing list refresh")
        setGeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(pdf.name)
          return next
        })
        await refreshData()
        return
      }
      
      await refreshData()
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
      console.log("[UI] Attempting to delete PDF:", {
        name: pdf.name,
        path: pdf.fullPath,
        hasSummary: pdf.hasSummary
      })

      const response = await fetch("/api/s3/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfPath: pdf.fullPath,
          hasSummary: pdf.hasSummary,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          console.error("[UI] PDF not found:", pdf.name)
          alert("This file no longer exists. The list will be refreshed.")
          await refreshData()
          return
        }
        throw new Error(data.error || "Failed to delete file")
      }

      console.log("[UI] Successfully deleted PDF:", pdf.name)
      await refreshData()
    } catch (error: any) {
      console.error("[UI] Error deleting file:", error)
      alert(error.message || "Failed to delete file. Please try again.")
      // Refresh list anyway in case the file was partially deleted
      await refreshData()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-[160px]" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertDescription className="flex flex-col items-center gap-4">
          <p>{error}</p>
          <Button onClick={refreshData} variant="outline">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
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
          <Alert className="my-8">
            <AlertDescription className="text-center">
              No PDF documents found. Upload some files to get started.
            </AlertDescription>
          </Alert>
        ) : (
          pdfs.map((pdf) => (
            <Card key={pdf.name} className="hover:shadow transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-[60%_40%] gap-4 flex-1 items-center pr-4">
                    <h3 className="font-medium truncate">{pdf.name}</h3>
                    <p className="text-sm text-muted-foreground text-center">{pdf.uploadDate}</p>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
})

PdfList.displayName = "PdfList"

export default PdfList
