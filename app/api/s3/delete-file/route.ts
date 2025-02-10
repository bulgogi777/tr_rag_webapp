import { NextResponse } from "next/server"
import { s3, BUCKET_NAME } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    const { pdfPath, hasSummary } = await request.json()
    
    if (!pdfPath) {
      return NextResponse.json({ error: "PDF path is required" }, { status: 400 })
    }

    // Delete the PDF
    await s3
      .deleteObject({
        Bucket: BUCKET_NAME,
        Key: pdfPath,
      })
      .promise()

    // If there's a summary, delete it too
    if (hasSummary) {
      const summaryKey = `summaries/${pdfPath.replace("uploads/", "").replace(".pdf", ".md")}`
      await s3
        .deleteObject({
          Bucket: BUCKET_NAME,
          Key: summaryKey,
        })
        .promise()
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
