"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Filter, Search, Users, AlertTriangle, BarChart3, TrendingUp, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EnhancedOutageForm } from "@/components/enhanced-outage-form"
import { TabularMultiOutageForm } from "@/components/tabular-multi-outage-form"
import { EnhancedGanttChart } from "@/components/enhanced-gantt-chart"
import { InteractiveReport } from "@/components/interactive-report"
import { UptimeMetrics } from "@/components/uptime-metrics"

// Types
interface StoredOutage {
  id: number
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  severity: "High" | "Medium" | "Low"
  priority?: number
  category?: string
  contactEmail?: string
  estimatedUsers?: number
  outageType: "Internal" | "External"
  status: string
  type: string
  createdAt: Date
  updatedAt: Date
}

interface Environment {
  id: string
  name: string
  color: string
  description: string
}

interface Team {
  id: string
  name: string
  email: string
  description: string
}

// Fetch functions
async function fetchOutages(): Promise<StoredOutage[]> {
  try {
    const res = await fetch("/api/outages", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })

    let data: any

    if (res.ok) {
      data = await res.json()
    } else {
      // API failed (e.g. read-only FS in preview) – fall back to bundled JSON
      console.warn("API returned", res.status, "- falling back to outages.json")
      const fallback = await import("@/data/outages.json")
      data = fallback.default ?? fallback
    }

    const outagesArr = Array.isArray(data.outages) ? data.outages : data

    console.log("Fetching outages from API...")
    console.log("Raw API response:", data)

    const outages = Array.isArray(outagesArr) ? outagesArr : []
    console.log("Parsed outages:", outages.length)

    // Transform dates from strings to Date objects
    const transformedOutages = outages.map((outage) => ({
      ...outage,
      startDate: new Date(outage.startDate),
      endDate: new Date(outage.endDate),
      createdAt: new Date(outage.createdAt),
      updatedAt: new Date(outage.updatedAt),
    }))

    console.log("Transformed outages:", transformedOutages)
    return transformedOutages
  } catch (error) {
    console.error("Error fetching outages:", error)
    return []
  }
}

async function fetchConfig(type: "environments" | "teams") {
  const res = await fetch(`/api/config?type=${type}`)
  if (!res.ok) throw new Error(`Failed to fetch ${type} config`)
  return await res.json()
}

export default function OutageDashboard() {
  const { toast } = useToast()
  const [outages, setOutages] = useState<StoredOutage[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month")

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      console.log("Loading dashboard data...")
      const [outagesData, envConfig, teamConfig] = await Promise.all([
        fetchOutages(),
        fetchConfig("environments"),
        fetchConfig("teams"),
      ])

      console.log("Loaded outages:", outagesData.length)
      setOutages(outagesData)
      setEnvironments(Array.isArray(envConfig.environments) ? envConfig.environments : envConfig)
      setTeams(Array.isArray(teamConfig.teams) ? teamConfig.teams : teamConfig)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Dashboard data has been refreshed",
    })
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle successful form submission
  const handleFormSuccess = () => {
    console.log("Form submitted successfully, refreshing data...")
    refreshData()
  }

  // Filter logic
  const filters = useMemo(() => {
    console.log("=== APPLYING FILTERS ===")
    console.log("Total outages before filtering:", outages.length)
    console.log("Search term:", searchTerm)
    console.log("Selected environments:", selectedEnvironments)
    console.log("Selected severity:", selectedSeverity)
    console.log("Selected status:", selectedStatus)
    console.log("Selected month:", selectedMonth)
    console.log("Custom date range:", customDateRange)

    const filtered = outages.filter((outage) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          outage.title.toLowerCase().includes(searchLower) ||
          outage.reason.toLowerCase().includes(searchLower) ||
          outage.assignee.toLowerCase().includes(searchLower) ||
          outage.affectedModels.toLowerCase().includes(searchLower)

        if (!matchesSearch) {
          console.log(`Outage "${outage.title}" filtered out by search`)
          return false
        }
      }

      // Environment filter
      if (selectedEnvironments.length > 0) {
        const hasMatchingEnv = outage.environments.some((env) => selectedEnvironments.includes(env))
        if (!hasMatchingEnv) {
          console.log(`Outage "${outage.title}" filtered out by environment`)
          return false
        }
      }

      // Severity filter
      if (selectedSeverity !== "all" && outage.severity !== selectedSeverity) {
        console.log(`Outage "${outage.title}" filtered out by severity`)
        return false
      }

      // Status filter
      if (selectedStatus !== "all" && outage.status !== selectedStatus) {
        console.log(`Outage "${outage.title}" filtered out by status`)
        return false
      }

      // Month filter
      if (selectedMonth !== "all") {
        const outageMonth = outage.startDate.toISOString().substring(0, 7) // YYYY-MM format
        console.log(`Comparing outage month "${outageMonth}" with selected "${selectedMonth}"`)
        if (outageMonth !== selectedMonth) {
          console.log(`Outage "${outage.title}" filtered out by month`)
          return false
        }
      }

      // Custom date range filter
      if (customDateRange.start && customDateRange.end) {
        const rangeStart = new Date(customDateRange.start)
        const rangeEnd = new Date(customDateRange.end)

        // Check if outage overlaps with the selected range
        const outageStart = outage.startDate
        const outageEnd = outage.endDate

        const overlaps = outageStart <= rangeEnd && outageEnd >= rangeStart

        console.log(`Outage "${outage.title}" date range: ${outageStart.toISOString()} to ${outageEnd.toISOString()}`)
        console.log(`Selected range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`)
        console.log(`Overlaps: ${overlaps}`)

        if (!overlaps) {
          console.log(`Outage "${outage.title}" filtered out by custom date range`)
          return false
        }
      }

      console.log(`Outage "${outage.title}" passed all filters`)
      return true
    })

    console.log(`Filtered results: ${filtered.length} of ${outages.length} outages`)
    return filtered
  }, [outages, searchTerm, selectedEnvironments, selectedSeverity, selectedStatus, selectedMonth, customDateRange])

  // Timeline range calculation
  const range = useMemo(() => {
    if (filters.length === 0) {
      console.log("No filtered outages, using default range")
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      }
    }

    const dates = filters.flatMap((o) => [o.startDate, o.endDate])
    const start = new Date(Math.min(...dates.map((d) => d.getTime())))
    const end = new Date(Math.max(...dates.map((d) => d.getTime())))

    // Add some padding
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() + 1)

    console.log("Calculated timeline range:", { start, end })
    return { start, end }
  }, [filters])

  // Environment filter handlers
  const handleEnvironmentToggle = (envName: string) => {
    setSelectedEnvironments((prev) => (prev.includes(envName) ? prev.filter((e) => e !== envName) : [...prev, envName]))
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedEnvironments([])
    setSelectedSeverity("all")
    setSelectedStatus("all")
    setSelectedMonth("all")
    setCustomDateRange({ start: "", end: "" })
  }

  // Generate month options for the last 12 months and next 6 months
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()

    // Add past 12 months
    for (let i = 12; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = date.toISOString().substring(0, 7)
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      options.push({ value, label })
    }

    // Add next 6 months
    for (let i = 1; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = date.toISOString().substring(0, 7)
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      options.push({ value, label })
    }

    return options
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GCP Outage Management Dashboard</h1>
          <p className="text-muted-foreground">
            Showing {filters.length} of {outages.length} outages
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="schedule-single">Schedule (Single)</TabsTrigger>
          <TabsTrigger value="schedule-multiple">Schedule (Multiple)</TabsTrigger>
          <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter outages by various criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search outages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Severity */}
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Month */}
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Custom Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Custom End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              {/* Environment Filters */}
              <div className="space-y-2">
                <Label>Environments</Label>
                <div className="flex flex-wrap gap-2">
                  {environments.map((env) => (
                    <div key={env.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={env.id}
                        checked={selectedEnvironments.includes(env.name)}
                        onCheckedChange={() => handleEnvironmentToggle(env.name)}
                      />
                      <Label htmlFor={env.id} className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-3 h-3 rounded-full ${env.color}`} />
                        {env.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
                <div className="text-sm text-muted-foreground">
                  {filters.length} of {outages.length} outages match your filters
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline View */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Outage Timeline
                  </CardTitle>
                  <CardDescription>Visual timeline of scheduled outages</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No outages match your current filters. Try adjusting your filter criteria.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="w-full">
                  <div className="min-w-[800px] space-y-4">
                    {/* Timeline Header */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Timeline: {range.start.toLocaleDateString()} - {range.end.toLocaleDateString()}
                      </span>
                      <span>{filters.length} outages</span>
                    </div>

                    {/* Timeline Items */}
                    <div className="space-y-3">
                      {filters
                        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                        .map((outage) => (
                          <div
                            key={outage.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  outage.severity === "High"
                                    ? "bg-red-500"
                                    : outage.severity === "Medium"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{outage.title}</h4>
                                <Badge
                                  variant={
                                    outage.severity === "High"
                                      ? "destructive"
                                      : outage.severity === "Medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {outage.severity}
                                </Badge>
                                <Badge variant="outline">{outage.status}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {outage.startDate.toLocaleDateString()} - {outage.endDate.toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {outage.assignee || "Unassigned"}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {outage.environments.map((env) => {
                                  const envConfig = environments.find((e) => e.name === env)
                                  return (
                                    <Badge
                                      key={env}
                                      className={`text-xs ${envConfig?.color || "bg-gray-500"} text-white`}
                                    >
                                      {env}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Outages</p>
                    <p className="text-2xl font-bold">{outages.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">High Severity</p>
                    <p className="text-2xl font-bold text-red-600">
                      {outages.filter((o) => o.severity === "High").length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {outages.filter((o) => o.status === "Scheduled").length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        outages.filter((o) => {
                          const currentMonth = new Date().toISOString().substring(0, 7)
                          return o.startDate.toISOString().substring(0, 7) === currentMonth
                        }).length
                      }
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule-single">
          <EnhancedOutageForm onSuccess={handleFormSuccess} />
        </TabsContent>

        <TabsContent value="schedule-multiple">
          <TabularMultiOutageForm onSuccess={handleFormSuccess} />
        </TabsContent>

        <TabsContent value="gantt">
          <EnhancedGanttChart />
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <InteractiveReport />
            <UptimeMetrics />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
