import { NextResponse } from "next/server"
import { s3, BUCKET_NAME } from "@/lib/s3"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 }
    )
  }

  try {
    const key = `summaries/${decodeURIComponent(filename)}.md`
    const result = await s3
      .getObject({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      .promise()

    if (!result.Body) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      )
    }

    const content = result.Body.toString("utf-8")
    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error fetching summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    )
  }
}
