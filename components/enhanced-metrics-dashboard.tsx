"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  Info,
} from "lucide-react"
import { formatDetailedDate, getUserTimezone } from "@/lib/timezone-utils"

interface MetricsData {
  summary: {
    totalOutages: number
    upcomingOutages: number
    pastOutages: number
    ongoingOutages: number
    totalDowntime: number
    averageDowntime: number
    totalUsersAffected: number
    completionRate: number
    criticalOutages: number
    upcomingCritical: number
  }
  breakdowns: {
    severity: Record<string, number>
    type: Record<string, number>
    environment: Record<string, number>
  }
  trends: {
    monthly: Array<{
      month: string
      total: number
      high: number
      medium: number
      low: number
    }>
    teamWorkload: Array<{
      team: string
      total: number
      upcoming: number
      ongoing: number
    }>
  }
  insights: Array<{
    type: "warning" | "info" | "success"
    title: string
    message: string
    priority: "high" | "medium" | "low"
  }>
}

interface EnhancedMetricsDashboardProps {
  data?: MetricsData
  onRefresh?: () => void
  isLoading?: boolean
}

const MetricCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  color = "blue",
  trend,
}: {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: any
  description?: string
  color?: "blue" | "green" | "red" | "yellow" | "purple"
  trend?: Array<{ value: number; label: string }>
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  }

  const changeColors = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            {change && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${changeColors[changeType || "neutral"]}`}>
                {changeType === "positive" && <TrendingUp className="w-4 h-4" />}
                {changeType === "negative" && <TrendingDown className="w-4 h-4" />}
                <span>{change}</span>
              </div>
            )}
          </div>
          {trend && trend.length > 0 && (
            <div className="w-20 h-12">
              {/* Mini trend visualization */}
              <div className="flex items-end h-full gap-1">
                {trend.slice(-6).map((point, index) => (
                  <div
                    key={index}
                    className={`flex-1 ${colorClasses[color]} opacity-60 rounded-sm`}
                    style={{ height: `${Math.max(20, (point.value / Math.max(...trend.map((t) => t.value))) * 100)}%` }}
                    title={`${point.label}: ${point.value}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const InsightCard = ({ insight }: { insight: MetricsData["insights"][0] }) => {
  const iconMap = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
  }

  const colorMap = {
    warning: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
    success: "border-green-200 bg-green-50",
  }

  const iconColorMap = {
    warning: "text-yellow-600",
    info: "text-blue-600",
    success: "text-green-600",
  }

  const Icon = iconMap[insight.type]

  return (
    <Alert className={`${colorMap[insight.type]} border`}>
      <Icon className={`h-4 w-4 ${iconColorMap[insight.type]}`} />
      <AlertDescription>
        <div className="font-semibold text-sm">{insight.title}</div>
        <div className="text-sm mt-1">{insight.message}</div>
      </AlertDescription>
    </Alert>
  )
}

export default function EnhancedMetricsDashboard({
  data,
  onRefresh,
  isLoading = false,
}: EnhancedMetricsDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [chartComponents, setChartComponents] = useState<any>(null)
  const userTimezone = getUserTimezone()

  // Load chart components dynamically
  useEffect(() => {
    const loadCharts = async () => {
      try {
        const recharts = await import("recharts")
        setChartComponents({
          ResponsiveContainer: recharts.ResponsiveContainer,
          BarChart: recharts.BarChart,
          LineChart: recharts.LineChart,
          PieChart: recharts.PieChart,
          Area: recharts.Area,
          AreaChart: recharts.AreaChart,
          Bar: recharts.Bar,
          Line: recharts.Line,
          Pie: recharts.Pie,
          Cell: recharts.Cell,
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

  // Generate sample data if none provided
  const metricsData = useMemo(() => {
    return (
      data || {
        summary: {
          totalOutages: 0,
          upcomingOutages: 0,
          pastOutages: 0,
          ongoingOutages: 0,
          totalDowntime: 0,
          averageDowntime: 0,
          totalUsersAffected: 0,
          completionRate: 0,
          criticalOutages: 0,
          upcomingCritical: 0,
        },
        breakdowns: {
          severity: { High: 0, Medium: 0, Low: 0 },
          type: { Internal: 0, External: 0 },
          environment: {},
        },
        trends: {
          monthly: [],
          teamWorkload: [],
        },
        insights: [],
      }
    )
  }, [data])

  const exportData = () => {
    const exportData = {
      generatedAt: new Date().toISOString(),
      timezone: userTimezone,
      metrics: metricsData,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `outage-metrics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading metrics data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#f97316"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Outage Metrics Dashboard</h2>
          <p className="text-gray-600">
            Real-time insights and analytics • Updated {formatDetailedDate(new Date(), userTimezone)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Insights Alert Cards */}
      {metricsData.insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metricsData.insights
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                return priorityOrder[b.priority] - priorityOrder[a.priority]
              })
              .map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
          </div>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="breakdowns" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Breakdowns
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Outages"
              value={metricsData.summary.totalOutages}
              icon={Calendar}
              color="blue"
              description="All scheduled outages"
            />
            <MetricCard
              title="Upcoming Outages"
              value={metricsData.summary.upcomingOutages}
              icon={Clock}
              color="yellow"
              description="Scheduled for future"
            />
            <MetricCard
              title="Critical Outages"
              value={metricsData.summary.criticalOutages}
              icon={AlertTriangle}
              color="red"
              description="High severity outages"
            />
            <MetricCard
              title="Users Affected"
              value={metricsData.summary.totalUsersAffected.toLocaleString()}
              icon={Users}
              color="purple"
              description="Estimated total impact"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Completion Rate"
              value={`${metricsData.summary.completionRate}%`}
              icon={CheckCircle}
              color="green"
              description="Successfully completed outages"
            />
            <MetricCard
              title="Total Downtime"
              value={`${metricsData.summary.totalDowntime}h`}
              icon={Clock}
              color="red"
              description="Cumulative outage duration"
            />
            <MetricCard
              title="Average Duration"
              value={`${metricsData.summary.averageDowntime}h`}
              icon={Activity}
              color="blue"
              description="Mean outage duration"
            />
          </div>

          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status Overview</CardTitle>
              <CardDescription>Real-time outage status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Ongoing</span>
                    <span className="text-sm text-gray-600">{metricsData.summary.ongoingOutages}</span>
                  </div>
                  <Progress
                    value={(metricsData.summary.ongoingOutages / Math.max(1, metricsData.summary.totalOutages)) * 100}
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Upcoming</span>
                    <span className="text-sm text-gray-600">{metricsData.summary.upcomingOutages}</span>
                  </div>
                  <Progress
                    value={(metricsData.summary.upcomingOutages / Math.max(1, metricsData.summary.totalOutages)) * 100}
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Completed</span>
                    <span className="text-sm text-gray-600">{metricsData.summary.pastOutages}</span>
                  </div>
                  <Progress
                    value={(metricsData.summary.pastOutages / Math.max(1, metricsData.summary.totalOutages)) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Outage Trends</CardTitle>
              <CardDescription>Historical outage data by month and severity</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: "Total", color: "hsl(var(--chart-1))" },
                  high: { label: "High", color: "hsl(var(--chart-2))" },
                  medium: { label: "Medium", color: "hsl(var(--chart-3))" },
                  low: { label: "Low", color: "hsl(var(--chart-4))" },
                }}
                className="h-[400px]"
              >
                {chartComponents ? (
                  <chartComponents.ResponsiveContainer width="100%" height="100%">
                    <chartComponents.AreaChart data={metricsData.trends.monthly}>
                      <chartComponents.CartesianGrid strokeDasharray="3 3" />
                      <chartComponents.XAxis dataKey="month" />
                      <chartComponents.YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <chartComponents.Legend />
                      <chartComponents.Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="var(--color-high)"
                        fill="var(--color-high)"
                        fillOpacity={0.8}
                      />
                      <chartComponents.Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke="var(--color-medium)"
                        fill="var(--color-medium)"
                        fillOpacity={0.8}
                      />
                      <chartComponents.Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="var(--color-low)"
                        fill="var(--color-low)"
                        fillOpacity={0.8}
                      />
                    </chartComponents.AreaChart>
                  </chartComponents.ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-gray-500">Loading chart...</div>
                  </div>
                )}
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdowns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Outages by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metricsData.breakdowns.severity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            severity === "High"
                              ? "bg-red-100 text-red-800"
                              : severity === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }
                        >
                          {severity}
                        </Badge>
                        <span className="text-sm text-gray-600">{count} outages</span>
                      </div>
                      <div className="w-24">
                        <Progress
                          value={(count / Math.max(1, metricsData.summary.totalOutages)) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Outage Type Distribution</CardTitle>
                <CardDescription>Internal vs External outages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metricsData.breakdowns.type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            type === "External" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }
                        >
                          {type}
                        </Badge>
                        <span className="text-sm text-gray-600">{count} outages</span>
                      </div>
                      <div className="w-24">
                        <Progress
                          value={(count / Math.max(1, metricsData.summary.totalOutages)) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Environment Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Impact Analysis</CardTitle>
              <CardDescription>Outage frequency by environment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(metricsData.breakdowns.environment)
                  .sort(([, a], [, b]) => b - a)
                  .map(([env, count]) => (
                    <div key={env} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{env}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                      <Progress value={(count / Math.max(1, metricsData.summary.totalOutages)) * 100} className="h-2" />
                      <span className="text-xs text-gray-500 mt-1">
                        {((count / Math.max(1, metricsData.summary.totalOutages)) * 100).toFixed(1)}% of total
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {/* Team Workload */}
          <Card>
            <CardHeader>
              <CardTitle>Team Workload Analysis</CardTitle>
              <CardDescription>Outage assignments and workload distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {metricsData.trends.teamWorkload.map((team) => (
                    <div key={team.team} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-lg">{team.team}</span>
                        <Badge variant="outline" className="font-semibold">
                          {team.total} total
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{team.upcoming}</div>
                          <div className="text-gray-600">Upcoming</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{team.ongoing}</div>
                          <div className="text-gray-600">Ongoing</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {team.total - team.upcoming - team.ongoing}
                          </div>
                          <div className="text-gray-600">Completed</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress
                          value={(team.total / Math.max(1, metricsData.summary.totalOutages)) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
