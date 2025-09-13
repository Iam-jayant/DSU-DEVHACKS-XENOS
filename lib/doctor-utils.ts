import { supabase } from './supabase'

export interface DoctorProfile {
  id: string
  user_id: string
  specialization: string
  license_number: string
  hospital_name: string
  city: string
  state: string
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
}

export async function getDoctorProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching doctor profile:', error)
      return null
    }

    return data as DoctorProfile
  } catch (error) {
    console.error('Error in getDoctorProfile:', error)
    return null
  }
}

export async function updateDoctorProfile(userId: string, profile: Partial<DoctorProfile>) {
  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .update(profile)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating doctor profile:', error)
      return null
    }

    return data as DoctorProfile
  } catch (error) {
    console.error('Error in updateDoctorProfile:', error)
    return null
  }
}