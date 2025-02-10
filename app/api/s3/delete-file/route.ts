import { NextResponse } from "next/server"
import { s3, BUCKET_NAME } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    const { pdfPath, hasSummary } = await request.json()
    
    if (!pdfPath) {
      return NextResponse.json({ error: "PDF path is required" }, { status: 400 })
    }

    console.log("[S3] Deleting files:", {
      pdf: pdfPath,
      hasSummary
    })

    // First verify the PDF exists
    try {
      await s3.headObject({
        Bucket: BUCKET_NAME,
        Key: pdfPath,
      }).promise()
    } catch (error: any) {
      console.error("[S3] PDF not found:", error)
      return NextResponse.json(
        { error: "PDF file not found" },
        { status: 404 }
      )
    }

    // Delete the PDF
    try {
      await s3
        .deleteObject({
          Bucket: BUCKET_NAME,
          Key: pdfPath,
        })
        .promise()
      console.log("[S3] Successfully deleted PDF:", pdfPath)
    } catch (error: any) {
      console.error("[S3] Failed to delete PDF:", error)
      throw error
    }

    // If there's a summary, delete it too
    if (hasSummary) {
      const summaryKey = `summaries/${pdfPath.replace("uploads/", "").replace(".pdf", ".md")}`
      
      // First verify the summary exists
      try {
        await s3.headObject({
          Bucket: BUCKET_NAME,
          Key: summaryKey,
        }).promise()
        
        // Summary exists, delete it
        try {
          await s3
            .deleteObject({
              Bucket: BUCKET_NAME,
              Key: summaryKey,
            })
            .promise()
          console.log("[S3] Successfully deleted summary:", summaryKey)
          
          // Verify summary was deleted
          try {
            await s3.headObject({
              Bucket: BUCKET_NAME,
              Key: summaryKey,
            }).promise()
            console.error("[S3] Summary file still exists after deletion:", summaryKey)
          } catch (error: any) {
            if (error.code === 'NotFound') {
              console.log("[S3] Verified summary deletion:", summaryKey)
            } else {
              console.error("[S3] Error verifying summary deletion:", error)
            }
          }
        } catch (error: any) {
          console.error("[S3] Failed to delete summary:", error)
          // Don't throw here, as the PDF was already deleted
        }
      } catch (error: any) {
        if (error.code === 'NotFound') {
          console.log("[S3] No summary file found to delete:", summaryKey)
        } else {
          console.error("[S3] Error checking summary existence:", error)
        }
      }
    }

    // Verify PDF was actually deleted
    try {
      await s3.headObject({
        Bucket: BUCKET_NAME,
        Key: pdfPath,
      }).promise()
      // If we get here, the file still exists
      throw new Error("File still exists after deletion")
    } catch (error: any) {
      if (error.code === 'NotFound') {
        // This is what we want - file is gone
        return NextResponse.json({ success: true })
      }
      throw error
    }
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
