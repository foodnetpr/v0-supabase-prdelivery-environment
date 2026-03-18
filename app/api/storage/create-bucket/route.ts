import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    // Use service role to create bucket (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      console.error("[v0] Error listing buckets:", listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const bucketExists = buckets?.some(b => b.name === "images")

    if (bucketExists) {
      return NextResponse.json({ message: "Bucket 'images' already exists", exists: true })
    }

    // Create the bucket
    const { data, error: createError } = await supabaseAdmin.storage.createBucket("images", {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    })

    if (createError) {
      console.error("[v0] Error creating bucket:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Bucket 'images' created successfully", data })
  } catch (err) {
    console.error("[v0] Unexpected error:", err)
    return NextResponse.json({ error: "Failed to create bucket" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ buckets })
  } catch (err) {
    return NextResponse.json({ error: "Failed to list buckets" }, { status: 500 })
  }
}
