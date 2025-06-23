"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, Calendar, AlertTriangle, TrendingUp, PieChart, FileText, Brain } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Activity,
  Target,
  Shield,
  Timer,
  FileDown,
  Presentation,
  Globe,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  BarChart2,
  Gauge,
  Wifi,
  Cpu,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import outagesRaw from "@/data/outages.json"
import { MLPredictionsDashboard } from "./ml-predictions-dashboard"

interface ReportData {
  summary: {
    totalOutages: number
    upcomingOutages: number
    pastOutages: number
    ongoingOutages: number
    totalDowntime: number
    averageDowntime: number
    totalUsersAffected: number
    mttr?: number
    mtbf?: number
    availability?: number
    slaCompliance?: number
    incidentRate?: number
    // New advanced metrics
    criticalOutages?: number
    plannedVsUnplanned?: { planned: number; unplanned: number }
    recoveryRate?: number
    escalationRate?: number
    repeatOffenders?: number
    businessImpactScore?: number
    costImpact?: number
    customerSatisfactionImpact?: number
    complianceScore?: number
    riskScore?: number
    preventionEffectiveness?: number
    communicationScore?: number
    resourceUtilization?: number
    automationRate?: number
    learningRate?: number
  }
  breakdowns: {
    severity: Record<string, number>
    type: Record<string, number>
    environment: Record<string, number>
    // New breakdowns
    duration: Record<string, number>
    timeOfDay: Record<string, number>
    dayOfWeek: Record<string, number>
    month: Record<string, number>
    assignee: Record<string, number>
    category: Record<string, number>
    rootCause: Record<string, number>
  }
  trends: {
    monthly: Array<{ month: string; outages: number; downtime: number; users: number }>
    weekly: Array<{ week: string; outages: number; mttr: number; availability: number }>
    daily: Array<{ day: string; incidents: number; resolved: number; pending: number }>
  }
  recentOutages: any[]
  upcomingOutages: any[]
  benchmarks: {
    industryMTTR: number
    industryAvailability: number
    targetSLA: number
    bestPracticeScore: number
  }
}

const COLORS = {
  High: "#dc2626",
  Medium: "#d97706",
  Low: "#16a34a",
  Internal: "#7c3aed",
  External: "#1d4ed8",
  POC: "#3b82f6",
  "SBX DEV": "#10b981",
  "SBX UAT": "#f59e0b",
  "SBX Beta": "#f97316",
  PROD: "#ef4444",
  // Additional colors for new metrics
  Critical: "#dc2626",
  Warning: "#f59e0b",
  Good: "#10b981",
  Excellent: "#059669",
}

export function InteractiveReport() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    dateRange: "all",
    severity: "all",
    environment: "all",
    outageType: "all",
    assignee: "all",
    timeRange: "all",
  })

  const timeRangeOptions = [
    { value: "all", label: "All Time" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last30days", label: "Last 30 Days" },
    { value: "last3months", label: "Last 3 Months" },
    { value: "last6months", label: "Last 6 Months" },
    { value: "lastyear", label: "Last Year" },
    { value: "ytd", label: "Year to Date" },
    { value: "custom", label: "Custom Range" },
  ]

  const [customTimeRange, setCustomTimeRange] = useState({
    start: "",
    end: "",
  })

  const [filteredData, setFilteredData] = useState<ReportData | null>(null)

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = () => {
    setLoading(true)
    try {
      // Re-hydrate date fields
      const outages = outagesRaw.map((o) => ({
        ...o,
        startDate: new Date(o.startDate),
        endDate: new Date(o.endDate),
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      }))

      const now = new Date()
      const upcoming = outages.filter((o) => o.startDate > now)
      const past = outages.filter((o) => o.endDate < now)
      const ongoing = outages.filter((o) => o.startDate <= now && o.endDate >= now)

      function sum<T>(arr: T[], fn: (v: T) => number): number {
        return arr.reduce((acc, cur) => acc + fn(cur), 0)
      }

      const totalDowntime = sum(outages, (o) => (+o.endDate - +o.startDate) / 36e5)
      const avgDowntime = outages.length ? totalDowntime / outages.length : 0
      const usersAffected = sum(outages, (o: any) => o.estimatedUsers || 0)

      // generic countBy that works for any property name
      function countBy<T extends Record<string, any>>(arr: T[], key: keyof T): Record<string, number> {
        return arr.reduce<Record<string, number>>((acc, cur) => {
          const val = cur[key]
          if (Array.isArray(val)) {
            val.forEach((v) => (acc[v] = (acc[v] || 0) + 1))
          } else {
            const k = String(val)
            acc[k] = (acc[k] || 0) + 1
          }
          return acc
        }, {})
      }

      // Advanced metrics calculations based on actual data
      const criticalOutages = outages.filter((o) => o.severity === "High").length
      const mediumOutages = outages.filter((o) => o.severity === "Medium").length
      const lowOutages = outages.filter((o) => o.severity === "Low").length

      // Calculate MTTR (Mean Time To Recovery) in hours
      const mttr = avgDowntime

      // Calculate MTBF (Mean Time Between Failures) - assume 30 days between outages on average
      const mtbf = outages.length > 1 ? (30 * 24) / outages.length : 720

      // Calculate availability based on total downtime vs total time (assume 8760 hours/year)
      const availability = Math.max(0, 100 - (totalDowntime / 8760) * 100)

      // SLA Compliance - based on severity and duration
      const slaViolations = outages.filter((o) => {
        const duration = (+o.endDate - +o.startDate) / 36e5
        return (
          (o.severity === "High" && duration > 1) ||
          (o.severity === "Medium" && duration > 4) ||
          (o.severity === "Low" && duration > 8)
        )
      }).length
      const slaCompliance = Math.max(0, 100 - (slaViolations / outages.length) * 100)

      // Recovery Rate - percentage of outages that are resolved
      const recoveryRate = past.length > 0 ? (past.length / outages.length) * 100 : 100

      // Escalation Rate - percentage of high severity outages
      const escalationRate = outages.length > 0 ? (criticalOutages / outages.length) * 100 : 0

      // Business Impact Score - based on users affected and severity
      const businessImpactScore = Math.max(0, 100 - (criticalOutages * 20 + mediumOutages * 10 + lowOutages * 5))

      // Cost Impact - estimated based on users affected and downtime
      const costImpact = usersAffected * 0.5 + totalDowntime * 100

      // Risk Score - based on critical outages and escalation rate
      const riskScore = Math.min(100, criticalOutages * 20 + escalationRate * 2)

      // Prevention Effectiveness - based on planned vs unplanned outages
      const plannedOutages = outages.filter(
        (o) => o.type === "Maintenance" || o.type === "Upgrade" || o.type === "Migration",
      ).length
      const preventionEffectiveness = outages.length > 0 ? (plannedOutages / outages.length) * 100 : 0

      // Communication Score - simulated based on contact info availability
      const communicationScore = (outages.filter((o) => o.contactEmail).length / outages.length) * 100

      // Automation Rate - simulated
      const automationRate = 83.2

      // Generate realistic trend data based on actual outages
      const monthlyTrends = generateMonthlyTrends(outages)
      const weeklyTrends = generateWeeklyTrends(outages)
      const dailyTrends = generateDailyTrends(outages)

      // Duration breakdown based on actual outage durations
      const durationBreakdown = outages.reduce(
        (acc, o) => {
          const duration = (+o.endDate - +o.startDate) / 36e5
          let category = "> 8 hours"
          if (duration <= 1) category = "< 1 hour"
          else if (duration <= 4) category = "1-4 hours"
          else if (duration <= 8) category = "4-8 hours"
          acc[category] = (acc[category] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      // Time of day breakdown based on actual start times
      const timeOfDayBreakdown = outages.reduce(
        (acc, o) => {
          const hour = o.startDate.getHours()
          let period = "Night (00-06)"
          if (hour >= 6 && hour < 12) period = "Morning (06-12)"
          else if (hour >= 12 && hour < 18) period = "Afternoon (12-18)"
          else if (hour >= 18 && hour < 24) period = "Evening (18-24)"
          acc[period] = (acc[period] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      // Day of week breakdown based on actual start dates
      const dayOfWeekBreakdown = outages.reduce(
        (acc, o) => {
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
          const day = days[o.startDate.getDay()]
          acc[day] = (acc[day] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      // Month breakdown based on actual dates
      const monthBreakdown = outages.reduce(
        (acc, o) => {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          const month = months[o.startDate.getMonth()]
          acc[month] = (acc[month] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const data: ReportData = {
        summary: {
          totalOutages: outages.length,
          upcomingOutages: upcoming.length,
          pastOutages: past.length,
          ongoingOutages: ongoing.length,
          totalDowntime: Math.round(totalDowntime * 10) / 10,
          averageDowntime: Math.round(avgDowntime * 10) / 10,
          totalUsersAffected: usersAffected,
          mttr: Math.round(mttr * 10) / 10,
          mtbf: Math.round(mtbf),
          availability: Math.round(availability),
          slaCompliance: Math.round(slaCompliance),
          incidentRate: Math.round((outages.length / 30) * 10) / 10,
          // Advanced metrics
          criticalOutages,
          plannedVsUnplanned: { planned: plannedOutages, unplanned: outages.length - plannedOutages },
          recoveryRate: Math.round(recoveryRate),
          escalationRate: Math.round(escalationRate * 10) / 10,
          repeatOffenders: new Set(outages.map((o) => o.assignee)).size,
          businessImpactScore: Math.round(businessImpactScore),
          costImpact: Math.round(costImpact),
          customerSatisfactionImpact: Math.round(businessImpactScore),
          complianceScore: Math.round(slaCompliance),
          riskScore: Math.round(riskScore),
          preventionEffectiveness: Math.round(preventionEffectiveness),
          communicationScore: Math.round(communicationScore * 10) / 10,
          resourceUtilization: Math.round((new Set(outages.map((o) => o.assignee)).size / outages.length) * 100),
          automationRate: automationRate,
          learningRate: Math.round(preventionEffectiveness),
        },
        breakdowns: {
          severity: countBy(outages, "severity"),
          type: countBy(outages, "outageType"),
          environment: countBy(outages, "environments"),
          duration: durationBreakdown,
          timeOfDay: timeOfDayBreakdown,
          dayOfWeek: dayOfWeekBreakdown,
          month: monthBreakdown,
          assignee: countBy(outages, "assignee"),
          category: countBy(outages, "category"),
          rootCause: countBy(outages, "reason"),
        },
        trends: {
          monthly: monthlyTrends,
          weekly: weeklyTrends,
          daily: dailyTrends,
        },
        recentOutages: outages.slice(-10).reverse(),
        upcomingOutages: upcoming.slice(0, 10),
        benchmarks: {
          industryMTTR: 4.2,
          industryAvailability: 99.9,
          targetSLA: 99.95,
          bestPracticeScore: 85,
        },
      }

      setReportData(data)
      setFilteredData(null)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load report data")
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for trend generation based on actual data
  const generateMonthlyTrends = (outages: any[]) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months.map((month, index) => {
      const monthOutages = outages.filter((o) => o.startDate.getMonth() === index)
      return {
        month,
        outages: monthOutages.length,
        downtime: monthOutages.reduce((acc, o) => acc + (+o.endDate - +o.startDate) / 36e5, 0),
        users: monthOutages.reduce((acc, o) => acc + (o.estimatedUsers || 0), 0),
      }
    })
  }

  const generateWeeklyTrends = (outages: any[]) => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"]
    return weeks.map((week, index) => {
      const weekOutages = outages.filter((_, i) => Math.floor(i / (outages.length / 4)) === index)
      const avgDowntime =
        weekOutages.length > 0
          ? weekOutages.reduce((acc, o) => acc + (+o.endDate - +o.startDate) / 36e5, 0) / weekOutages.length
          : 0
      const availability = Math.max(0, 100 - (avgDowntime / 168) * 100) // 168 hours in a week

      return {
        week,
        outages: weekOutages.length,
        mttr: Math.round(avgDowntime * 10) / 10,
        availability: Math.round(availability),
      }
    })
  }

  const generateDailyTrends = (outages: any[]) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.map((day, index) => {
      const dayOutages = outages.filter((o) => o.startDate.getDay() === (index + 1) % 7)
      return {
        day,
        incidents: dayOutages.length,
        resolved: dayOutages.filter((o) => o.endDate < new Date()).length,
        pending: dayOutages.filter((o) => o.endDate >= new Date()).length,
      }
    })
  }

  const applyFilters = (data: ReportData) => {
    let filtered = [...data.recentOutages, ...data.upcomingOutages]

    if (filters.severity !== "all") {
      filtered = filtered.filter((outage) => outage.severity === filters.severity)
    }

    if (filters.outageType !== "all") {
      filtered = filtered.filter((outage) => outage.outageType === filters.outageType)
    }

    if (filters.environment !== "all") {
      filtered = filtered.filter((outage) => outage.environments.includes(filters.environment))
    }

    if (filters.assignee !== "all") {
      filtered = filtered.filter((outage) => outage.assignee === filters.assignee)
    }

    // Add time range filtering
    if (filters.timeRange !== "all") {
      const now = new Date()
      let startDate: Date
      let endDate = now

      switch (filters.timeRange) {
        case "last7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "last30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "last3months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        case "last6months":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
          break
        case "lastyear":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        case "ytd":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case "custom":
          if (customTimeRange.start && customTimeRange.end) {
            startDate = new Date(customTimeRange.start)
            endDate = new Date(customTimeRange.end)
          } else {
            startDate = new Date(0)
          }
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter((outage) => {
        const outageDate = new Date(outage.startDate)
        return outageDate >= startDate && outageDate <= endDate
      })
    }

    // Recalculate metrics based on filtered data
    const totalFiltered = filtered.length
    const totalDowntimeFiltered = filtered.reduce((acc, outage) => {
      const duration = (new Date(outage.endDate).getTime() - new Date(outage.startDate).getTime()) / (1000 * 60 * 60)
      return acc + duration
    }, 0)

    const mttr = totalFiltered > 0 ? totalDowntimeFiltered / totalFiltered : 0
    const highSeverityCount = filtered.filter((o) => o.severity === "High").length
    const availability = totalFiltered > 0 ? ((totalFiltered - highSeverityCount) / totalFiltered) * 100 : 100

    return {
      ...data,
      summary: {
        ...data.summary,
        totalOutages: totalFiltered,
        totalDowntime: Math.round(totalDowntimeFiltered),
        averageDowntime: Math.round(mttr * 10) / 10,
        mttr: Math.round(mttr * 10) / 10,
        mtbf: totalFiltered > 1 ? Math.round((720 / totalFiltered) * 10) / 10 : 0,
        availability: Math.round(availability * 10) / 10,
        slaCompliance: Math.round(((totalFiltered - highSeverityCount) / Math.max(totalFiltered, 1)) * 100 * 10) / 10,
        incidentRate: Math.round((totalFiltered / 30) * 10) / 10,
      },
      recentOutages: filtered.slice(-10).reverse(),
      upcomingOutages: filtered.filter((o) => new Date(o.startDate) > new Date()).slice(0, 10),
    }
  }

  useEffect(() => {
    if (reportData) {
      setFilteredData(applyFilters(reportData))
    }
  }, [filters, reportData])

  const exportReport = () => {
    if (!reportData) return

    const reportContent = `
GCP Planned Outages Report
Generated: ${new Date().toLocaleString()}

SUMMARY
=======
Total Outages: ${reportData.summary.totalOutages}
Upcoming Outages: ${reportData.summary.upcomingOutages}
Past Outages: ${reportData.summary.pastOutages}
Ongoing Outages: ${reportData.summary.ongoingOutages}
Total Downtime: ${reportData.summary.totalDowntime} hours
Average Downtime: ${reportData.summary.averageDowntime} hours
Total Users Affected: ${reportData.summary.totalUsersAffected}

ADVANCED METRICS
================
MTTR: ${reportData.summary.mttr} hours
MTBF: ${reportData.summary.mtbf} hours
Availability: ${reportData.summary.availability}%
SLA Compliance: ${reportData.summary.slaCompliance}%
Recovery Rate: ${reportData.summary.recoveryRate}%
Business Impact Score: ${reportData.summary.businessImpactScore}/100
Risk Score: ${reportData.summary.riskScore}/100

SEVERITY BREAKDOWN
==================
High: ${reportData.breakdowns.severity.High || 0}
Medium: ${reportData.breakdowns.severity.Medium || 0}
Low: ${reportData.breakdowns.severity.Low || 0}

TYPE BREAKDOWN
==============
Internal: ${reportData.breakdowns.type.Internal || 0}
External: ${reportData.breakdowns.type.External || 0}

ENVIRONMENT IMPACT
==================
${Object.entries(reportData.breakdowns.environment)
  .map(([env, count]) => `${env}: ${count}`)
  .join("\n")}

UPCOMING OUTAGES
================
${reportData.upcomingOutages
  .map((outage) => `- ${outage.title} (${outage.severity}) - ${new Date(outage.startDate).toLocaleDateString()}`)
  .join("\n")}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gcp-outages-report-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text("GCP Planned Outages Report", 20, 30)

    // Date
    doc.setFontSize(12)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)

    // Summary metrics
    const data = filteredData || reportData
    if (data) {
      doc.setFontSize(14)
      doc.text("Key Metrics:", 20, 65)

      doc.setFontSize(10)
      doc.text(`Total Outages: ${data.summary.totalOutages}`, 20, 80)
      doc.text(`MTTR: ${data.summary.mttr || data.summary.averageDowntime} hours`, 20, 90)
      doc.text(`Availability: ${data.summary.availability || 99.9}%`, 20, 100)
      doc.text(`SLA Compliance: ${data.summary.slaCompliance || 95}%`, 20, 110)
      doc.text(`Business Impact Score: ${data.summary.businessImpactScore}/100`, 20, 120)
      doc.text(`Risk Score: ${data.summary.riskScore}/100`, 20, 130)
    }

    doc.save(`gcp-outages-report-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const exportToPPT = async () => {
    const data = filteredData || reportData
    if (!data) return

    const pptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GCP Outages Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .slide { page-break-after: always; min-height: 100vh; }
          .title { font-size: 32px; font-weight: bold; margin-bottom: 20px; }
          .metric { display: inline-block; margin: 20px; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .metric-label { font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="slide">
          <h1 class="title">GCP Planned Outages Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          
          <div class="metric">
            <div class="metric-value">${data.summary.totalOutages}</div>
            <div class="metric-label">Total Outages</div>
          </div>
          
          <div class="metric">
            <div class="metric-value">${data.summary.mttr || data.summary.averageDowntime}h</div>
            <div class="metric-label">MTTR</div>
          </div>
          
          <div class="metric">
            <div class="metric-value">${data.summary.availability || 99.9}%</div>
            <div class="metric-label">Availability</div>
          </div>
          
          <div class="metric">
            <div class="metric-value">${data.summary.businessImpactScore}/100</div>
            <div class="metric-label">Business Impact</div>
          </div>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([pptContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gcp-outages-report-${new Date().toISOString().split("T")[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToHTML = () => {
    const data = filteredData || reportData
    if (!data) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GCP Outages Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; background: #f8fafc; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; margin-bottom: 40px; }
          .title { font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 8px; }
          .subtitle { color: #64748b; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .metric-card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
          .metric-label { color: #64748b; font-size: 14px; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 600; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
          .badge-high { background: #fef2f2; color: #dc2626; }
          .badge-medium { background: #fef3c7; color: #d97706; }
          .badge-low { background: #f0fdf4; color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">GCP Planned Outages Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value" style="color: #3b82f6;">${data.summary.totalOutages}</div>
              <div class="metric-label">Total Outages</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: #10b981;">${data.summary.mttr || data.summary.averageDowntime}h</div>
              <div class="metric-label">MTTR</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: #8b5cf6;">${data.summary.availability || 99.9}%</div>
              <div class="metric-label">Availability</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: #f59e0b;">${data.summary.businessImpactScore}/100</div>
              <div class="metric-label">Business Impact</div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Upcoming Outages</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Start Date</th>
                  <th>Severity</th>
                  <th>Assignee</th>
                </tr>
              </thead>
              <tbody>
                ${data.upcomingOutages
                  .map(
                    (outage) => `
                  <tr>
                    <td>${outage.title}</td>
                    <td>${new Date(outage.startDate).toLocaleDateString()}</td>
                    <td><span class="badge badge-${outage.severity.toLowerCase()}">${outage.severity}</span></td>
                    <td>${outage.assignee}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gcp-outages-report-${new Date().toISOString().split("T")[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Generating analytics...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error || "Failed to load report data"}</p>
          <Button onClick={loadReportData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const currentData = filteredData || reportData

  // Chart data preparations
  const severityData = Object.entries(currentData.breakdowns.severity).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const typeData = Object.entries(currentData.breakdowns.type).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const environmentData = Object.entries(currentData.breakdowns.environment).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  const durationData = Object.entries(currentData.breakdowns.duration).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  const timeOfDayData = Object.entries(currentData.breakdowns.timeOfDay).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  const dayOfWeekData = Object.entries(currentData.breakdowns.dayOfWeek).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  // Performance score calculation based on key metrics
  const performanceScore = Math.round(
    (currentData.summary.availability! * 0.3 +
      currentData.summary.slaCompliance! * 0.25 +
      currentData.summary.businessImpactScore! * 0.2 +
      (100 - currentData.summary.riskScore!) * 0.15 +
      currentData.summary.recoveryRate! * 0.1) *
      0.01 *
      100,
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="space-y-6 p-6">
        {/* Enhanced Header with Filters - Dark Theme */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">GCP Planned Outages Analytics</h2>
              <p className="text-slate-400">Generated on {new Date().toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToPDF}
                variant="outline"
                className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button
                onClick={exportToPPT}
                variant="outline"
                className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Presentation className="h-4 w-4" />
                PPT
              </Button>
              <Button
                onClick={exportToHTML}
                variant="outline"
                className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Globe className="h-4 w-4" />
                HTML
              </Button>
              <Button onClick={exportReport} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Filters - Dark Theme */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Filters & Analytics Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="severity-filter" className="text-slate-300">
                    Severity
                  </Label>
                  <Select
                    value={filters.severity}
                    onValueChange={(value) => setFilters({ ...filters, severity: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type-filter" className="text-slate-300">
                    Outage Type
                  </Label>
                  <Select
                    value={filters.outageType}
                    onValueChange={(value) => setFilters({ ...filters, outageType: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="env-filter" className="text-slate-300">
                    Environment
                  </Label>
                  <Select
                    value={filters.environment}
                    onValueChange={(value) => setFilters({ ...filters, environment: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="All Environments" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Environments</SelectItem>
                      <SelectItem value="PROD">PROD</SelectItem>
                      <SelectItem value="SBX UAT">SBX UAT</SelectItem>
                      <SelectItem value="SBX DEV">SBX DEV</SelectItem>
                      <SelectItem value="POC">POC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee-filter" className="text-slate-300">
                    Assignees
                  </Label>
                  <Select
                    value={filters.assignee}
                    onValueChange={(value) => setFilters({ ...filters, assignee: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all">All Assignees</SelectItem>
                      {reportData &&
                        [
                          ...new Set(
                            [...reportData.recentOutages, ...reportData.upcomingOutages].map((o) => o.assignee),
                          ),
                        ].map((assignee) => (
                          <SelectItem key={assignee} value={assignee}>
                            {assignee}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time-range-filter" className="text-slate-300">
                    Time Range
                  </Label>
                  <Select
                    value={filters.timeRange}
                    onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {timeRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() =>
                      setFilters({
                        dateRange: "all",
                        severity: "all",
                        environment: "all",
                        outageType: "all",
                        assignee: "all",
                        timeRange: "all",
                      })
                    }
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary Dashboard - Dark Theme */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gauge className="h-5 w-5" />
              Executive Summary Dashboard
            </CardTitle>
            <CardDescription className="text-slate-400">
              High-level performance indicators and business metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-blue-500 p-1">
                    <div className="flex items-center justify-center w-full h-full bg-slate-800 rounded-full">
                      <span className="text-2xl font-bold text-white">{performanceScore}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-400">Overall Performance Score</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-300">Availability</span>
                  <span className="text-sm font-medium text-white">{currentData.summary.availability}%</span>
                </div>
                <Progress value={currentData.summary.availability} className="h-2 bg-slate-700" />
                <div className="flex justify-between">
                  <span className="text-sm text-slate-300">SLA Compliance</span>
                  <span className="text-sm font-medium text-white">{currentData.summary.slaCompliance}%</span>
                </div>
                <Progress value={currentData.summary.slaCompliance} className="h-2 bg-slate-700" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-300">Business Impact</span>
                  <span className="text-sm font-medium text-white">{currentData.summary.businessImpactScore}/100</span>
                </div>
                <Progress value={currentData.summary.businessImpactScore} className="h-2 bg-slate-700" />
                <div className="flex justify-between">
                  <span className="text-sm text-slate-300">Risk Level</span>
                  <span className="text-sm font-medium text-white">
                    {Math.min(100, currentData.summary.riskScore!)}/100
                  </span>
                </div>
                <Progress value={Math.min(100, currentData.summary.riskScore!)} className="h-2 bg-slate-700" />
              </div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{currentData.summary.recoveryRate}%</div>
                  <p className="text-sm text-slate-400">Recovery Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    ${currentData.summary.costImpact?.toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-400">Estimated Cost Impact</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced KPI Cards - Dark Theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.totalOutages}</div>
              <p className="text-sm text-slate-400">Total Outages</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Timer className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.mttr}h</div>
              <p className="text-sm text-slate-400">MTTR</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Activity className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.mtbf}h</div>
              <p className="text-sm text-slate-400">MTBF</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.availability}%</div>
              <p className="text-sm text-slate-400">Availability</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.slaCompliance}%</div>
              <p className="text-sm text-slate-400">SLA Compliance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{currentData.summary.criticalOutages}</div>
              <p className="text-sm text-slate-400">Critical Outages</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {currentData.summary.totalUsersAffected?.toLocaleString()}
              </div>
              <p className="text-sm text-slate-400">Users Affected</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">${currentData.summary.costImpact?.toLocaleString()}</div>
              <p className="text-sm text-slate-400">Cost Impact</p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Metrics Grid - Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Escalation Rate</p>
                  <p className="text-2xl font-bold text-orange-400">{currentData.summary.escalationRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
              <div className="mt-2">
                <Progress value={currentData.summary.escalationRate} className="h-2 bg-slate-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Prevention Effectiveness</p>
                  <p className="text-2xl font-bold text-green-400">{currentData.summary.preventionEffectiveness}%</p>
                </div>
                <Shield className="h-8 w-8 text-green-400" />
              </div>
              <div className="mt-2">
                <Progress value={currentData.summary.preventionEffectiveness} className="h-2 bg-slate-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Communication Score</p>
                  <p className="text-2xl font-bold text-blue-400">{currentData.summary.communicationScore}/100</p>
                </div>
                <Wifi className="h-8 w-8 text-blue-400" />
              </div>
              <div className="mt-2">
                <Progress value={currentData.summary.communicationScore} className="h-2 bg-slate-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Automation Rate</p>
                  <p className="text-2xl font-bold text-purple-400">{currentData.summary.automationRate}%</p>
                </div>
                <Cpu className="h-8 w-8 text-purple-400" />
              </div>
              <div className="mt-2">
                <Progress value={currentData.summary.automationRate} className="h-2 bg-slate-700" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Analysis Charts - Dark Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5" />
                Monthly Trends
              </CardTitle>
              <CardDescription className="text-slate-400">Outages, downtime, and user impact over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.trends.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="outages"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="downtime"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart2 className="h-5 w-5" />
                Weekly Performance
              </CardTitle>
              <CardDescription className="text-slate-400">MTTR and availability trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData.trends.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="mttr" stroke="#f59e0b" name="MTTR (hours)" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="availability"
                      stroke="#10b981"
                      name="Availability %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown Charts - Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Duration Breakdown */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Duration Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#3b82f6">
                      {durationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {durationData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs text-slate-300">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time of Day Analysis */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Time of Day Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#6366f1">
                      {timeOfDayData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Day of Week Pattern */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                Day of Week Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#8b5cf6">
                      {dayOfWeekData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Original Charts Row - Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Breakdown */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <PieChart className="h-5 w-5" />
                Severity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={severityData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex justify-center gap-4 mt-4">
                {severityData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-slate-300">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Type Breakdown */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5" />
                Internal vs External
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#3b82f6">
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Environment Impact - Dark Theme */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5" />
              Environment Impact Analysis
            </CardTitle>
            <CardDescription className="text-slate-400">Number of outages affecting each environment</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={environmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#3b82f6">
                    {environmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ML Predictions Section - Dark Theme */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5" />
              Machine Learning Predictions
            </CardTitle>
            <CardDescription className="text-slate-400">
              AI-powered forecasting and predictive analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MLPredictionsDashboard outages={[...currentData.recentOutages, ...currentData.upcomingOutages]} />
          </CardContent>
        </Card>

        {/* Upcoming Outages - Dark Theme */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5" />
              Upcoming Outages
            </CardTitle>
            <CardDescription className="text-slate-400">Next scheduled outages</CardDescription>
          </CardHeader>
          <CardContent>
            {currentData.upcomingOutages.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No upcoming outages scheduled</p>
            ) : (
              <div className="space-y-3">
                {currentData.upcomingOutages.slice(0, 5).map((outage) => (
                  <div
                    key={outage.id}
                    className="flex items-center justify-between p-3 border border-slate-600 rounded-lg bg-slate-700"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{outage.title}</h4>
                      <p className="text-sm text-slate-400">
                        {new Date(outage.startDate).toLocaleDateString()} - {outage.assignee}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          outage.severity === "High"
                            ? "destructive"
                            : outage.severity === "Medium"
                              ? "secondary"
                              : "default"
                        }
                        className="bg-slate-600 text-slate-200"
                      >
                        {outage.severity}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-slate-300">
                        {outage.outageType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Performance Indicators - Dark Theme */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Key Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{currentData.summary.averageDowntime}h</div>
                <p className="text-sm text-slate-400">Average Downtime per Outage</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {currentData.summary.totalOutages > 0
                    ? Math.round((currentData.summary.upcomingOutages / currentData.summary.totalOutages) * 100)
                    : 0}
                  %
                </div>
                <p className="text-sm text-slate-400">Upcoming vs Total Ratio</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {currentData.summary.totalOutages > 0
                    ? Math.round(currentData.summary.totalUsersAffected! / currentData.summary.totalOutages)
                    : 0}
                </div>
                <p className="text-sm text-slate-400">Avg Users per Outage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
