import { Suspense } from "react"
import type { Metadata } from "next"
import DashboardWrapper from "@/components/dashboard-wrapper"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Real-time GCP outages monitoring and management dashboard",
}

// Enable static generation with revalidation
export const revalidate = 30

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardWrapper />
      </Suspense>
    </main>
  )
}
