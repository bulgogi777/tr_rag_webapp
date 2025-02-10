import { NextResponse } from "next/server"
import { s3, BUCKET_NAME } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    const { filename } = await request.json()
    
    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const key = `uploads/${filename}`
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: 3600,
      ContentType: "application/pdf",
      ACL: "private",
    }

    const uploadUrl = s3.getSignedUrl("putObject", params)
    
    return NextResponse.json({ 
      uploadUrl,
      key
    })
  } catch (error: any) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    )
  }
}
