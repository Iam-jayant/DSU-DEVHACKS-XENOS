import { supabase } from "@/lib/supabase"

export interface DoctorProfile {
  id: string
  user_id: string
  specialization: string
  hospital: string
  license_number: string
  years_of_experience: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  role: "donor" | "recipient" | "doctor" | "admin"
  full_name: string | null
  phone: string | null
  profile_completed: boolean
  created_at: string
  updated_at: string
  doctorProfile?: DoctorProfile | null
}

export async function getCurrentUser() {
  try {
    // First get the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return { user: null, profile: null, error: sessionError }
    }

    // If no session, user is not logged in (this is normal, not an error)
    if (!session || !session.user) {
      return { user: null, profile: null, error: null }
    }

    const user = session.user

    // Fetch user profile from database
    const { data: userProfile, error: userProfileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    if (userProfileError) {
      console.error("Error fetching user profile:", userProfileError)
      return { user, profile: null, error: userProfileError }
    }

    if (!userProfile) {
      return { user, profile: null, error: new Error("No user profile found") }
    }

    // For doctors, always consider their profile as completed since they're pre-added
    if (userProfile.role === "doctor") {
      userProfile.profile_completed = true
    }

    return { user, profile: userProfile as UserProfile, error: null }
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return { user: null, profile: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error("Error signing out:", error)
    return { error }
  }
}

export function getRedirectPath(profile: UserProfile | null): string {
  if (!profile) return "/login"

  if (!profile.profile_completed) {
    return "/onboarding"
  }

  switch (profile.role) {
    case "doctor":
    case "admin":
      return "/dashboard/doctor"  // Always go to dashboard for doctors
    case "donor":
    case "recipient":
      return profile.profile_completed ? `/dashboard/${profile.role}` : "/onboarding"
    default:
      return "/dashboard"
  }
}

export function canAccessRole(userRole: string, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole)
  }
  return userRole === requiredRole
}
