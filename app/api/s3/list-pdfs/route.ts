import { NextResponse } from "next/server"
import { s3, BUCKET_NAME, listObjects } from "@/lib/s3"

export async function GET() {
  try {
    const uploadsList = await listObjects("uploads/")
    const summariesList = await listObjects("summaries/")

    const summaryFiles = new Set(
      (summariesList.Contents || [])
        .map((item) => item.Key?.replace("summaries/", "").replace(".md", ""))
        .filter(Boolean)
    )

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
