"use client"

import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard"
import { useAuth } from "@/contexts/auth-context"
import ProtectedDoctorRoute from "@/components/auth/ProtectedDoctorRoute"

export default function DoctorDashboardPage() {
  const { user } = useAuth()

  return (
    <ProtectedDoctorRoute>
      <DoctorDashboard user={user} />
    </ProtectedDoctorRoute>
  )
}
