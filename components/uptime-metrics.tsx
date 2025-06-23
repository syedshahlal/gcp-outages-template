"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Shield,
  MessageSquare,
  Settings,
  FileText,
  Download,
  RotateCcw,
} from "lucide-react"

interface AnalyticsData {
  overallScore: number
  availability: number
  slaCompliance: number
  businessImpact: number
  riskLevel: number
  recoveryRate: number
  costImpact: number
  totalOutages: number
  mttr: number
  mtbf: number
  criticalOutages: number
  usersAffected: number
  escalationRate: number
  preventionEffectiveness: number
  communicationScore: number
  automationRate: number
}

interface ChartData {
  month: string
  outages: number
}

interface WeeklyData {
  week: string
  availability: number
}

interface DurationData {
  category: string
  count: number
  color: string
}

interface TimeOfDayData {
  period: string
  count: number
}

interface DayOfWeekData {
  day: string
  count: number
}

const generateAnalyticsData = (): AnalyticsData => ({
  overallScore: 41,
  availability: 70,
  slaCompliance: 70,
  businessImpact: 0,
  riskLevel: 100,
  recoveryRate: 100,
  costImpact: 108850,
  totalOutages: 10,
  mttr: 2.3,
  mtbf: 72,
  criticalOutages: 1,
  usersAffected: 211900,
  escalationRate: 33.3,
  preventionEffectiveness: 0,
  communicationScore: 91.1,
  automationRate: 83.2,
})

const generateMonthlyTrends = (): ChartData[] => [
  { month: "Jan", outages: 32 },
  { month: "Feb", outages: 28 },
  { month: "Mar", outages: 24 },
  { month: "Apr", outages: 20 },
  { month: "May", outages: 16 },
  { month: "Jun", outages: 12 },
  { month: "Jul", outages: 10 },
  { month: "Aug", outages: 8 },
  { month: "Sep", outages: 6 },
  { month: "Oct", outages: 4 },
  { month: "Nov", outages: 3 },
  { month: "Dec", outages: 2 },
]

const generateWeeklyPerformance = (): WeeklyData[] => [
  { week: "Week 1", availability: 100 },
  { week: "Week 2", availability: 98 },
  { week: "Week 3", availability: 99 },
  { week: "Week 4", availability: 100 },
]

const generateDurationBreakdown = (): DurationData[] => [
  { category: "1-4 hours", count: 6, color: "#10b981" },
  { category: "4-8 hours", count: 3, color: "#f59e0b" },
  { category: "8+ hours", count: 1, color: "#ef4444" },
]

const generateTimeOfDayData = (): TimeOfDayData[] => [
  { period: "Evening (18-24)", count: 9 },
  { period: "Night (00-06)", count: 2 },
]

const generateDayOfWeekData = (): DayOfWeekData[] => [
  { day: "Tuesday", count: 2.25 },
  { day: "Friday", count: 1.75 },
  { day: "Sunday", count: 1.5 },
  { day: "Wednesday", count: 3 },
  { day: "Thursday", count: 1 },
]

function MetricCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  subtitle,
  trend,
}: {
  title: string
  value: string | number
  icon: any
  color?: string
  subtitle?: string
  trend?: "up" | "down"
}) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-100",
    green: "text-green-600 bg-green-100",
    red: "text-red-600 bg-red-100",
    orange: "text-orange-600 bg-orange-100",
    purple: "text-purple-600 bg-purple-100",
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${colorClasses[color as keyof typeof colorClasses].split(" ")[0]}`} />
              <p className="text-xs font-medium text-gray-400">{title}</p>
            </div>
            <p className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses].split(" ")[0]}`}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {trend && (
            <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
              {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function UptimeMetrics() {
  const analyticsData = useMemo(() => generateAnalyticsData(), [])
  const monthlyTrends = useMemo(() => generateMonthlyTrends(), [])
  const weeklyPerformance = useMemo(() => generateWeeklyPerformance(), [])
  const durationBreakdown = useMemo(() => generateDurationBreakdown(), [])
  const timeOfDayData = useMemo(() => generateTimeOfDayData(), [])
  const dayOfWeekData = useMemo(() => generateDayOfWeekData(), [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">GCP Planned Outages Analytics</h1>
          <p className="text-sm text-gray-400">Generated on 6/23/2025, 12:30:33 AM</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            PPT
          </Button>
          <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            HTML
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Filters & Analytics Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Severity</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Outage Type</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="unplanned">Unplanned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Environment</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="dev">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Assignee</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="team1">Team 1</SelectItem>
                  <SelectItem value="team2">Team 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Time Range</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="bg-gray-800 border-gray-700 text-white">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card className="mb-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Executive Summary Dashboard
          </CardTitle>
          <CardDescription className="text-gray-400">
            High-level performance indicators and business metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Overall Score */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-gray-800">
                  <span className="text-2xl font-bold text-green-500">{analyticsData.overallScore}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Overall Performance Score</p>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Availability</span>
                <span className="text-sm font-medium text-white">{analyticsData.availability}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analyticsData.availability}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">SLA Compliance</span>
                <span className="text-sm font-medium text-white">{analyticsData.slaCompliance}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${analyticsData.slaCompliance}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Business Impact</span>
                <span className="text-sm font-medium text-white">{analyticsData.businessImpact}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Risk Level</span>
                <span className="text-sm font-medium text-white">{analyticsData.riskLevel}/100</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">{analyticsData.recoveryRate}%</div>
              <div className="text-sm text-gray-400 mb-4">Recovery Rate</div>
              <div className="text-2xl font-bold text-blue-500">${analyticsData.costImpact.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Estimated Cost Impact</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <MetricCard title="Total Outages" value={analyticsData.totalOutages} icon={FileText} color="blue" />
        <MetricCard title="MTTR" value={`${analyticsData.mttr}h`} icon={Clock} color="orange" />
        <MetricCard title="MTBF" value={`${analyticsData.mtbf}h`} icon={Activity} color="green" />
        <MetricCard title="Availability" value={`${analyticsData.availability}%`} icon={Shield} color="purple" />
        <MetricCard title="SLA Compliance" value={`${analyticsData.slaCompliance}%`} icon={Activity} color="blue" />
        <MetricCard title="Critical Outages" value={analyticsData.criticalOutages} icon={AlertTriangle} color="red" />
        <MetricCard
          title="Users Affected"
          value={analyticsData.usersAffected.toLocaleString()}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Cost Impact"
          value={`$${analyticsData.costImpact.toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Escalation Rate"
          value={`${analyticsData.escalationRate}%`}
          icon={TrendingUp}
          color="red"
          trend="up"
        />
        <MetricCard
          title="Prevention Effectiveness"
          value={`${analyticsData.preventionEffectiveness}%`}
          icon={Shield}
          color="green"
        />
        <MetricCard
          title="Communication Score"
          value={`${analyticsData.communicationScore}/100`}
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard title="Automation Rate" value={`${analyticsData.automationRate}%`} icon={Settings} color="purple" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trends */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription className="text-gray-400">Outages, downtime, and user impact over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end justify-between gap-2">
              {monthlyTrends.map((data, index) => (
                <div key={data.month} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-green-500 w-full rounded-t"
                    style={{ height: `${(data.outages / 32) * 150}px` }}
                  ></div>
                  <span className="text-xs text-gray-400 mt-2">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Weekly Performance
            </CardTitle>
            <CardDescription className="text-gray-400">MTTR and availability trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center">
              <div className="w-full h-32 relative">
                {weeklyPerformance.map((data, index) => (
                  <div key={data.week} className="absolute" style={{ left: `${(index / 3) * 100}%` }}>
                    <div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      style={{ bottom: `${data.availability}%` }}
                    ></div>
                  </div>
                ))}
                <div className="absolute bottom-0 left-0 w-full h-px bg-gray-700"></div>
                <div className="absolute bottom-0 left-0 text-xs text-gray-400">Week 1</div>
                <div className="absolute bottom-0 right-0 text-xs text-gray-400">Week 4</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Duration Breakdown */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Duration Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {durationBreakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-300">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time of Day Analysis */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time of Day Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] flex items-end justify-center gap-4">
              {timeOfDayData.map((data) => (
                <div key={data.period} className="flex flex-col items-center">
                  <div className="bg-gray-600 w-12 rounded-t" style={{ height: `${(data.count / 12) * 100}px` }}></div>
                  <span className="text-xs text-gray-400 mt-2 text-center">{data.period.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day of Week Pattern */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Day of Week Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] flex items-end justify-between gap-1">
              {dayOfWeekData.map((data) => (
                <div key={data.day} className="flex flex-col items-center flex-1">
                  <div className="bg-gray-600 w-full rounded-t" style={{ height: `${(data.count / 3) * 100}px` }}></div>
                  <span className="text-xs text-gray-400 mt-2">{data.day.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
