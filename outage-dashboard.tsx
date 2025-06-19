"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Calendar,
  Clock,
  Server,
  AlertTriangle,
  Info,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"

// Dynamically import components that might have SSR issues
const UptimeMetrics = dynamic(
  () => import("./components/uptime-metrics").then((mod) => ({ default: mod.UptimeMetrics })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>,
  },
)

const OutageForm = dynamic(() => import("./components/outage-form").then((mod) => ({ default: mod.OutageForm })), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>,
})

interface OutageData {
  id: number
  title: string
  startDate: Date
  endDate: Date
  environments: {
    name: string
    affected: boolean
    impact: string
  }[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  status: string
  type: string
  severity: "High" | "Medium" | "Low"
}

const outageData: OutageData[] = [
  {
    id: 1,
    title: "Trino LLE Release",
    startDate: new Date("2024-06-17T15:00:00"),
    endDate: new Date("2024-06-17T17:00:00"),
    environments: [
      { name: "POC", affected: true, impact: "Trino LLE completely unavailable" },
      { name: "SBX DEV", affected: false, impact: "No impact" },
      { name: "SBX UAT", affected: false, impact: "No impact" },
      { name: "PROD", affected: false, impact: "No impact" },
    ],
    affectedModels: "All models in POC environment",
    reason: "Trino LLE Release deployment",
    detailedImpact: [
      "POC environment: Trino LLE service will be completely unavailable",
      "All data processing jobs using Trino in POC will fail",
      "No impact on other environments",
    ],
    assignee: "Infrastructure Team",
    status: "Not Started",
    type: "Planned",
    severity: "Low",
  },
  {
    id: 2,
    title: "Annual DR Exercise",
    startDate: new Date("2024-06-21T06:00:00"),
    endDate: new Date("2024-06-21T18:00:00"),
    environments: [
      { name: "POC", affected: false, impact: "No impact" },
      { name: "SBX DEV", affected: true, impact: "Complete environment unavailable" },
      { name: "SBX UAT", affected: true, impact: "Complete environment unavailable" },
      { name: "PROD", affected: true, impact: "Complete environment unavailable" },
    ],
    affectedModels: "All models in affected environments",
    reason: "Annual Disaster Recovery Exercise - Production to DR Environment Failover",
    detailedImpact: [
      "SBX DEV: Complete environment shutdown for 12 hours",
      "SBX UAT: Complete environment shutdown for 12 hours",
      "PROD: Complete environment shutdown for 12 hours",
      "All GCP lanes in these environments will be unavailable",
      "No user access to applications, dashboards, or data processing",
    ],
    assignee: "GCP L2 L3 Team",
    status: "Not Started",
    type: "Planned",
    severity: "High",
  },
  {
    id: 3,
    title: "DR Week Extended Maintenance",
    startDate: new Date("2024-06-21T18:00:00"),
    endDate: new Date("2024-06-28T06:00:00"),
    environments: [
      { name: "POC", affected: true, impact: "UAT2 lane completely unavailable" },
      { name: "SBX DEV", affected: true, impact: "Trino service unavailable" },
      { name: "SBX UAT", affected: true, impact: "Trino service unavailable" },
      { name: "PROD", affected: true, impact: "Limited functionality" },
    ],
    affectedModels: "All models requiring Trino processing",
    reason: "Extended DR testing and maintenance period",
    detailedImpact: [
      "POC: UAT2 lane will be completely inaccessible for 7 days",
      "SBX DEV: Trino service unavailable - no data processing jobs",
      "SBX UAT: Trino service unavailable - no data processing jobs",
      "PROD: Some services may have intermittent issues",
      "Any workflows dependent on Trino will fail in SBX environments",
    ],
    assignee: "GCP L2 L3 Team",
    status: "Not Started",
    type: "Planned",
    severity: "High",
  },
  {
    id: 4,
    title: "Tableau Maintenance",
    startDate: new Date("2024-06-21T07:45:00"),
    endDate: new Date("2024-06-22T08:00:00"),
    environments: [
      { name: "POC", affected: true, impact: "Tableau reports unavailable" },
      { name: "SBX DEV", affected: true, impact: "Tableau reports unavailable" },
      { name: "SBX UAT", affected: true, impact: "Tableau reports unavailable" },
      { name: "PROD", affected: true, impact: "Tableau reports unavailable" },
    ],
    affectedModels: "No impact on model processing",
    reason: "Tableau server maintenance and updates",
    detailedImpact: [
      "All environments: Tableau dashboards and reports will be inaccessible",
      "Data visualization and reporting features unavailable",
      "No impact on core GCP UI or model workflows",
      "Limited impact on data produced from other sources",
    ],
    assignee: "Tableau Team",
    status: "Not Started",
    type: "Planned",
    severity: "Medium",
  },
  {
    id: 5,
    title: "Weekly EPAS Patching",
    startDate: new Date("2024-06-22T18:00:00"),
    endDate: new Date("2024-06-23T02:00:00"),
    environments: [
      { name: "POC", affected: true, impact: "Complete environment unavailable" },
      { name: "SBX DEV", affected: true, impact: "Complete environment unavailable" },
      { name: "SBX UAT", affected: true, impact: "Complete environment unavailable" },
      { name: "PROD", affected: false, impact: "No impact" },
    ],
    affectedModels: "All models in affected environments",
    reason: "Weekly EPAS (Enterprise PostgreSQL Advanced Server) security patching",
    detailedImpact: [
      "POC: Complete database unavailability for 8 hours",
      "SBX DEV: Complete database unavailability for 8 hours",
      "SBX UAT: Complete database unavailability for 8 hours",
      "All applications dependent on EPAS database will be down",
      "PROD environment remains operational",
    ],
    assignee: "EPAS Team",
    status: "Not Started",
    type: "Planned",
    severity: "Medium",
  },
  {
    id: 6,
    title: "GCP 5.6 Platform Deployment",
    startDate: new Date("2024-06-23T00:00:00"),
    endDate: new Date("2024-06-23T06:00:00"),
    environments: [
      { name: "POC", affected: false, impact: "No impact" },
      { name: "SBX DEV", affected: true, impact: "Complete environment unavailable during deployment" },
      { name: "SBX UAT", affected: true, impact: "Complete environment unavailable during deployment" },
      { name: "PROD", affected: false, impact: "No impact" },
    ],
    affectedModels: "All models in SBX environments",
    reason: "Deployment of Release GCP 5.6 Platform",
    detailedImpact: [
      "SBX DEV: Complete environment shutdown during deployment",
      "SBX UAT: Complete environment shutdown during deployment",
      "New platform features will be available after deployment",
      "Potential for extended downtime if deployment issues occur",
    ],
    assignee: "EM Team",
    status: "Not Started",
    type: "Planned",
    severity: "Medium",
  },
  {
    id: 7,
    title: "Horizon Jira Maintenance",
    startDate: new Date("2024-06-25T19:00:00"),
    endDate: new Date("2024-06-25T21:00:00"),
    environments: [
      { name: "POC", affected: true, impact: "Jira project access unavailable" },
      { name: "SBX DEV", affected: true, impact: "Jira project access unavailable" },
      { name: "SBX UAT", affected: true, impact: "Jira project access unavailable" },
      { name: "PROD", affected: true, impact: "Jira project access unavailable" },
    ],
    affectedModels: "No direct impact on model processing",
    reason: "Horizon Maintenance - Jira server updates",
    detailedImpact: [
      "All environments: No access to Jira2 and Jira3 projects",
      "Users cannot access or update Jira tickets",
      "Project management and issue tracking unavailable",
      "Core platform functionality remains operational",
    ],
    assignee: "Horizon Team",
    status: "Not Started",
    type: "Planned",
    severity: "Low",
  },
]

const environments = ["POC", "SBX DEV", "SBX UAT", "PROD"]
const environmentColors = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  PROD: "bg-red-500",
}

const severityColors = {
  High: "bg-red-100 text-red-800 border-red-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Low: "bg-green-100 text-green-800 border-green-200",
}

export default function OutageDashboard() {
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(environments)
  const [selectedMonth, setSelectedMonth] = useState("2024-06")
  const [selectedOutage, setSelectedOutage] = useState<OutageData | null>(null)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    gantt: true,
    dayByDay: true,
  })
  const [hoveredOutage, setHoveredOutage] = useState<number | null>(null)
  const [tooltipData, setTooltipData] = useState<{
    outage: OutageData
    x: number
    y: number
    visible: boolean
  } | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 640)
      }
    }

    checkMobile()
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const filteredOutages = useMemo(() => {
    return outageData.filter((outage) => {
      const hasSelectedEnv = outage.environments.some((env) => env.affected && selectedEnvironments.includes(env.name))
      const monthMatch = outage.startDate.toISOString().startsWith(selectedMonth)
      return hasSelectedEnv && monthMatch
    })
  }, [selectedEnvironments, selectedMonth])

  const dateRange = useMemo(() => {
    if (filteredOutages.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 }

    const startDate = new Date(Math.min(...filteredOutages.map((o) => o.startDate.getTime())))
    const endDate = new Date(Math.max(...filteredOutages.map((o) => o.endDate.getTime())))

    // Add some padding
    startDate.setDate(startDate.getDate() - 1)
    endDate.setDate(endDate.getDate() + 1)

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    return { start: startDate, end: endDate, totalDays }
  }, [filteredOutages])

  const getGanttPosition = (startDate: Date, endDate: Date) => {
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime()
    const startMs = startDate.getTime() - dateRange.start.getTime()
    const durationMs = endDate.getTime() - startDate.getTime()

    const startPercent = (startMs / totalMs) * 100
    const widthPercent = (durationMs / totalMs) * 100

    return { left: `${Math.max(0, startPercent)}%`, width: `${Math.max(2, widthPercent)}%` }
  }

  const getDayByDayBreakdown = () => {
    const days: { [key: string]: OutageData[] } = {}

    filteredOutages.forEach((outage) => {
      const current = new Date(outage.startDate)
      const end = new Date(outage.endDate)

      while (current <= end) {
        const dayKey = current.toISOString().split("T")[0]
        if (!days[dayKey]) days[dayKey] = []
        days[dayKey].push(outage)
        current.setDate(current.getDate() + 1)
      }
    })

    return Object.entries(days).sort(([a], [b]) => a.localeCompare(b))
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      const remainingHours = diffHours % 24
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ${remainingHours > 0 ? `${remainingHours} hour${remainingHours > 1 ? "s" : ""}` : ""}`
    }
    return `${diffHours} hour${diffHours > 1 ? "s" : ""}`
  }

  const handleEnvironmentChange = (env: string, checked: boolean) => {
    if (checked) {
      setSelectedEnvironments([...selectedEnvironments, env])
    } else {
      setSelectedEnvironments(selectedEnvironments.filter((e) => e !== env))
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const dayByDayBreakdown = getDayByDayBreakdown()

  const Tooltip = ({ outage, x, y, visible }: { outage: OutageData; x: number; y: number; visible: boolean }) => {
    if (!visible || !isMounted) return null

    return (
      <div
        className="fixed z-50 bg-black text-white p-3 rounded-lg shadow-lg max-w-xs pointer-events-none"
        style={{ left: x + 10, top: y - 10 }}
      >
        <div className="font-semibold">{outage.title}</div>
        <div className="text-sm opacity-90">
          {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
        </div>
        <div className="text-sm opacity-90">Duration: {getDuration(outage.startDate, outage.endDate)}</div>
        <div className="text-sm opacity-90">
          Environments:{" "}
          {outage.environments
            .filter((e) => e.affected)
            .map((e) => e.name)
            .join(", ")}
        </div>
      </div>
    )
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading GCP Outages Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">GCP Outages</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Comprehensive dashboard for tracking GCP platform outages, uptime metrics, and scheduling maintenance
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule Outage
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Critical Alerts */}
            <div className="space-y-2">
              {filteredOutages
                .filter((o) => o.severity === "High")
                .map((outage) => (
                  <Alert key={outage.id} className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-sm">
                      <strong>HIGH IMPACT:</strong> {outage.title} on {formatDateTime(outage.startDate)} -{" "}
                      {formatDateTime(outage.endDate)}
                      <br />
                      <strong>Affected:</strong>{" "}
                      {outage.environments
                        .filter((e) => e.affected)
                        .map((e) => e.name)
                        .join(", ")}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="w-5 h-5" />
                  Environment Filter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-06">June 2024</SelectItem>
                        <SelectItem value="2024-07">July 2024</SelectItem>
                        <SelectItem value="2024-08">August 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 w-full sm:w-auto">
                    <label className="text-sm font-medium">Show Outages Affecting:</label>
                    <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
                      {environments.map((env) => (
                        <div key={env} className="flex items-center space-x-2">
                          <Checkbox
                            id={env}
                            checked={selectedEnvironments.includes(env)}
                            onCheckedChange={(checked) => handleEnvironmentChange(env, checked as boolean)}
                          />
                          <label htmlFor={env} className="text-sm font-medium cursor-pointer">
                            {env}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Gantt Chart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5" />
                      Interactive Outage Timeline - {selectedMonth}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Click on any outage bar for detailed information. Hover for quick preview.
                      <br />
                      Timeline: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {isMobile && (
                    <Button variant="ghost" size="sm" onClick={() => toggleSection("gantt")}>
                      {expandedSections.gantt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {expandedSections.gantt && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Mobile-friendly Calendar Header */}
                    <div className="relative">
                      <div className="flex text-xs font-medium text-gray-600 mb-2">
                        <div className="w-full sm:w-80 pr-2 sm:pr-4">Outage Details</div>
                        <div className="hidden sm:block flex-1 text-center">June 2024 - Daily Timeline</div>
                      </div>
                      <div className="flex">
                        <div className="w-full sm:w-80 pr-2 sm:pr-4"></div>
                        <div className="hidden sm:block flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: Math.min(dateRange.totalDays, 31) }, (_, i) => {
                              const currentDate = new Date(dateRange.start)
                              currentDate.setDate(currentDate.getDate() + i)
                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex items-center justify-center text-xs font-medium border-r border-gray-300 last:border-r-0 min-w-0"
                                >
                                  {currentDate.getDate()}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Gantt Bars */}
                    <div className="space-y-3">
                      {filteredOutages.map((outage) => {
                        const affectedEnvs = outage.environments.filter(
                          (env) => env.affected && selectedEnvironments.includes(env.name),
                        )

                        const position = getGanttPosition(outage.startDate, outage.endDate)

                        return (
                          <div key={outage.id} className="relative">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center">
                              {/* Outage Info - Mobile stacked, Desktop side-by-side */}
                              <div className="w-full sm:w-80 pr-2 sm:pr-4 mb-2 sm:mb-0">
                                <div className="space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <h4 className="font-medium text-sm">{outage.title}</h4>
                                    <Badge className={severityColors[outage.severity]} variant="outline">
                                      {outage.severity}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {affectedEnvs.map((env) => (
                                      <Badge
                                        key={env.name}
                                        className={`text-xs ${environmentColors[env.name as keyof typeof environmentColors]} text-white`}
                                      >
                                        {env.name}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <div className="sm:hidden">
                                      {outage.startDate.toLocaleDateString()} - {outage.endDate.toLocaleDateString()}
                                    </div>
                                    <div className="hidden sm:block">
                                      {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Gantt Bar - Hidden on mobile, visible on desktop */}
                              <div className="hidden sm:block flex-1 relative h-12 bg-gray-100 rounded-lg">
                                <div
                                  className={`absolute top-1 h-10 rounded-lg flex items-center px-2 text-white text-xs font-medium shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                                    outage.severity === "High"
                                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                                      : outage.severity === "Medium"
                                        ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                  } ${hoveredOutage === outage.id ? "ring-2 ring-white ring-opacity-50" : ""}`}
                                  style={position}
                                  onClick={() => setSelectedOutage(outage)}
                                  onMouseEnter={(e) => {
                                    setHoveredOutage(outage.id)
                                    setTooltipData({
                                      outage,
                                      x: e.clientX,
                                      y: e.clientY,
                                      visible: true,
                                    })
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredOutage(null)
                                    setTooltipData(null)
                                  }}
                                  onMouseMove={(e) => {
                                    if (tooltipData) {
                                      setTooltipData({
                                        ...tooltipData,
                                        x: e.clientX,
                                        y: e.clientY,
                                      })
                                    }
                                  }}
                                >
                                  <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{getDuration(outage.startDate, outage.endDate)}</span>
                                </div>
                              </div>

                              {/* Mobile Action Button */}
                              <div className="sm:hidden w-full">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOutage(outage)}
                                  className="w-full justify-between"
                                >
                                  <span>View Details</span>
                                  <span className="text-xs">{getDuration(outage.startDate, outage.endDate)}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm">
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                            <span>High Impact</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded"></div>
                            <span>Medium Impact</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
                            <span>Low Impact</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {environments.map((env) => (
                            <div key={env} className="flex items-center gap-1">
                              <div
                                className={`w-3 h-3 ${environmentColors[env as keyof typeof environmentColors]} rounded`}
                              ></div>
                              <span className="text-xs">{env}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Day by Day Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5" />
                      Day-by-Day Impact Schedule
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Detailed breakdown showing exactly what will be affected each day
                    </CardDescription>
                  </div>
                  {isMobile && (
                    <Button variant="ghost" size="sm" onClick={() => toggleSection("dayByDay")}>
                      {expandedSections.dayByDay ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {expandedSections.dayByDay && (
                <CardContent>
                  <div className="space-y-6">
                    {dayByDayBreakdown.map(([date, outages]) => (
                      <div key={date} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="text-base sm:text-lg font-semibold mb-3">
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </h3>

                        <div className="space-y-4">
                          {outages.map((outage) => (
                            <div
                              key={`${outage.id}-${date}`}
                              className="bg-white rounded-lg border p-3 sm:p-4 shadow-sm"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base sm:text-lg">{outage.title}</h4>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span className="sm:hidden">
                                        {outage.startDate.toLocaleDateString()} - {outage.endDate.toLocaleDateString()}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
                                      </span>
                                    </span>
                                    <span>Duration: {getDuration(outage.startDate, outage.endDate)}</span>
                                  </div>
                                </div>
                                <Badge className={severityColors[outage.severity]}>{outage.severity} Impact</Badge>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="font-medium mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Environment Impact
                                  </h5>
                                  <div className="space-y-2">
                                    {outage.environments
                                      .filter((env) => selectedEnvironments.includes(env.name))
                                      .map((env) => (
                                        <div
                                          key={env.name}
                                          className="flex items-center justify-between p-2 rounded bg-gray-50"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              className={`${environmentColors[env.name as keyof typeof environmentColors]} text-white text-xs`}
                                            >
                                              {env.name}
                                            </Badge>
                                            <span
                                              className={`text-sm ${env.affected ? "text-red-600 font-medium" : "text-green-600"}`}
                                            >
                                              {env.affected ? "AFFECTED" : "No Impact"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-medium mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Detailed Impact
                                  </h5>
                                  <ul className="text-sm space-y-1">
                                    {outage.detailedImpact.map((impact, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-red-500 mt-1 flex-shrink-0">•</span>
                                        <span>{impact}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">Responsible Team:</span>
                                  <Badge variant="secondary">{outage.assignee}</Badge>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Reason:</strong> {outage.reason}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {filteredOutages.filter((o) => o.severity === "High").length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">High Impact Outages</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {filteredOutages.filter((o) => o.severity === "Medium").length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Medium Impact Outages</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {filteredOutages.filter((o) => o.severity === "Low").length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Low Impact Outages</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {filteredOutages.reduce((acc, outage) => {
                      const hours = (outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)
                      return acc + Math.round(hours)
                    }, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Total Downtime Hours</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Outage Tab */}
          <TabsContent value="schedule">
            <OutageForm />
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    GCP Platform Uptime & Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Weekly uptime tracking and system health indicators for GCP environments
                  </CardDescription>
                </CardHeader>
              </Card>
              <UptimeMetrics />
            </div>
          </TabsContent>
        </Tabs>

        <Tooltip
          outage={tooltipData?.outage as OutageData}
          x={tooltipData?.x || 0}
          y={tooltipData?.y || 0}
          visible={!!tooltipData?.visible}
        />

        {/* Interactive Modal for Outage Details */}
        <Dialog open={!!selectedOutage} onOpenChange={() => setSelectedOutage(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedOutage && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-xl">{selectedOutage.title}</DialogTitle>
                      <DialogDescription className="mt-2">
                        {formatDateTime(selectedOutage.startDate)} → {formatDateTime(selectedOutage.endDate)}
                        <br />
                        Duration: {getDuration(selectedOutage.startDate, selectedOutage.endDate)}
                      </DialogDescription>
                    </div>
                    <Badge className={severityColors[selectedOutage.severity]}>{selectedOutage.severity} Impact</Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Affected Environments</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOutage.environments.map((env) => (
                        <div
                          key={env.name}
                          className={`p-3 rounded-lg border ${
                            env.affected ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`${environmentColors[env.name as keyof typeof environmentColors]} text-white text-xs`}
                            >
                              {env.name}
                            </Badge>
                            <span className={`text-sm font-medium ${env.affected ? "text-red-600" : "text-green-600"}`}>
                              {env.affected ? "AFFECTED" : "No Impact"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{env.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Detailed Impact</h4>
                    <ul className="space-y-2">
                      {selectedOutage.detailedImpact.map((impact, index) => (
                        <li key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                          <span className="text-red-500 mt-1">•</span>
                          <span className="text-sm">{impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Responsible Team:</span>
                      <Badge variant="secondary" className="ml-2">
                        {selectedOutage.assignee}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Reason:</span>
                      <span className="text-sm ml-2">{selectedOutage.reason}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
