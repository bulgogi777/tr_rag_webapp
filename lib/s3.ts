import AWS from "aws-sdk"

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  region: process.env.MINIO_REGION,
})

// Create S3 instance with specific configuration for MinIO
export const s3 = new AWS.S3({
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
  sslEnabled: true, // Enable SSL
  httpOptions: {
    timeout: 30000,
    connectTimeout: 30000
  },
})

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "trrag"

// Helper function to ensure bucket exists
export async function ensureBucket() {
  try {
    console.log("Checking bucket existence:", BUCKET_NAME)
    const params = {
      Bucket: BUCKET_NAME,
      ExpectedBucketOwner: s3.config.accessKeyId, // Add owner check
    }
    await s3.headBucket(params).promise()
    console.log("Successfully connected to bucket:", BUCKET_NAME)
    return true
  } catch (error: any) {
    console.error("Detailed bucket error:", {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
    })
    throw error
  }
}

// Helper function to test connection with retries
export async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Testing S3 connection (attempt ${i + 1}/${retries})...`)
      const result = await s3.listBuckets().promise()
      console.log("S3 connection successful:", result)
      return true
    } catch (error: any) {
      console.error(`S3 connection test failed (attempt ${i + 1}/${retries}):`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
              })

      if (i === retries - 1) {
        return false
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  return false
}

// Helper function to list objects with retries
export async function listObjects(prefix: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Listing objects with prefix: ${prefix} (attempt ${i + 1}/${retries})`)
      const params = {
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 1000,
      }
      const result = await s3.listObjectsV2(params).promise()
      console.log(`Successfully listed objects with prefix ${prefix}:`, result)
      return result
    } catch (error: any) {
      console.error(`Error listing objects (attempt ${i + 1}/${retries}):`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
      })

      if (i === retries - 1) {
        throw error
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error(`Failed to list objects after ${retries} attempts`)
}

// Helper function to generate signed URL
export function getSignedUrl(key: string) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: "inline",
    }
    return s3.getSignedUrl("getObject", params)
  } catch (error) {
    console.error("Error generating signed URL:", error)
    throw error
  }
}
