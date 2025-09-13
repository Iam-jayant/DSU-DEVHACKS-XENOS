import { NextResponse } from "next/server"
import { findMatches } from "@/lib/matching-utils"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    // Get auth header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin or doctor
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || !["admin", "doctor"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const recipientId = body.recipientId // Optional: to match specific recipient

    // Run matching engine
    const { matches, error } = await findMatches(recipientId)

    if (error) {
      console.error("Matching error:", error)
      return NextResponse.json({ error: "Failed to run matching engine" }, { status: 500 })
    }

    return NextResponse.json({ matches })
  } catch (error) {
    console.error("Error in matching API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    // Get auth header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's role and profile
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get matches based on role
    if (userProfile.role === "recipient") {
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(`
          *,
          donor:donor_profiles(*)
        `)
        .eq("recipient_id", user.id)
        .order("score", { ascending: false })

      if (matchError) {
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
      }

      return NextResponse.json({ matches })
    }

    // For doctors/admins, return all matches
    if (["doctor", "admin"].includes(userProfile.role)) {
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(`
          *,
          donor:donor_profiles(*),
          recipient:recipient_profiles(*)
        `)
        .order("score", { ascending: false })

      if (matchError) {
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
      }

      return NextResponse.json({ matches })
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("Error in matching API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}