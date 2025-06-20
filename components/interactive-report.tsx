"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Download,
  PieChart,
  BarChart3,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Activity,
  Shield,
  Target,
  Zap,
  Timer,
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RePieChart, Cell } from "recharts"

// 💡 static data (bundled with the client)
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
    severity: "all",
    environment: "all",
    outageType: "all",
    assignee: "all",
  })
  const [filteredData, setFilteredData] = useState<ReportData | null>(null)

  /* ------------------------------------------------------------------ */
  /*                       Data preparation helpers                     */
  /* ------------------------------------------------------------------ */
  const buildReport = () => {
    try {
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
      const totalDowntime = sum(outages, (o: any) => (+o.endDate - +o.startDate) / 36e5)
      const avgDowntime = outages.length ? totalDowntime / outages.length : 0
      const users = sum(outages, (o: any) => o.estimatedUsers || 0)

      const countBy = (arr: any[], cb: (o: any) => string | string[]) =>
        arr.reduce<Record<string, number>>((acc, o) => {
          const val = cb(o)
          if (Array.isArray(val)) {
            val.forEach((v) => (acc[v] = (acc[v] || 0) + 1))
          } else {
            acc[val] = (acc[val] || 0) + 1
          }
          return acc
        }, {})

      const data: ReportData = {
        summary: {
          totalOutages: outages.length,
          upcomingOutages: upcoming.length,
          pastOutages: past.length,
          ongoingOutages: ongoing.length,
          totalDowntime: Math.round(totalDowntime),
          averageDowntime: Math.round(avgDowntime * 10) / 10,
          totalUsersAffected: users,
        },
        breakdowns: {
          severity: countBy(outages, (o) => o.severity),
          type: countBy(outages, (o) => o.outageType ?? "Internal"),
          environment: countBy(outages, (o) => o.environments),
        },
        recentOutages: outages.slice(-10).reverse(),
        upcomingOutages: upcoming.slice(0, 10),
      }

      setReportData(data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to build report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(buildReport, [])

  /* ------------------------------------------------------------------ */
  /*                           Filtering logic                          */
  /* ------------------------------------------------------------------ */
  const applyFilters = (data: ReportData) => {
    let items = [...data.recentOutages, ...data.upcomingOutages]

    if (filters.severity !== "all") items = items.filter((o) => o.severity === filters.severity)
    if (filters.outageType !== "all") items = items.filter((o) => o.outageType === filters.outageType)
    if (filters.environment !== "all") items = items.filter((o) => o.environments.includes(filters.environment))
    if (filters.assignee !== "all") items = items.filter((o) => o.assignee === filters.assignee)

    const total = items.length
    const td = items.reduce((a, o) => a + (new Date(o.endDate).getTime() - new Date(o.startDate).getTime()) / 36e5, 0)
    const mttr = total ? td / total : 0
    const high = items.filter((o) => o.severity === "High").length
    const availability = total ? ((total - high) / total) * 100 : 100

    return {
      ...data,
      summary: {
        ...data.summary,
        totalOutages: total,
        totalDowntime: Math.round(td),
        averageDowntime: Math.round(mttr * 10) / 10,
        mttr: Math.round(mttr * 10) / 10,
        mtbf: total > 1 ? Math.round((720 / total) * 10) / 10 : 0,
        availability: Math.round(availability * 10) / 10,
        slaCompliance: Math.round(((total - high) / Math.max(total, 1)) * 100 * 10) / 10,
        incidentRate: Math.round((total / 30) * 10) / 10,
      },
      recentOutages: items.slice(-10).reverse(),
      upcomingOutages: items.filter((o) => new Date(o.startDate) > new Date()).slice(0, 10),
    }
  }

  useEffect(() => {
    if (reportData) setFilteredData(applyFilters(reportData))
  }, [filters, reportData])

  /* ------------------------------------------------------------------ */
  /*                          Export helpers                            */
  /* ------------------------------------------------------------------ */
  const exportText = () => {
    if (!reportData) return
    const data = filteredData || reportData
    const txt = `GCP Outages Report
Generated: ${new Date().toLocaleString()}

Total outages: ${data.summary.totalOutages}
MTTR: ${data.summary.mttr ?? data.summary.averageDowntime} h
Availability: ${data.summary.availability ?? 99.9} %

...` // truncated for brevity
    const blob = new Blob([txt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "gcp-outages-report.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ------------------------------------------------------------------ */
  /*                              Render                                */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="h-28 bg-muted animate-pulse rounded-md" />
          </Card>
        ))}
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error ?? "Failed to load report"}</p>
          <Button className="mt-4" onClick={buildReport}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const data = filteredData || reportData
  const sevPie = Object.entries(data.breakdowns.severity).map(([k, v]) => ({
    name: k,
    value: v,
    fill: COLORS[k as keyof typeof COLORS],
  }))
  const typeBar = Object.entries(data.breakdowns.type).map(([k, v]) => ({
    name: k,
    value: v,
    fill: COLORS[k as keyof typeof COLORS],
  }))
  const envBar = Object.entries(data.breakdowns.environment).map(([k, v]) => ({
    name: k,
    value: v,
    fill: COLORS[k as keyof typeof COLORS] ?? "#6b7280",
  }))

  return (
    <div className="space-y-6">
      {/* header & export */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">GCP Planned Outages Analytics</h2>
          <p className="text-muted-foreground">Generated {new Date().toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={exportText}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Outages */}
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.totalOutages}</div>
            <p className="text-sm text-muted-foreground">Total Outages</p>
          </CardContent>
        </Card>

        {/* MTTR */}
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.mttr ?? data.summary.averageDowntime}h</div>
            <p className="text-sm text-muted-foreground">MTTR</p>
          </CardContent>
        </Card>

        {/* MTBF */}
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.mtbf}</div>
            <p className="text-sm text-muted-foreground">MTBF</p>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.availability ?? 99.9}%</div>
            <p className="text-sm text-muted-foreground">Availability</p>
          </CardContent>
        </Card>

        {/* SLA */}
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.slaCompliance ?? 95}%</div>
            <p className="text-sm text-muted-foreground">SLA Compliance</p>
          </CardContent>
        </Card>

        {/* Incident rate */}
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{data.summary.incidentRate}</div>
            <p className="text-sm text-muted-foreground">Incidents/Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" /> Severity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <RePieChart data={sevPie} cx="50%" cy="50%" outerRadius={80}>
                    {sevPie.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </RePieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RePieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Internal vs External
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value">
                    {typeBar.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Environment impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Environment Impact
          </CardTitle>
          <CardDescription>Number of outages per environment</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={envBar}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value">
                  {envBar.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* upcoming list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Upcoming Outages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcomingOutages.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No upcoming outages.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingOutages.slice(0, 5).map((o) => (
                <div key={o.id} className="flex justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{o.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.startDate).toLocaleDateString()} — {o.assignee}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge
                      variant={
                        o.severity === "High" ? "destructive" : o.severity === "Medium" ? "secondary" : "default"
                      }
                    >
                      {o.severity}
                    </Badge>
                    <Badge variant="outline">{o.outageType}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
