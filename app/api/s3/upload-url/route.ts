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
    
    // Log the upload attempt
    console.log("[S3] Generated upload URL:", {
      bucket: BUCKET_NAME,
      key,
      contentType: params.ContentType,
      expires: params.Expires,
      endpoint: s3.config.endpoint
    })

    // Add a HEAD request check after a short delay to verify upload
    const verifyUpload = async () => {
      try {
        // Wait 5 seconds to allow for upload completion
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const headParams = {
          Bucket: BUCKET_NAME,
          Key: key
        }
        
        await s3.headObject(headParams).promise()
        console.log("[S3] Upload verified successfully:", key)
        return true
      } catch (error: any) {
        console.error("[S3] Upload verification failed:", {
          key,
          error: error.message,
          code: error.code,
          statusCode: error.statusCode
        })
        return false
      }
    }

    // Start verification in background but don't wait for it
    verifyUpload()
    
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
