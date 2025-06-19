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
  Filter,
  Search,
  RotateCcw,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import dynamic from "next/dynamic"
import { getOutages } from "./actions/excel-actions"

// Dynamically import components
const UptimeMetrics = dynamic(
  () => import("./components/uptime-metrics").then((mod) => ({ default: mod.UptimeMetrics })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>,
  },
)

const EnhancedOutageForm = dynamic(
  () => import("./components/enhanced-outage-form").then((mod) => ({ default: mod.EnhancedOutageForm })),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>,
  },
)

const MultiOutageForm = dynamic(
  () => import("./components/multi-outage-form").then((mod) => ({ default: mod.MultiOutageForm })),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>,
  },
)

interface OutageData {
  id: number
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  status: string
  type: string
  severity: "High" | "Medium" | "Low"
  priority?: number
  category?: string
  contactEmail?: string
  estimatedUsers?: number
  createdAt?: Date
  updatedAt?: Date
}

const environments = ["POC", "SBX DEV", "SBX UAT", "PROD"]
const environmentColors = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  PROD: "bg-red-500",
}

const severityColors = {
  High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  Medium:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
}

export default function OutageDashboard() {
  const [outageData, setOutageData] = useState<OutageData[]>([])
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(environments)
  const [selectedMonth, setSelectedMonth] = useState("2024-12")
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
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline")
  const [sortBy, setSortBy] = useState<"date" | "severity" | "team">("date")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

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

  // Load outages from data storage
  const loadOutages = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      const outages = await getOutages()
      // Sort chronologically (latest first)
      const sortedOutages = outages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setOutageData(sortedOutages as OutageData[])
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to load outages:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadOutages()
    }
  }, [isMounted])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isMounted) return

    const interval = setInterval(() => {
      loadOutages(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [isMounted])

  const filteredOutages = useMemo(() => {
    const filtered = outageData.filter((outage) => {
      const hasSelectedEnv = outage.environments.some((env) => selectedEnvironments.includes(env))
      const monthMatch = outage.startDate.toISOString().startsWith(selectedMonth)
      const searchMatch =
        searchTerm === "" ||
        outage.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outage.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (outage.category && outage.category.toLowerCase().includes(searchTerm.toLowerCase()))

      return hasSelectedEnv && monthMatch && searchMatch
    })

    // Sort outages based on selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          const severityOrder = { High: 3, Medium: 2, Low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        case "team":
          return a.assignee.localeCompare(b.assignee)
        case "date":
        default:
          // For date sorting, show latest created first, then by start date
          if (a.createdAt && b.createdAt) {
            return b.createdAt.getTime() - a.createdAt.getTime()
          }
          return b.startDate.getTime() - a.startDate.getTime()
      }
    })

    return filtered
  }, [outageData, selectedEnvironments, selectedMonth, searchTerm, sortBy])

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

    return {
      left: `${Math.max(0, startPercent)}%`,
      width: `${Math.max(2, widthPercent)}%`,
    }
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

    return Object.entries(days).sort(([a], [b]) => b.localeCompare(a)) // Latest first
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

  const resetFilters = () => {
    setSelectedEnvironments(environments)
    setSearchTerm("")
    setSortBy("date")
  }

  const dayByDayBreakdown = getDayByDayBreakdown()

  const Tooltip = ({ outage, x, y, visible }: { outage: OutageData; x: number; y: number; visible: boolean }) => {
    if (!visible || !isMounted) return null

    return (
      <div
        className="fixed z-50 bg-black dark:bg-white text-white dark:text-black p-3 rounded-lg shadow-lg max-w-xs pointer-events-none"
        style={{ left: x + 10, top: y - 10 }}
      >
        <div className="font-semibold">{outage.title}</div>
        <div className="text-sm opacity-90">
          {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
        </div>
        <div className="text-sm opacity-90">Duration: {getDuration(outage.startDate, outage.endDate)}</div>
        <div className="text-sm opacity-90">Team: {outage.assignee}</div>
      </div>
    )
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading GCP Outages Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4" data-testid="dashboard">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header with Theme Toggle */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">GCP Outages</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadOutages(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <ThemeToggle />
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Comprehensive dashboard for tracking GCP platform outages, uptime metrics, and scheduling maintenance
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()} | Auto-refresh every 30 seconds
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Single Outage
            </TabsTrigger>
            <TabsTrigger value="multiple" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Multiple Outages
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
                .slice(0, 3)
                .map((outage) => (
                  <Alert key={outage.id} className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300 text-sm">
                      <strong>HIGH IMPACT:</strong> {outage.title} on {formatDateTime(outage.startDate)} -{" "}
                      {formatDateTime(outage.endDate)}
                      <br />
                      <strong>Team:</strong> {outage.assignee}
                      {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                        <>
                          <br />
                          <strong>Estimated Users Affected:</strong> {outage.estimatedUsers.toLocaleString()}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>

            {/* Enhanced Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Advanced Filters & Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Sort Row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Search Outages</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search by title, team, or category..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sort By</Label>
                      <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Latest First</SelectItem>
                          <SelectItem value="severity">Severity</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-12">December 2024</SelectItem>
                          <SelectItem value="2024-11">November 2024</SelectItem>
                          <SelectItem value="2024-10">October 2024</SelectItem>
                          <SelectItem value="2024-09">September 2024</SelectItem>
                          <SelectItem value="2024-08">August 2024</SelectItem>
                          <SelectItem value="2024-07">July 2024</SelectItem>
                          <SelectItem value="2024-06">June 2024</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Environment Filters */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Show Outages Affecting:</Label>
                    <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
                      {environments.map((env) => (
                        <div key={env} className="flex items-center space-x-2">
                          <Checkbox
                            id={env}
                            checked={selectedEnvironments.includes(env)}
                            onCheckedChange={(checked) => handleEnvironmentChange(env, checked as boolean)}
                          />
                          <Label htmlFor={env} className="text-sm font-medium cursor-pointer">
                            {env}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">View:</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === "timeline" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("timeline")}
                        >
                          Timeline
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                        >
                          List View
                        </Button>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Gantt Chart */}
            {viewMode === "timeline" && (
              <Card data-testid="gantt-chart">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="w-5 h-5" />
                        Interactive Outage Timeline - {selectedMonth}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Real-time timeline with automatic updates. Click on any outage for details.
                        <br />
                        Showing {filteredOutages.length} outages | Timeline: {dateRange.start.toLocaleDateString()} -{" "}
                        {dateRange.end.toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {isMobile && (
                      <Button variant="ghost" size="sm" onClick={() => toggleSection("gantt")}>
                        {expandedSections.gantt ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {expandedSections.gantt && (
                  <CardContent>
                    <div className="space-y-4">
                      {/* Enhanced Timeline Header */}
                      <div className="relative">
                        <div className="flex text-xs font-medium text-muted-foreground mb-2">
                          <div className="w-full sm:w-96 pr-4">Outage Information</div>
                          <div className="hidden sm:block flex-1 text-center">
                            {selectedMonth === "2024-12" ? "December 2024" : selectedMonth} - Daily Timeline
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-full sm:w-96 pr-4"></div>
                          <div className="hidden sm:block flex-1 relative h-10 bg-muted rounded-lg overflow-hidden">
                            <div className="absolute inset-0 flex">
                              {Array.from({ length: Math.min(dateRange.totalDays, 31) }, (_, i) => {
                                const currentDate = new Date(dateRange.start)
                                currentDate.setDate(currentDate.getDate() + i)
                                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
                                return (
                                  <div
                                    key={i}
                                    className={`flex-1 flex flex-col items-center justify-center text-xs font-medium border-r border-border last:border-r-0 min-w-0 py-1 ${
                                      isWeekend ? "bg-muted-foreground/10" : ""
                                    }`}
                                  >
                                    <div className={isWeekend ? "text-destructive" : ""}>{currentDate.getDate()}</div>
                                    <div className="text-muted-foreground text-xs">
                                      {currentDate.toLocaleDateString("en-US", { weekday: "short" })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Gantt Bars */}
                      <div className="space-y-2">
                        {isLoading ? (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="flex items-center space-x-4">
                                <div className="w-96 h-16 bg-muted animate-pulse rounded"></div>
                                <div className="flex-1 h-16 bg-muted animate-pulse rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : filteredOutages.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No outages found</h3>
                            <p>Try adjusting your filters or create a new outage.</p>
                          </div>
                        ) : (
                          filteredOutages.map((outage, index) => {
                            const position = getGanttPosition(outage.startDate, outage.endDate)

                            return (
                              <div key={outage.id} className="relative group">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center hover:bg-muted/50 rounded-lg p-2 transition-colors">
                                  {/* Enhanced Outage Info */}
                                  <div className="w-full sm:w-96 pr-4 mb-2 sm:mb-0">
                                    <div className="space-y-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <h4 className="font-medium text-sm flex-1">{outage.title}</h4>
                                        <div className="flex gap-2">
                                          <Badge className={severityColors[outage.severity]} variant="outline">
                                            {outage.severity}
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            #{outage.id}
                                          </Badge>
                                          {outage.createdAt && (
                                            <Badge variant="outline" className="text-xs">
                                              {outage.createdAt.toLocaleDateString()}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {outage.environments.map((env) => (
                                          <Badge
                                            key={env}
                                            className={`text-xs ${environmentColors[env as keyof typeof environmentColors]} text-white`}
                                          >
                                            {env}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span className="sm:hidden">
                                            {outage.startDate.toLocaleDateString()} -{" "}
                                            {outage.endDate.toLocaleDateString()}
                                          </span>
                                          <span className="hidden sm:inline">
                                            {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
                                          </span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          {outage.assignee}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Enhanced Gantt Bar */}
                                  <div className="hidden sm:block flex-1 relative h-16 bg-muted rounded-lg overflow-hidden">
                                    <div
                                      className={`absolute top-2 h-12 rounded-lg flex items-center px-3 text-white text-xs font-medium shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${
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
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">
                                          {getDuration(outage.startDate, outage.endDate)}
                                        </span>
                                      </div>
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
                          })
                        )}
                      </div>

                      {/* Enhanced Legend */}
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
            )}

            {/* List View */}
            {viewMode === "list" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Server className="w-5 h-5" />
                    Outages List View (Latest First)
                  </CardTitle>
                  <CardDescription>Showing {filteredOutages.length} outages in chronological order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="border rounded-lg p-4 animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredOutages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No outages found</h3>
                        <p>Try adjusting your filters or create a new outage.</p>
                      </div>
                    ) : (
                      filteredOutages.map((outage) => (
                        <div
                          key={outage.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-card"
                          onClick={() => setSelectedOutage(outage)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{outage.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={severityColors[outage.severity]}>{outage.severity}</Badge>
                                {outage.priority && <Badge variant="secondary">Priority {outage.priority}</Badge>}
                                {outage.category && <Badge variant="outline">{outage.category}</Badge>}
                                {outage.createdAt && (
                                  <Badge variant="outline" className="text-xs">
                                    Created: {outage.createdAt.toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary">#{outage.id}</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p>
                                <strong>Duration:</strong> {getDuration(outage.startDate, outage.endDate)}
                              </p>
                              <p>
                                <strong>Team:</strong> {outage.assignee}
                              </p>
                              {outage.contactEmail && (
                                <p>
                                  <strong>Contact:</strong> {outage.contactEmail}
                                </p>
                              )}
                            </div>
                            <div>
                              <p>
                                <strong>Start:</strong> {formatDateTime(outage.startDate)}
                              </p>
                              <p>
                                <strong>End:</strong> {formatDateTime(outage.endDate)}
                              </p>
                              {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                                <p>
                                  <strong>Users Affected:</strong> {outage.estimatedUsers.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-3">
                            {outage.environments.map((env) => (
                              <Badge key={env} variant="secondary" className="text-xs">
                                {env}
                              </Badge>
                            ))}
                          </div>

                          {outage.reason && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-muted-foreground">
                                <strong>Reason:</strong> {outage.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Day by Day Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-5 h-5" />
                      Day-by-Day Impact Schedule (Latest First)
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
                    {dayByDayBreakdown.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No outages scheduled</h3>
                        <p>No outages found for the selected filters and time period.</p>
                      </div>
                    ) : (
                      dayByDayBreakdown.map(([date, outages]) => (
                        <div key={date} className="border-l-4 border-primary pl-4">
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
                                className="bg-card rounded-lg border p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedOutage(outage)}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base sm:text-lg">{outage.title}</h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span className="sm:hidden">
                                          {outage.startDate.toLocaleDateString()} -{" "}
                                          {outage.endDate.toLocaleDateString()}
                                        </span>
                                        <span className="hidden sm:inline">
                                          {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
                                        </span>
                                      </span>
                                      <span>Duration: {getDuration(outage.startDate, outage.endDate)}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge className={severityColors[outage.severity]}>{outage.severity} Impact</Badge>
                                    {outage.priority && <Badge variant="secondary">P{outage.priority}</Badge>}
                                    {outage.createdAt && (
                                      <Badge variant="outline" className="text-xs">
                                        {outage.createdAt.toLocaleDateString()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-medium mb-2 flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      Environment Impact
                                    </h5>
                                    <div className="space-y-2">
                                      {outage.environments
                                        .filter((env) => selectedEnvironments.includes(env))
                                        .map((env) => (
                                          <div
                                            key={env}
                                            className="flex items-center justify-between p-2 rounded bg-muted"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                className={`${environmentColors[env as keyof typeof environmentColors]} text-white text-xs`}
                                              >
                                                {env}
                                              </Badge>
                                              <span className="text-sm text-destructive font-medium">AFFECTED</span>
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
                                      {outage.detailedImpact.slice(0, 3).map((impact, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                          <span className="text-destructive mt-1 flex-shrink-0">•</span>
                                          <span>{impact}</span>
                                        </li>
                                      ))}
                                      {outage.detailedImpact.length > 3 && (
                                        <li className="text-muted-foreground text-xs">
                                          +{outage.detailedImpact.length - 3} more impacts...
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Responsible Team:</span>
                                    <Badge variant="secondary">{outage.assignee}</Badge>
                                  </div>
                                  {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                      <strong>Users Affected:</strong> {outage.estimatedUsers.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Enhanced Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                    {filteredOutages.filter((o) => o.severity === "High").length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">High Impact</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {filteredOutages.filter((o) => o.severity === "Medium").length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Medium Impact</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {filteredOutages.filter((o) => o.severity === "Low").length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Low Impact</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {filteredOutages.reduce((acc, outage) => {
                      const hours = (outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)
                      return acc + Math.round(hours)
                    }, 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {filteredOutages.reduce((acc, outage) => acc + (outage.estimatedUsers || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Users Affected</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Single Outage Tab */}
          <TabsContent value="single">
            <EnhancedOutageForm />
          </TabsContent>

          {/* Multiple Outages Tab */}
          <TabsContent value="multiple">
            <MultiOutageForm />
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

        {/* Enhanced Modal for Outage Details */}
        <Dialog open={!!selectedOutage} onOpenChange={() => setSelectedOutage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedOutage && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-xl">{selectedOutage.title}</DialogTitle>
                      <DialogDescription className="mt-2">
                        ID: #{selectedOutage.id} | {formatDateTime(selectedOutage.startDate)} →{" "}
                        {formatDateTime(selectedOutage.endDate)}
                        <br />
                        Duration: {getDuration(selectedOutage.startDate, selectedOutage.endDate)} | Team:{" "}
                        {selectedOutage.assignee}
                        {selectedOutage.category && (
                          <>
                            <br />
                            Category: {selectedOutage.category}
                          </>
                        )}
                        {selectedOutage.createdAt && (
                          <>
                            <br />
                            Created: {selectedOutage.createdAt.toLocaleString()}
                          </>
                        )}
                      </DialogDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={severityColors[selectedOutage.severity]}>
                        {selectedOutage.severity} Impact
                      </Badge>
                      {selectedOutage.priority && <Badge variant="secondary">Priority {selectedOutage.priority}</Badge>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Affected Environments</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOutage.environments.map((env) => (
                        <div
                          key={env}
                          className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`${environmentColors[env as keyof typeof environmentColors]} text-white text-xs`}
                            >
                              {env}
                            </Badge>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">AFFECTED</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{env} environment will be impacted</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Detailed Impact</h4>
                    <ul className="space-y-2">
                      {selectedOutage.detailedImpact.map((impact, index) => (
                        <li key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <span className="text-red-500 mt-1">•</span>
                          <span className="text-sm">{impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Outage Information</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">Affected Models</div>
                          <div className="text-sm text-muted-foreground">{selectedOutage.affectedModels}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">Reason</div>
                          <div className="text-sm text-muted-foreground">{selectedOutage.reason}</div>
                        </div>
                        {selectedOutage.contactEmail && (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-sm font-medium">Contact Email</div>
                            <div className="text-sm text-muted-foreground">{selectedOutage.contactEmail}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Impact Statistics</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">Duration</div>
                          <div className="text-sm text-muted-foreground">
                            {getDuration(selectedOutage.startDate, selectedOutage.endDate)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium">Environments Affected</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedOutage.environments.length} environment
                            {selectedOutage.environments.length > 1 ? "s" : ""}
                          </div>
                        </div>
                        {selectedOutage.estimatedUsers && selectedOutage.estimatedUsers > 0 && (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-sm font-medium">Estimated Users Affected</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedOutage.estimatedUsers.toLocaleString()} users
                            </div>
                          </div>
                        )}
                      </div>
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
