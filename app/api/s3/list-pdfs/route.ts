import { NextResponse } from "next/server"
import { s3, BUCKET_NAME, listObjects } from "@/lib/s3"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log("S3 Config:", {
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.MINIO_REGION,
      bucket: BUCKET_NAME,
      hasAccessKey: !!process.env.MINIO_ACCESS_KEY,
      hasSecretKey: !!process.env.MINIO_SECRET_KEY
    })

    console.log("Fetching uploads list...")
    const uploadsList = await listObjects("uploads/")
    console.log("Raw uploads list:", JSON.stringify(uploadsList, null, 2))

    console.log("Fetching summaries list...")
    const summariesList = await listObjects("summaries/")
    console.log("Raw summaries list:", JSON.stringify(summariesList, null, 2))
    
    const summaryFiles = new Set(
      (summariesList.Contents || [])
        .map((item) => {
          console.log("Processing summary item:", item.Key)
          // Don't modify the name when creating the Set to match exactly with the PDF name
          return item.Key?.replace("summaries/", "").replace(".md", "")
        })
        .filter(Boolean)
    )
    
    console.log("Summary files set:", Array.from(summaryFiles))

    const pdfs = await Promise.all(
      (uploadsList.Contents || [])
        .filter((item) => item.Key && item.Key.endsWith(".pdf"))
        .map(async (item) => {
          if (!item.Key) return null

          const fileName = item.Key.replace("uploads/", "")
          if (!fileName) return null

          const downloadParams = {
            Bucket: BUCKET_NAME,
            Key: item.Key,
            Expires: 3600,
          }

          const downloadUrl = s3.getSignedUrl("getObject", downloadParams)
          // Keep the exact name for summary check, just remove .pdf extension
          const nameForSummary = fileName.replace(".pdf", "")
          
          console.log("PDF processing:", {
            originalFileName: fileName,
            nameForSummaryCheck: nameForSummary,
            summaryFiles: Array.from(summaryFiles),
            hasSummary: summaryFiles.has(nameForSummary)
          })

          const result = {
            name: fileName,
            uploadDate: item.LastModified
              ? new Date(item.LastModified).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Chicago"
                })
              : "Unknown",
            downloadUrl,
            hasSummary: summaryFiles.has(nameForSummary),
            fullPath: item.Key,
          }

          // Ensure proper JSON formatting
          console.log("PDF object stringified:", JSON.stringify(result, null, 2))
          
          console.log("Final PDF object:", result)
          return result
        })
    )

    const validPdfs = pdfs.filter((item): item is NonNullable<typeof item> => item !== null)

    const response = NextResponse.json({ pdfs: validPdfs })
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error: any) {
    console.error("Error listing PDFs:", error)
    return NextResponse.json(
      { error: "Failed to list PDFs" },
      { status: 500 }
    )
  }
}
