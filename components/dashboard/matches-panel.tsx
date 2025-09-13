import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, MapPin, Calendar, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Match {
  id: string
  score: number
  urgency_score: number
  location_score: number
  wait_time_score: number
  age_gap_score: number
  status: "pending" | "accepted" | "rejected"
  donor: any
}

export function MatchesPanel() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadMatches()

    // Subscribe to match notifications
    const channel = supabase
      .channel('matches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches'
      }, () => {
        loadMatches()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const loadMatches = async () => {
    try {
      const response = await fetch("/api/matching", {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      if (!response.ok) throw new Error("Failed to fetch matches")
      
      const data = await response.json()
      setMatches(data.matches || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Matches Found Yet</h3>
            <p className="text-gray-500">
              We're actively looking for compatible donors. You'll be notified when we find a match.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Potential Matches</CardTitle>
          <CardDescription>
            Found {matches.length} potential {matches.length === 1 ? "match" : "matches"} for you
          </CardDescription>
        </CardHeader>
      </Card>

      {matches.map((match) => (
        <Card key={match.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant={match.status === "pending" ? "secondary" : match.status === "accepted" ? "default" : "destructive"}>
                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Match Score: {Math.round(match.score)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{match.donor.city}, {match.donor.state}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserRound className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Age: {match.donor.age}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Blood Group: {match.donor.blood_group}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Registered: {new Date(match.donor.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Match Details</div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                    <div>Urgency Score: {Math.round(match.urgency_score)}%</div>
                    <div>Location Score: {Math.round(match.location_score)}%</div>
                    <div>Wait Time Score: {Math.round(match.wait_time_score)}%</div>
                    <div>Age Gap Score: {Math.round(match.age_gap_score)}%</div>
                  </div>
                </div>
              </div>

              {match.status === "pending" && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Contact Doctor
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}