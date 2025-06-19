import type { Metadata } from "next"
import DashboardWrapper from "../components/dashboard-wrapper"

export const metadata: Metadata = {
  title: "GCP Planned Outages",
  description: "Comprehensive dashboard for tracking GCP platform outages, uptime metrics, and scheduling maintenance",
}

export default function Page() {
  return <DashboardWrapper />
}
