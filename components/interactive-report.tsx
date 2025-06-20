"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Download,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  PieChart,
  FileText,
} from "lucide-react"
import { generateReportData } from "@/actions/data-actions"
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

interface ReportData {
  summary: {
    totalOutages: number
    upcomingOutages: number
    pastOutages: number
    ongoingOutages: number
    totalDowntime: number
    averageDowntime: number
    totalUsersAffected: number
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

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const data = await generateReportData()
      setReportData(data)
    } catch (err) {
      setError("Failed to load report data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  const severityData = Object.entries(reportData.breakdowns.severity).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const typeData = Object.entries(reportData.breakdowns.type).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS],
  }))

  const environmentData = Object.entries(reportData.breakdowns.environment).map(([key, value]) => ({
    name: key,
    value,
    fill: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">GCP Planned Outages Report</h2>
          <p className="text-muted-foreground">Generated on {new Date().toLocaleString()}</p>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{reportData.summary.totalOutages}</div>
            <p className="text-sm text-muted-foreground">Total Outages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{reportData.summary.upcomingOutages}</div>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{reportData.summary.totalDowntime}h</div>
            <p className="text-sm text-muted-foreground">Total Downtime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{reportData.summary.totalUsersAffected.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Users Affected</p>
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
          {reportData.upcomingOutages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming outages scheduled</p>
          ) : (
            <div className="space-y-3">
              {reportData.upcomingOutages.slice(0, 5).map((outage) => (
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
              <div className="text-3xl font-bold text-blue-600">{reportData.summary.averageDowntime}h</div>
              <p className="text-sm text-muted-foreground">Average Downtime per Outage</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {reportData.summary.totalOutages > 0
                  ? Math.round((reportData.summary.upcomingOutages / reportData.summary.totalOutages) * 100)
                  : 0}
                %
              </div>
              <p className="text-sm text-muted-foreground">Upcoming vs Total Ratio</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {reportData.summary.totalOutages > 0
                  ? Math.round(reportData.summary.totalUsersAffected / reportData.summary.totalOutages)
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
