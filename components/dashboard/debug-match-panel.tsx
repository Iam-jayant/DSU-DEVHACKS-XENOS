"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle } from "lucide-react"

export type RecipientUrgency = "critical" | "high" | "medium" | "low";

interface Recipient {
  id: string;
  organ_type: string;
  blood_group: string;
  city: string;
  age_group: string;
  urgency_level: RecipientUrgency;
  verified_at: string;
  email: string;
  status: string;
  hospital_name: string | null;
  medical_condition: string;
  full_name: string;
  phone: string;
}

interface Donor {
  id: string;
  organ_type: string;
  blood_group: string;
  city: string;
  age_group: string;
  status: string;
  users?: {
    email: string;
    full_name: string;
    phone: string;
  }
}

const urgencyOrder: Record<RecipientUrgency, number> = { critical: 1, high: 2, medium: 3, low: 4 };

const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur",
  "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City",
  "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani",
  "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

export function DebugMatchingPanel({ doctorId, doctorName, doctorEmail }: { doctorId: string, doctorName: string, doctorEmail: string }) {
  const [filters, setFilters] = useState({
    organ_type: "",
    city: ""
  })
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  interface DebugState {
    allDonors?: any[];
    allRecipients?: any[];
    filteredDonors?: any[];
    filteredRecipients?: any[];
  }
  const [debug, setDebug] = useState<DebugState>({})

  // Fetch profiles when filters are filled
  useEffect(() => {
    const fetchProfiles = async () => {
      setError("")
      setRecipients([])
      setDonors([])
      if (!filters.organ_type || !filters.city) return

      setLoading(true)
      try {
        console.log("Fetching with filters:", filters)

        // Get all profiles first
        const [{ data: allDonors }, { data: allRecipients }] = await Promise.all([
          supabase.from("donor_profiles").select("*"),
          supabase.from("recipient_profiles").select("*")
        ]);

        // Update debug info with all profiles
        setDebug({
          allDonors: allDonors || [],
          allRecipients: allRecipients || [],
          filteredDonors: [],
          filteredRecipients: []
        });

        // Now do the filtered queries
        const [donorResponse, recipientResponse] = await Promise.all([
          supabase
            .from("donor_profiles")
            .select(`
              *,
              users:users!donor_profiles_user_id_fkey(
                email,
                full_name,
                phone
              )
            `)
            .eq("status", "verified")
            .eq("organ_type", filters.organ_type)
            .eq("city", filters.city),
          
          supabase
            .from("recipient_profiles")
            .select(`
              *,
              users:users!recipient_profiles_user_id_fkey(
                email,
                full_name,
                phone
              )
            `)
            .eq("status", "verified")
            .eq("organ_type", filters.organ_type)
            .eq("city", filters.city)
        ]);

        if (donorResponse.error) throw new Error(donorResponse.error.message);
        if (recipientResponse.error) throw new Error(recipientResponse.error.message);

        // Update debug info with filtered results
        setDebug(prev => ({
          ...prev,
          filteredDonors: donorResponse.data || [],
          filteredRecipients: recipientResponse.data || []
        }))

        // Process donors
        const donors = donorResponse.data || [];
        setDonors(donors);

        // Process recipients
        const recipientsWithUser = (recipientResponse.data || []).map(rec => ({
          id: rec.id,
          organ_type: rec.organ_type,
          blood_group: rec.blood_group,
          city: rec.city,
          age_group: rec.age_group,
          urgency_level: rec.urgency_level,
          verified_at: rec.verified_at,
          status: rec.status,
          hospital_name: rec.hospital_name,
          medical_condition: rec.medical_condition,
          email: rec.users?.email || "",
          full_name: rec.users?.full_name || "",
          phone: rec.users?.phone || ""
        }));

        // Sort recipients by urgency
        const sorted = recipientsWithUser.sort((a, b) => {
          const rankA = urgencyOrder[a.urgency_level as RecipientUrgency] || 99;
          const rankB = urgencyOrder[b.urgency_level as RecipientUrgency] || 99;
          if (rankA !== rankB) return rankA - rankB;
          return new Date(a.verified_at).getTime() - new Date(b.verified_at).getTime();
        });

        setRecipients(sorted);
      } catch (err) {
        console.error('Error in fetchProfiles:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [filters]);

  return (
    <div className="mb-10">
      <Card className="shadow-lg border border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Debug Matching Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Organ Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Organ Type</label>
              <select
                className="border rounded px-3 py-2 min-w-[120px]"
                value={filters.organ_type}
                onChange={e => setFilters(f => ({ ...f, organ_type: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="kidney">Kidney</option>
                <option value="liver">Liver</option>
                <option value="heart">Heart</option>
                <option value="lung">Lung</option>
                <option value="pancreas">Pancreas</option>
                <option value="cornea">Cornea</option>
                <option value="bone_marrow">Bone Marrow</option>
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">City (Maharashtra District)</label>
              <select
                className="border rounded px-3 py-2 min-w-[160px]"
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              >
                <option value="">Select</option>
                {MAHARASHTRA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="text-red-600 mb-2 font-medium">{error}</div>}
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Loader2 className="animate-spin h-5 w-5" />
              Loading profiles...
            </div>
          )}

          <div className="space-y-8">
            {/* Debug Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </div>

            {filters.organ_type && filters.city && (
              <>
                {/* Show Donors */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Available Donors ({donors.length})</h3>
                  {donors.length === 0 ? (
                    <div className="text-gray-500">No matching donors found.</div>
                  ) : (
                    <ul className="space-y-4">
                      {donors.map((donor: any) => (
                        <Card key={donor.id} className="border border-green-100 shadow-md bg-green-50">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                              <div>
                                <div className="font-semibold text-lg text-green-900">{donor.users?.full_name}</div>
                                <div className="text-sm text-gray-700"><b>Email:</b> {donor.users?.email}</div>
                                <div className="text-sm text-gray-700"><b>Phone:</b> {donor.users?.phone}</div>
                                <div className="text-sm text-gray-700"><b>Status:</b> {donor.status}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-700"><b>Organ:</b> {donor.organ_type}</div>
                                <div className="text-sm text-gray-700"><b>City:</b> {donor.city}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Show Recipients */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Waiting Recipients ({recipients.length})</h3>
                  {recipients.length === 0 ? (
                    <div className="text-gray-500">No matching recipients found.</div>
                  ) : (
                    <ul className="space-y-4">
                      {recipients.map((rec) => (
                        <Card key={rec.id} className="border border-blue-100 shadow-md bg-blue-50">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                              <div>
                                <div className="font-semibold text-lg text-blue-900">{rec.full_name}</div>
                                <div className="text-sm text-gray-700"><b>Email:</b> {rec.email}</div>
                                <div className="text-sm text-gray-700"><b>Phone:</b> {rec.phone}</div>
                                <div className="text-sm text-gray-700"><b>Status:</b> {rec.status}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-700">
                                  <b>Urgency:</b> 
                                  <Badge className={`ml-1 ${
                                    rec.urgency_level === 'critical' ? 'bg-red-100 text-red-800' : 
                                    rec.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' : 
                                    rec.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {rec.urgency_level}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-700"><b>Organ:</b> {rec.organ_type}</div>
                                <div className="text-sm text-gray-700"><b>City:</b> {rec.city}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}