import { NextResponse } from "next/server"
import { s3, BUCKET_NAME, listObjects } from "@/lib/s3"

export async function GET() {
  try {
    const uploadsList = await listObjects("uploads/")
    const summariesList = await listObjects("summaries/")

    console.log("Summaries list:", JSON.stringify(summariesList, null, 2))
    
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

    return NextResponse.json({ pdfs: validPdfs })
  } catch (error: any) {
    console.error("Error listing PDFs:", error)
    return NextResponse.json(
      { error: "Failed to list PDFs" },
      { status: 500 }
    )
  }
}
