"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, Calendar, AlertTriangle, TrendingUp, PieChart, FileText } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Activity, Target, Zap, Shield, Timer, FileDown, Presentation, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import outagesRaw from "@/data/outages.json"

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
  }
  breakdowns: {
    severity: Record<string, number>
    type: Record<string, number>
    environment: Record<string, number>
  }
  recentOutages: any[]
  upcomingOutages: any[]
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
    timeRange: "all", // Add this new filter
  })

  // Add time range options
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
      }))

      const now = new Date()
      const upcoming = outages.filter((o) => o.startDate > now)
      const past = outages.filter((o) => o.endDate < now)
      const ongoing = outages.filter((o) => o.startDate <= now && o.endDate >= now)

      const sum = <T,>(arr: T[], fn: (v: T) => number) => arr.reduce((a, b) => a + fn(b), 0)
      const totalDowntime = sum(outages, (o) => (+o.endDate - +o.startDate) / 36e5)
      const avgDowntime = outages.length ? totalDowntime / outages.length : 0
      const usersAffected = sum(outages, (o: any) => o.estimatedUsers || 0)

      const countBy = <K extends keyof (typeof outages)[0]>(arr: any[], key: K) =>
        arr.reduce<Record<string, number>>((acc, o) => {
          const val = o[key]
          if (Array.isArray(val)) val.forEach((v) => (acc[v] = (acc[v] || 0) + 1))
          else acc[val as string] = (acc[val as string] || 0) + 1
          return acc
        }, {})

      const data = {
        summary: {
          totalOutages: outages.length,
          upcomingOutages: upcoming.length,
          pastOutages: past.length,
          ongoingOutages: ongoing.length,
          totalDowntime: Math.round(totalDowntime),
          averageDowntime: Math.round(avgDowntime * 10) / 10,
          totalUsersAffected: usersAffected,
        },
        breakdowns: {
          severity: countBy(outages, "severity"),
          type: countBy(outages, "outageType"),
          environment: countBy(outages, "environments"),
        },
        recentOutages: outages.slice(-10).reverse(),
        upcomingOutages: upcoming.slice(0, 10),
      } as ReportData

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
            startDate = new Date(0) // Default to all time if custom range not set
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
        mtbf: totalFiltered > 1 ? Math.round((720 / totalFiltered) * 10) / 10 : 0, // Assuming 30 days = 720 hours
        availability: Math.round(availability * 10) / 10,
        slaCompliance: Math.round(((totalFiltered - highSeverityCount) / Math.max(totalFiltered, 1)) * 100 * 10) / 10,
        incidentRate: Math.round((totalFiltered / 30) * 10) / 10, // Per day over 30 days
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

      // Add more content as needed
    }

    doc.save(`gcp-outages-report-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const exportToPPT = async () => {
    // Create PowerPoint-style HTML content
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
            <div class="metric-value">${data.summary.slaCompliance || 95}%</div>
            <div class="metric-label">SLA Compliance</div>
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
              <div class="metric-value" style="color: #f59e0b;">${data.summary.slaCompliance || 95}%</div>
              <div class="metric-label">SLA Compliance</div>
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
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
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

  const severityData = Object.entries((filteredData || reportData)?.breakdowns.severity).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const typeData = Object.entries((filteredData || reportData)?.breakdowns.type).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const environmentData = Object.entries((filteredData || reportData)?.breakdowns.environment).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Filters */}
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">GCP Planned Outages Analytics</h2>
            <p className="text-muted-foreground">Generated on {new Date().toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={exportToPPT} variant="outline" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              PPT
            </Button>
            <Button onClick={exportToHTML} variant="outline" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              HTML
            </Button>
            <Button onClick={exportReport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Analytics Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="severity-filter">Severity</Label>
                <Select value={filters.severity} onValueChange={(value) => setFilters({ ...filters, severity: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter">Outage Type</Label>
                <Select
                  value={filters.outageType}
                  onValueChange={(value) => setFilters({ ...filters, outageType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="External">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="env-filter">Environment</Label>
                <Select
                  value={filters.environment}
                  onValueChange={(value) => setFilters({ ...filters, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    <SelectItem value="PROD">PROD</SelectItem>
                    <SelectItem value="SBX UAT">SBX UAT</SelectItem>
                    <SelectItem value="SBX DEV">SBX DEV</SelectItem>
                    <SelectItem value="POC">POC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assignee-filter">Assignee</Label>
                <Select value={filters.assignee} onValueChange={(value) => setFilters({ ...filters, assignee: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {reportData &&
                      [
                        ...new Set([...reportData.recentOutages, ...reportData.upcomingOutages].map((o) => o.assignee)),
                      ].map((assignee) => (
                        <SelectItem key={assignee} value={assignee}>
                          {assignee}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time-range-filter">Time Range</Label>
                <Select
                  value={filters.timeRange}
                  onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Time Range Inputs */}
              {filters.timeRange === "custom" && (
                <div className="col-span-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-background border border-border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Date</Label>
                      <Input
                        type="date"
                        value={customTimeRange.start}
                        onChange={(e) => setCustomTimeRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date</Label>
                      <Input
                        type="date"
                        value={customTimeRange.end}
                        onChange={(e) => setCustomTimeRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-end">
                <Button
                  onClick={() =>
                    setFilters({
                      dateRange: "all",
                      severity: "all",
                      environment: "all",
                      outageType: "all",
                      assignee: "all",
                      timeRange: "all", // Add this
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{(filteredData || reportData)?.summary.totalOutages || 0}</div>
            <p className="text-sm text-muted-foreground">Total Outages</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {(filteredData || reportData)?.summary.mttr || (filteredData || reportData)?.summary.averageDowntime || 0}
              h
            </div>
            <p className="text-sm text-muted-foreground">MTTR</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{(filteredData || reportData)?.summary.mtbf || 0}h</div>
            <p className="text-sm text-muted-foreground">MTBF</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{(filteredData || reportData)?.summary.availability || 99.9}%</div>
            <p className="text-sm text-muted-foreground">Availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{(filteredData || reportData)?.summary.slaCompliance || 95}%</div>
            <p className="text-sm text-muted-foreground">SLA Compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{(filteredData || reportData)?.summary.incidentRate || 0}</div>
            <p className="text-sm text-muted-foreground">Incidents/Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Severity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <RechartsPieChart data={severityData} cx="50%" cy="50%" outerRadius={80}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Internal vs External
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#8884d8">
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

      {/* Environment Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Environment Impact Analysis
          </CardTitle>
          <CardDescription>Number of outages affecting each environment</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={environmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="#8884d8">
                  {environmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Upcoming Outages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Outages
          </CardTitle>
          <CardDescription>Next scheduled outages</CardDescription>
        </CardHeader>
        <CardContent>
          {(filteredData || reportData)?.upcomingOutages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming outages scheduled</p>
          ) : (
            <div className="space-y-3">
              {(filteredData || reportData)?.upcomingOutages.slice(0, 5).map((outage) => (
                <div key={outage.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{outage.title}</h4>
                    <p className="text-sm text-muted-foreground">
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
                    >
                      {outage.severity}
                    </Badge>
                    <Badge variant="outline">{outage.outageType}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {(filteredData || reportData)?.summary.averageDowntime}h
              </div>
              <p className="text-sm text-muted-foreground">Average Downtime per Outage</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {(filteredData || reportData)?.summary.totalOutages > 0
                  ? Math.round(
                      ((filteredData || reportData)?.summary.upcomingOutages /
                        (filteredData || reportData)?.summary.totalOutages) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-sm text-muted-foreground">Upcoming vs Total Ratio</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {(filteredData || reportData)?.summary.totalOutages > 0
                  ? Math.round(
                      (filteredData || reportData)?.summary.totalUsersAffected /
                        (filteredData || reportData)?.summary.totalOutages,
                    )
                  : 0}
              </div>
              <p className="text-sm text-muted-foreground">Avg Users per Outage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
