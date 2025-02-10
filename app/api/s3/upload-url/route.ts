import { NextResponse } from "next/server"
import { s3, BUCKET_NAME } from "@/lib/s3"

export async function POST(request: Request) {
  try {
    const { filename } = await request.json()
    
    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const key = `uploads/${filename}`

    // Check if file already exists
    try {
      await s3.headObject({
        Bucket: BUCKET_NAME,
        Key: key,
      }).promise()

      // If we get here, the file exists
      return NextResponse.json(
        { error: "A file with this name already exists" },
        { status: 409 }
      )
    } catch (error: any) {
      // If error code is 404, file doesn't exist which is what we want
      if (error.code !== 'NotFound') {
        throw error
      }
    }

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
