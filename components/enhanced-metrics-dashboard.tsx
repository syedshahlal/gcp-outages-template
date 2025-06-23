"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDetailedDate, getUserTimezone, getTimezoneAbbreviation } from "@/lib/timezone-utils"

interface MetricsData {
  summary: {
    totalOutages: number
    upcomingOutages: number
    pastOutages: number
    ongoingOutages: number
    totalDowntime: number
    averageDowntime: number
    totalUsersAffected: number
    dataAccuracy: number
    lastValidated: Date
  }
  breakdowns: {
    severity: Record<string, number>
    type: Record<string, number>
    environment: Record<string, number>
    monthly: Array<{ month: string; count: number; downtime: number }>
    team: Record<string, number>
  }
  trends: {
    outageFrequency: Array<{ period: string; count: number; trend: "up" | "down" | "stable" }>
    mttr: Array<{ period: string; hours: number; trend: "up" | "down" | "stable" }>
    userImpact: Array<{ period: string; users: number; trend: "up" | "down" | "stable" }>
  }
  recentOutages: any[]
  upcomingOutages: any[]
  dataIntegrity: {
    missingTimestamps: number
    incompleteDescriptions: number
    unassignedOutages: number
    validationErrors: string[]
  }
}

// Enhanced chart components with better styling and interactivity
function EnhancedBarChart({ data, config, title }: { data: any[]; config: any; title: string }) {
  const [chartComponents, setChartComponents] = useState<any>(null)

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const recharts = await import("recharts")
        setChartComponents({
          ResponsiveContainer: recharts.ResponsiveContainer,
          BarChart: recharts.BarChart,
          Bar: recharts.Bar,
          XAxis: recharts.XAxis,
          YAxis: recharts.YAxis,
          CartesianGrid: recharts.CartesianGrid,
          Legend: recharts.Legend,
        })
      } catch (error) {
        console.error("Failed to load chart components:", error)
      }
    }
    loadCharts()
  }, [])

  if (!chartComponents) {
    return (
      <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading {title}...</div>
      </div>
    )
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } = chartComponents

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={{ stroke: "#666" }} />
        <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: "#666" }} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0,0,0,0.1)" }} />
        <Legend />
        {Object.entries(config).map(([key, value]: [string, any]) => (
          <Bar key={key} dataKey={key} fill={value.color} name={value.label} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function EnhancedPieChart({ data, config, title }: { data: any[]; config: any; title: string }) {
  const [chartComponents, setChartComponents] = useState<any>(null)

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const recharts = await import("recharts")
        setChartComponents({
          ResponsiveContainer: recharts.ResponsiveContainer,
          PieChart: recharts.PieChart,
          Pie: recharts.Pie,
          Cell: recharts.Cell,
          Legend: recharts.Legend,
        })
      } catch (error) {
        console.error("Failed to load chart components:", error)
      }
    }
    loadCharts()
  }, [])

  if (!chartComponents) {
    return (
      <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading {title}...</div>
      </div>
    )
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Legend } = chartComponents

  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f97316"]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function EnhancedMetricsDashboard() {
  const { toast } = useToast()
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimezone, setSelectedTimezone] = useState<string>("")
  const [dataValidationStatus, setDataValidationStatus] = useState<"validating" | "valid" | "errors">("validating")

  useEffect(() => {
    setSelectedTimezone(getUserTimezone())
  }, [])

  const fetchMetricsData = async () => {
    try {
      setLoading(true)
      setDataValidationStatus("validating")

      // Fetch comprehensive metrics with data validation
      const response = await fetch("/api/metrics?includeValidation=true", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch metrics data")
      }

      const data = await response.json()

      // Validate data integrity
      const validationResult = validateMetricsData(data)

      if (validationResult.isValid) {
        setMetricsData(data)
        setDataValidationStatus("valid")
        toast({
          title: "Metrics Updated",
          description: `Data validated successfully. Accuracy: ${data.summary.dataAccuracy}%`,
        })
      } else {
        setDataValidationStatus("errors")
        toast({
          title: "Data Validation Issues",
          description: `Found ${validationResult.errors.length} validation errors`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
      setDataValidationStatus("errors")
      toast({
        title: "Error Loading Metrics",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateMetricsData = (data: any) => {
    const errors: string[] = []

    // Check for required fields
    if (!data.summary) errors.push("Missing summary data")
    if (!data.breakdowns) errors.push("Missing breakdown data")
    if (!data.trends) errors.push("Missing trend data")

    // Validate data consistency
    if (data.summary) {
      const totalCalculated = data.summary.upcomingOutages + data.summary.pastOutages + data.summary.ongoingOutages
      if (Math.abs(totalCalculated - data.summary.totalOutages) > 1) {
        errors.push("Inconsistent outage totals")
      }
    }

    // Check for missing timestamps
    if (data.dataIntegrity?.missingTimestamps > 0) {
      errors.push(`${data.dataIntegrity.missingTimestamps} outages missing timestamps`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  useEffect(() => {
    fetchMetricsData()

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchMetricsData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const chartData = useMemo(() => {
    if (!metricsData) return null

    return {
      severityData: Object.entries(metricsData.breakdowns.severity).map(([key, value]) => ({
        name: key,
        value,
        severity: value,
      })),
      typeData: Object.entries(metricsData.breakdowns.type).map(([key, value]) => ({
        name: key,
        value,
        type: value,
      })),
      environmentData: Object.entries(metricsData.breakdowns.environment).map(([key, value]) => ({
        name: key,
        value,
        environment: value,
      })),
      monthlyData: metricsData.breakdowns.monthly.map((item) => ({
        name: item.month,
        outages: item.count,
        downtime: item.downtime,
      })),
    }
  }, [metricsData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!metricsData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load metrics data. Please try refreshing the page.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Validation Status */}
      <Alert
        className={
          dataValidationStatus === "valid"
            ? "border-green-200 bg-green-50"
            : dataValidationStatus === "errors"
              ? "border-red-200 bg-red-50"
              : "border-yellow-200 bg-yellow-50"
        }
      >
        <div className="flex items-center gap-2">
          {dataValidationStatus === "valid" && <CheckCircle className="h-4 w-4 text-green-600" />}
          {dataValidationStatus === "errors" && <AlertTriangle className="h-4 w-4 text-red-600" />}
          {dataValidationStatus === "validating" && <Activity className="h-4 w-4 text-yellow-600 animate-spin" />}
          <AlertDescription>
            <strong>Data Status:</strong>{" "}
            {dataValidationStatus === "valid"
              ? `Validated - ${metricsData.summary.dataAccuracy}% accuracy`
              : dataValidationStatus === "errors"
                ? `Validation errors detected`
                : "Validating data integrity..."}
            {metricsData.summary.lastValidated && (
              <span className="ml-2 text-sm text-muted-foreground">
                Last validated: {formatDetailedDate(metricsData.summary.lastValidated, selectedTimezone)}
              </span>
            )}
          </AlertDescription>
        </div>
      </Alert>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Outages</p>
                <div className="text-3xl font-bold text-blue-600">
                  {metricsData.summary.totalOutages.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all environments</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active/Upcoming</p>
                <div className="text-3xl font-bold text-orange-600">
                  {(metricsData.summary.ongoingOutages + metricsData.summary.upcomingOutages).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metricsData.summary.ongoingOutages} active, {metricsData.summary.upcomingOutages} scheduled
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Downtime</p>
                <div className="text-3xl font-bold text-red-600">
                  {metricsData.summary.totalDowntime.toLocaleString()}h
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {metricsData.summary.averageDowntime.toFixed(1)}h per outage
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Users Affected</p>
                <div className="text-3xl font-bold text-purple-600">
                  {metricsData.summary.totalUsersAffected.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cumulative impact</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Integrity Status */}
      {metricsData.dataIntegrity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Data Integrity Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metricsData.dataIntegrity.missingTimestamps}</div>
                <p className="text-sm text-muted-foreground">Missing Timestamps</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {metricsData.dataIntegrity.incompleteDescriptions}
                </div>
                <p className="text-sm text-muted-foreground">Incomplete Descriptions</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{metricsData.dataIntegrity.unassignedOutages}</div>
                <p className="text-sm text-muted-foreground">Unassigned Outages</p>
              </div>
            </div>
            {metricsData.dataIntegrity.validationErrors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Validation Errors:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {metricsData.dataIntegrity.validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Charts */}
      <Tabs defaultValue="breakdowns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdowns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Outages by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    High: { label: "High", color: "hsl(var(--chart-1))" },
                    Medium: { label: "Medium", color: "hsl(var(--chart-2))" },
                    Low: { label: "Low", color: "hsl(var(--chart-3))" },
                  }}
                  className="h-[300px]"
                >
                  {chartData && (
                    <EnhancedPieChart data={chartData.severityData} config={{}} title="Severity Distribution" />
                  )}
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Impact</CardTitle>
                <CardDescription>Outages by environment</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    environment: { label: "Outages", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-[300px]"
                >
                  {chartData && (
                    <EnhancedBarChart
                      data={chartData.environmentData}
                      config={{ value: { label: "Outages", color: "#3b82f6" } }}
                      title="Environment Impact"
                    />
                  )}
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Outage frequency and downtime by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  outages: { label: "Outages", color: "hsl(var(--chart-1))" },
                  downtime: { label: "Downtime (hours)", color: "hsl(var(--chart-2))" },
                }}
                className="h-[400px]"
              >
                {chartData && (
                  <EnhancedBarChart
                    data={chartData.monthlyData}
                    config={{
                      outages: { label: "Outages", color: "#3b82f6" },
                      downtime: { label: "Downtime (hours)", color: "#ef4444" },
                    }}
                    title="Monthly Trends"
                  />
                )}
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {metricsData.trends.outageFrequency.map((trend, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{trend.period}</p>
                      <div className="text-2xl font-bold">{trend.count}</div>
                      <p className="text-xs text-muted-foreground">outages</p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        trend.trend === "up" ? "bg-red-100" : trend.trend === "down" ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      {trend.trend === "up" && <TrendingUp className="w-6 h-6 text-red-600" />}
                      {trend.trend === "down" && <TrendingDown className="w-6 h-6 text-green-600" />}
                      {trend.trend === "stable" && <Activity className="w-6 h-6 text-gray-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Outages Timeline
              </CardTitle>
              <CardDescription>
                Next scheduled outages with timezone: {getTimezoneAbbreviation(selectedTimezone)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metricsData.upcomingOutages.slice(0, 10).map((outage, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{outage.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDetailedDate(new Date(outage.startDate), selectedTimezone)}
                      </p>
                      <div className="flex gap-2 mt-2">
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
                        <Badge variant="outline">{outage.outageType || "Internal"}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{outage.assignee}</p>
                      <p className="text-xs text-muted-foreground">{outage.environments?.join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchMetricsData} disabled={loading}>
          <Activity className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh Metrics"}
        </Button>
      </div>
    </div>
  )
}
