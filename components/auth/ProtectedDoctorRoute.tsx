"use client"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProtectedDoctorRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push("/login")
        return
      }
      
      if (profile.role !== "doctor") {
        router.push("/dashboard")
        return
      }

      // No need to check for profile completion since doctors are pre-added
    }
  }, [profile, loading, router])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!profile || profile.role !== "doctor") {
    return null
  }

  return <>{children}</>
}