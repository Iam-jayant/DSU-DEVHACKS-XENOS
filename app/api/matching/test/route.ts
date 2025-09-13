import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyProfile, checkMatches } from "@/lib/matching-system"

// Only allow in development and test environments
const isTestingAllowed = process.env.NODE_ENV !== "production"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

// Create admin client for server-side operations
const adminClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: Request) {
  if (!isTestingAllowed) {
    return NextResponse.json({ error: "Testing not allowed in production" }, { status: 403 })
  }

  try {
    // Create test auth users first
    const donorId = crypto.randomUUID()
    const recipientId = crypto.randomUUID()

    // Create auth users first
    const { error: donorAuthError } = await adminClient.auth.admin.createUser({
      id: donorId,
      email: "testdonor@example.com",
      password: "test123456",
      user_metadata: {
        full_name: "Test Donor"
      }
    })

    if (donorAuthError) {
      console.error("Error creating test donor auth user:", donorAuthError)
      return NextResponse.json({ error: "Failed to create test donor auth user" }, { status: 500 })
    }

    const { error: recipientAuthError } = await adminClient.auth.admin.createUser({
      id: recipientId,
      email: "testrecipient@example.com",
      password: "test123456",
      user_metadata: {
        full_name: "Test Recipient"
      }
    })

    if (recipientAuthError) {
      console.error("Error creating test recipient auth user:", recipientAuthError)
      return NextResponse.json({ error: "Failed to create test recipient auth user" }, { status: 500 })
    }

    // Now create the public users
    const { data: donorUser, error: donorUserError } = await adminClient.from("users").insert({
      id: donorId,
      email: "testdonor@example.com",
      role: "donor",
      profile_completed: true,
      full_name: "Test Donor"
    }).select().single()

    if (donorUserError) {
      console.error("Error creating test donor user:", donorUserError)
      return NextResponse.json({ error: "Failed to create test donor user" }, { status: 500 })
    }

    const { data: recipientUser, error: recipientUserError } = await adminClient.from("users").insert({
      id: recipientId,
      email: "testrecipient@example.com",
      role: "recipient",
      profile_completed: true,
      full_name: "Test Recipient"
    }).select().single()

    if (recipientUserError) {
      console.error("Error creating test recipient user:", recipientUserError)
      return NextResponse.json({ error: "Failed to create test recipient user" }, { status: 500 })
    }

    // Create test donor profile
    const { data: donor, error: donorError } = await adminClient.from("donor_profiles").insert({
      user_id: donorUser.id,
      organ_type: "kidney",
      blood_group: "B+",
      age: 36,
      age_group: "adult",
      city: "Bangalore",
      state: "Karnataka",
      status: "verified",
      created_at: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000).toISOString() // 8 months ago
    }).select().single()

    if (donorError) {
      console.error("Error creating test donor:", donorError)
      return NextResponse.json({ error: "Failed to create test donor" }, { status: 500 })
    }

    // Create test recipient profile
    const { data: recipient, error: recipientError } = await adminClient.from("recipient_profiles").insert({
      user_id: recipientUser.id,
      organ_type: "kidney",
      blood_group: "B+",
      age: 35,
      age_group: "adult",
      city: "Bangalore",
      state: "Karnataka",
      urgency_level: "high",
      medical_condition: "Chronic kidney disease",
      status: "verified",
      created_at: new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000).toISOString() // 7 months ago
    }).select().single()

    if (recipientError) {
      console.error("Error creating test recipient:", recipientError)
      return NextResponse.json({ error: "Failed to create test recipient" }, { status: 500 })
    }

    // Run the matching engine by triggering verification
    const { donor: donorMatch } = await verifyProfile(donor.id, 'donor')
    const { recipient: recipientMatch } = await verifyProfile(recipient.id, 'recipient')

    // Get matches
    const matches = await checkMatches(recipient.user_id)

    // Get notifications generated
    const { data: notifications, error: notifError } = await adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", recipientUser.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (notifError) {
      console.error("Error fetching notifications:", notifError)
    }

    return NextResponse.json({
      message: "Test completed successfully",
      testData: {
        donor,
        recipient,
        matches,
        notifications
      }
    })
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!isTestingAllowed) {
    return NextResponse.json({ error: "Testing not allowed in production" }, { status: 403 })
  }

  try {
    // Get test users to clean up
    const { data: testUsers } = await adminClient
      .from("users")
      .select("id")
      .in("email", ["testdonor@example.com", "testrecipient@example.com"])

    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map((u: { id: string }) => u.id)
      
      // Clean up test data in order (due to foreign key constraints)
      await adminClient.from("matches").delete().in("donor_id", userIds)
      await adminClient.from("notifications").delete().in("user_id", userIds)
      await adminClient.from("donor_profiles").delete().in("user_id", userIds)
      await adminClient.from("recipient_profiles").delete().in("user_id", userIds)
      await adminClient.from("users").delete().in("id", userIds)

      // Clean up auth users
      for (const id of userIds) {
        await adminClient.auth.admin.deleteUser(id)
      }
    }

    return NextResponse.json({ message: "Test data cleaned up successfully" })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}