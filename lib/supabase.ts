import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client with error handling
function initSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, throw a helpful error
    if (process.env.NODE_ENV === 'development') {
      console.error('Missing Supabase environment variables:', {
        url: !supabaseUrl ? 'Missing NEXT_PUBLIC_SUPABASE_URL' : 'OK',
        key: !supabaseAnonKey ? 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'OK'
      })
    }
    // Return a dummy client in production to prevent crashes
    return createClient('https://placeholder.supabase.co', 'dummy-key')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

export const supabase = initSupabaseClient()

// Service role client for admin/test operations
export const supabaseAdmin = typeof window === 'undefined' 
  ? (() => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!url || !serviceRoleKey) {
        throw new Error('Missing Supabase admin credentials')
      }

      return createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    })()
  : null

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: "donor" | "recipient" | "doctor" | "admin"
          full_name: string | null
          phone: string | null
          preferred_language: string
          profile_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: "donor" | "recipient" | "doctor" | "admin"
          full_name?: string | null
          phone?: string | null
          preferred_language?: string
          profile_completed?: boolean
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          preferred_language?: string
          profile_completed?: boolean
        }
      }
      donor_profiles: {
        Row: {
          id: string
          user_id: string
          organ_type: string
          blood_group: string
          age: number
          age_group: "pediatric" | "adult"
          city: string
          state: string
          pincode: string | null
          address: string | null
          medical_history: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          status: "incomplete" | "pending" | "verified" | "matched" | "rejected"
          verification_notes: string | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
      }
      recipient_profiles: {
        Row: {
          id: string
          user_id: string
          organ_type: string
          blood_group: string
          age: number
          age_group: "pediatric" | "adult"
          city: string
          state: string
          pincode: string | null
          address: string | null
          urgency_level: "critical" | "high" | "medium"
          medical_condition: string
          hospital_name: string | null
          doctor_name: string | null
          doctor_contact: string | null
          insurance_details: string | null
          status: "incomplete" | "pending" | "verified" | "matched" | "rejected"
          verification_notes: string | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
      }
      doctor_profiles: {
        Row: {
          id: string
          user_id: string
          specialization: string
          hospital: string
          license_number: string
          years_of_experience: number
          additional_info: {
            qualification: string
            department: string
            hospital_address: string
            contact_hours: string
            emergency_contact: boolean
          } | null
          created_at: string
          updated_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          metadata: any
          created_at: string
        }
      }
    }
  }
}
