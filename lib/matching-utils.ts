import { supabase } from "./supabase"

export interface MatchScore {
  recipientId: string
  donorId: string
  urgencyScore: number
  locationScore: number
  waitTimeScore: number
  ageGapScore: number
  totalScore: number
}

// Calculate urgency score (40% weight)
function calculateUrgencyScore(urgencyLevel: string): number {
  switch (urgencyLevel.toLowerCase()) {
    case "critical":
      return 100
    case "high":
      return 70
    case "medium":
      return 40
    default:
      return 10
  }
}

// Calculate location score (30% weight)
function calculateLocationScore(donorLocation: { city: string; state: string }, 
                             recipientLocation: { city: string; state: string }): number {
  if (donorLocation.city === recipientLocation.city) {
    return 80 // Same city
  } else if (donorLocation.state === recipientLocation.state) {
    return 50 // Same state
  }
  return 20 // Same country
}

// Calculate wait time score (20% weight)
function calculateWaitTimeScore(createdAt: string): number {
  const waitTimeMonths = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  
  if (waitTimeMonths >= 12) {
    return 100
  } else if (waitTimeMonths >= 6) {
    return 70
  } else if (waitTimeMonths >= 1) {
    return 40
  }
  return 10
}

// Calculate age gap score (10% weight)
function calculateAgeGapScore(donorAge: number, recipientAge: number): number {
  const ageGap = Math.abs(donorAge - recipientAge)
  
  if (ageGap <= 10) {
    return 100
  } else if (ageGap <= 20) {
    return 70
  } else if (ageGap <= 30) {
    return 40
  }
  return 10
}

// Calculate final match score
function calculateMatchScore(
  recipient: any,
  donor: any,
): MatchScore {
  const urgencyScore = calculateUrgencyScore(recipient.urgency_level)
  const locationScore = calculateLocationScore(
    { city: donor.city, state: donor.state },
    { city: recipient.city, state: recipient.state }
  )
  const waitTimeScore = calculateWaitTimeScore(recipient.created_at)
  const ageGapScore = calculateAgeGapScore(donor.age, recipient.age)

  const totalScore = ( (urgencyScore * 0.4) + (locationScore * 0.3) + (waitTimeScore * 0.2) + (ageGapScore * 0.1) )

  return {
    recipientId: recipient.id,
    donorId: donor.id,
    urgencyScore,
    locationScore,
    waitTimeScore,
    ageGapScore,
    totalScore
  }
}

// Check if donor and recipient are compatible
function areCompatible(donor: any, recipient: any): boolean {
  // Blood group compatibility check
  const bloodCompatibility: { [key: string]: string[] } = {
    'A+': ['A+', 'AB+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-'],
    'O+': ['A+', 'B+', 'AB+', 'O+'],
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  }

  // Check blood type compatibility
  if (!bloodCompatibility[donor.blood_group]?.includes(recipient.blood_group)) {
    return false
  }

  // Check organ type match
  if (donor.organ_type !== recipient.organ_type) {
    return false
  }

  // Check age group compatibility
  if (donor.age_group !== recipient.age_group) {
    return false
  }

  return true
}

// Main matching function
export async function findMatches(recipientId?: string) {
  try {
    // Get all verified donors
    const { data: donors, error: donorError } = await supabase
      .from('donor_profiles')
      .select('*')
      .eq('status', 'verified')

    if (donorError) throw donorError

    // Get recipients to match
    const recipientQuery = supabase
      .from('recipient_profiles')
      .select('*')
      .eq('status', 'verified')
      
    // If recipientId is provided, only match that specific recipient
    if (recipientId) {
      recipientQuery.eq('id', recipientId)
    }

    const { data: recipients, error: recipientError } = await recipientQuery

    if (recipientError) throw recipientError

    const matches: MatchScore[] = []

    // For each recipient, find matching donors
    for (const recipient of recipients) {
      const compatibleDonors = donors.filter(donor => areCompatible(donor, recipient))
      
      // Calculate scores for each compatible donor
      const scores = compatibleDonors.map(donor => calculateMatchScore(recipient, donor))
      
      // Sort by score and add to matches
      scores.sort((a, b) => b.totalScore - a.totalScore)
      matches.push(...scores)
    }

    // Store matches in database
    if (matches.length > 0) {
      const { error: matchError } = await supabase.from('matches').upsert(
        matches.map(match => ({
          recipient_id: match.recipientId,
          donor_id: match.donorId,
          score: match.totalScore,
          urgency_score: match.urgencyScore,
          location_score: match.locationScore,
          wait_time_score: match.waitTimeScore,
          age_gap_score: match.ageGapScore,
          status: 'pending'
        }))
      )

      if (matchError) throw matchError
    }

    return { matches, error: null }
  } catch (error) {
    console.error('Error in findMatches:', error)
    return { matches: [], error }
  }
}
