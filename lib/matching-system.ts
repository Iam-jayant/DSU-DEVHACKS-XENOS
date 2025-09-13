import { supabaseAdmin } from './supabase'

export async function setupAutoMatching() {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const sqlPath = process.cwd() + '/sql/auto_matching_triggers.sql'
  const fs = require('fs')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)

  // Execute each statement
  for (const statement of statements) {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: statement
    })

    if (error) {
      console.error('Error executing SQL:', error)
      throw error
    }
  }

  console.log('Auto-matching system setup completed')
}

// Function to verify a profile and trigger matching
export async function verifyProfile(profileId: string, type: 'donor' | 'recipient') {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')
  
  const table = type === 'donor' ? 'donor_profiles' : 'recipient_profiles'
  
  const { data, error } = await supabaseAdmin
    .from(table)
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: 'system' // or pass in the actual verifier's ID
    })
    .eq('id', profileId)
    .select()
    .single()

  if (error) {
    console.error(`Error verifying ${type} profile:`, error)
    throw error
  }

  return data
}

// Function to check matches for a specific profile
export async function checkMatches(userId: string) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const { data, error } = await supabaseAdmin
    .from('matches')
    .select(`
      id,
      total_score,
      urgency_score,
      location_score,
      wait_time_score,
      age_gap_score,
      donor:donor_profiles!donor_id(
        user:users(
          full_name,
          email
        ),
        blood_group,
        organ_type,
        age,
        city,
        state
      ),
      recipient:recipient_profiles!recipient_id(
        user:users(
          full_name,
          email
        ),
        blood_group,
        organ_type,
        age,
        city,
        state,
        urgency_level
      ),
      created_at
    `)
    .or(`donor_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('total_score', { ascending: false })

  if (error) {
    console.error('Error checking matches:', error)
    throw error
  }

  return data
}

// Function to check notifications for a user
export async function checkNotifications(userId: string) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error checking notifications:', error)
    throw error
  }

  return data
}