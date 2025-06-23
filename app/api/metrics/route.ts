import { type NextRequest, NextResponse } from "next/server"
import { getOutages, generateReportData } from "@/actions/data-actions"
import { calculateDataAccuracy, generateDataIntegrityReport } from "@/lib/enhanced-data-validation"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeValidation = searchParams.get("includeValidation") === "true"

    // Get all outages
    const outages = await getOutages()

    // Generate basic report data
    const reportData = await generateReportData()

    // Enhanced metrics with validation
    const enhancedMetrics = {
      ...reportData,
      summary: {
        ...reportData.summary,
        dataAccuracy: calculateDataAccuracy(outages),
        lastValidated: new Date(),
      },
    }

    if (includeValidation) {
      // Add data integrity report
      const integrityReport = generateDataIntegrityReport(outages)
      enhancedMetrics.dataIntegrity = integrityReport

      // Add trend analysis
      enhancedMetrics.trends = generateTrendAnalysis(outages)
    }

    return NextResponse.json(enhancedMetrics)
  } catch (error) {
    console.error("Error generating metrics:", error)
    return NextResponse.json({ error: "Failed to generate metrics" }, { status: 500 })
  }
}

function generateTrendAnalysis(outages: any[]) {
  const now = new Date()
  const periods = ["Last 30 days", "Last 60 days", "Last 90 days"]

  const trends = {
    outageFrequency: periods.map((period) => {
      const days = period === "Last 30 days" ? 30 : period === "Last 60 days" ? 60 : 90
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const count = outages.filter((o) => new Date(o.startDate) >= cutoff).length

      // Simple trend calculation (compare with previous period)
      const prevCutoff = new Date(cutoff.getTime() - days * 24 * 60 * 60 * 1000)
      const prevCount = outages.filter(
        (o) => new Date(o.startDate) >= prevCutoff && new Date(o.startDate) < cutoff,
      ).length

      const trend = count > prevCount ? "up" : count < prevCount ? "down" : "stable"

      return { period, count, trend }
    }),
    mttr: periods.map((period) => {
      const days = period === "Last 30 days" ? 30 : period === "Last 60 days" ? 60 : 90
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const periodOutages = outages.filter((o) => new Date(o.startDate) >= cutoff)

      const avgHours =
        periodOutages.length > 0
          ? periodOutages.reduce(
              (acc, o) => acc + (new Date(o.endDate).getTime() - new Date(o.startDate).getTime()) / (1000 * 60 * 60),
              0,
            ) / periodOutages.length
          : 0

      return { period, hours: Math.round(avgHours * 10) / 10, trend: "stable" as const }
    }),
    userImpact: periods.map((period) => {
      const days = period === "Last 30 days" ? 30 : period === "Last 60 days" ? 60 : 90
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const users = outages
        .filter((o) => new Date(o.startDate) >= cutoff)
        .reduce((acc, o) => acc + (o.estimatedUsers || 0), 0)

      return { period, users, trend: "stable" as const }
    }),
  }

  return trends
}
