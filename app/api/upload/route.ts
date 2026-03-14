import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Add any validation or authentication here
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
          tokenPayload: JSON.stringify({}),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("[v0] Image uploaded:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
