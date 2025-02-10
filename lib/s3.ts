import AWS from "aws-sdk"

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  region: process.env.MINIO_REGION,
})

// Validate required environment variables
function validateConfig() {
  const required = [
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET_NAME'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('[S3] Missing required environment variables:', missing);
    throw new Error(`Missing required S3 configuration: ${missing.join(', ')}`);
  }
}

validateConfig();

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

// Log S3 configuration (without sensitive values)
console.log('[S3] Configuration:', {
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.MINIO_REGION,
  hasAccessKey: !!process.env.MINIO_ACCESS_KEY,
  hasSecretKey: !!process.env.MINIO_SECRET_KEY,
  bucket: process.env.MINIO_BUCKET_NAME,
  forcePathStyle: true,
  signatureVersion: "v4",
  sslEnabled: true
});

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
      console.log(`[S3] Listing objects attempt ${i + 1}/${retries}:`, {
        bucket: BUCKET_NAME,
        prefix,
        endpoint: s3.config.endpoint,
        region: s3.config.region
      })

      const params = {
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 1000,
      }

      console.log("[S3] ListObjectsV2 params:", params)
      const result = await s3.listObjectsV2(params).promise()
      
      console.log(`[S3] List operation successful for ${prefix}:`, {
        itemCount: result.Contents?.length || 0,
        isTruncated: result.IsTruncated,
        keyCount: result.KeyCount
      })

      // Log the first few items for verification
      if (result.Contents && result.Contents.length > 0) {
        console.log("[S3] First few items:", result.Contents.slice(0, 3).map(item => ({
          key: item.Key,
          size: item.Size,
          modified: item.LastModified
        })))
      } else {
        console.log("[S3] No items found in prefix:", prefix)
      }

      return result
    } catch (error: any) {
      console.error(`[S3] Error listing objects (attempt ${i + 1}/${retries}):`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
        requestId: error.requestId,
        region: error.region,
        hostname: error.hostname,
        time: error.time,
        stack: error.stack
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
