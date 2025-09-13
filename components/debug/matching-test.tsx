"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function MatchingTest() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState("")

  const runTest = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/matching/test")
      const data = await response.json()

      if (response.ok) {
        setTestResults(data.testData)
      } else {
        setError(data.error || "Test failed")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cleanupTest = async () => {
    setLoading(true)
    try {
      await fetch("/api/matching/test", { method: "DELETE" })
      setTestResults(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Matching Engine Test</CardTitle>
          <CardDescription>Test the matching engine and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={runTest} disabled={loading}>
                {loading ? "Running Test..." : "Run Test"}
              </Button>
              <Button onClick={cleanupTest} disabled={loading} variant="outline">
                Clean Up Test Data
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {testResults && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Test Data Created:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Test Donor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-gray-500">Blood Group</dt>
                            <dd>{testResults.donor.blood_group}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Age</dt>
                            <dd>{testResults.donor.age}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Location</dt>
                            <dd>{testResults.donor.city}, {testResults.donor.state}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Test Recipient</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-gray-500">Blood Group</dt>
                            <dd>{testResults.recipient.blood_group}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Age</dt>
                            <dd>{testResults.recipient.age}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Urgency</dt>
                            <dd>
                              <Badge variant="secondary">
                                {testResults.recipient.urgency_level}
                              </Badge>
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {testResults.matches?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Match Results:</h3>
                    {testResults.matches.map((match: any, index: number) => (
                      <Card key={index} className="mb-4">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Match Score: {Math.round(match.totalScore)}%</p>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Urgency Score:</span>{" "}
                                  {Math.round(match.urgencyScore)}%
                                </div>
                                <div>
                                  <span className="text-gray-500">Location Score:</span>{" "}
                                  {Math.round(match.locationScore)}%
                                </div>
                                <div>
                                  <span className="text-gray-500">Wait Time Score:</span>{" "}
                                  {Math.round(match.waitTimeScore)}%
                                </div>
                                <div>
                                  <span className="text-gray-500">Age Gap Score:</span>{" "}
                                  {Math.round(match.ageGapScore)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {testResults.notifications?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Notifications Generated:</h3>
                    {testResults.notifications.map((notif: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <p className="font-medium">{notif.title}</p>
                          <p className="text-sm text-gray-600">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}