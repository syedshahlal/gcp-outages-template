"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  Server,
  AlertTriangle,
  Plus,
  BarChart3,
  Filter,
  Search,
  RotateCcw,
  RefreshCw,
  CheckSquare,
  Square,
  Mail,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import dynamic from "next/dynamic"
import outagesJson from "@/data/outages.json"
import { useToast } from "@/hooks/use-toast"
import { EmailTestForm } from "./components/email-test-form"
import { InteractiveReport } from "./components/interactive-report"
import { OutageDetailModal } from "./components/outage-detail-modal"

// Dynamically imported heavy components
const UptimeMetrics = dynamic(() => import("./components/uptime-metrics").then((m) => ({ default: m.UptimeMetrics })), {
  ssr: false,
  loading: () => <div className="h-64 rounded-lg bg-muted animate-pulse" />,
})
const EnhancedOutageForm = dynamic(() => import("./components/enhanced-outage-form"), {
  ssr: false,
  loading: () => <div className="h-96 rounded-lg bg-muted animate-pulse" />,
})
const TabularMultiOutageForm = dynamic(
  () => import("./components/tabular-multi-outage-form").then((m) => ({ default: m.TabularMultiOutageForm })),
  { ssr: false, loading: () => <div className="h-96 rounded-lg bg-muted animate-pulse" /> },
)

/* -------------------------------------------------------------------------- */
/*                               Type Definitions                              */
/* -------------------------------------------------------------------------- */

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
  outageType?: "Internal" | "External"
  estimatedUsers?: number
  priority?: number
  category?: string
  contactEmail?: string
  createdAt?: Date
  updatedAt?: Date
}

const ENVIRONMENTS = ["POC", "SBX DEV", "SBX UAT", "SBX Beta", "PROD"] as const
const environmentColors: Record<(typeof ENVIRONMENTS)[number], string> = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  "SBX Beta": "bg-orange-500",
  PROD: "bg-red-500",
}
const severityCss: Record<OutageData["severity"], string> = {
  High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  Medium:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
}

const typeCss: Record<"Internal" | "External", string> = {
  Internal:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  External: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
}

/* ---------------------------- Helper Functions ---------------------------- */

const monthOptions = (() => {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 6; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    })
  }
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    })
  }
  return opts
})()

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const diffLabel = (start: Date, end: Date) => {
  const hours = Math.floor((end.getTime() - start.getTime()) / 3.6e6)
  const days = Math.floor(hours / 24)
  return days ? `${days} d ${hours % 24} h` : `${hours} h`
}

/* -------------------------------------------------------------------------- */
/*                            Main Dashboard Component                         */
/* -------------------------------------------------------------------------- */

export default function OutageDashboard() {
  const { toast } = useToast()

  /* ----------------------------- Local State ----------------------------- */

  const [outages, setOutages] = useState<OutageData[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [envFilter, setEnvFilter] = useState<string[]>([...ENVIRONMENTS])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "severity" | "team">("date")
  const [view, setView] = useState<"timeline" | "list">("timeline")

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [mobile, setMobile] = useState(false)

  const [expanded, setExpanded] = useState({ gantt: true, day: true })
  const [hover, setHover] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ o: OutageData; x: number; y: number; v: boolean } | null>(null)
  const [detail, setDetail] = useState<OutageData | null>(null)

  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })
  const [useCustomRange, setUseCustomRange] = useState(false)

  /* ---------------------------- Side Effects ---------------------------- */

  useEffect(() => {
    setMounted(true)
    const onResize = () => setMobile(window.innerWidth < 640)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Load data from bundled JSON (no server round-trip, no fs)
  const loadOutages = () => {
    try {
      const parsed = outagesJson.map((o) => ({
        ...o,
        startDate: new Date(o.startDate),
        endDate: new Date(o.endDate),
      })) as OutageData[]
      parsed.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      setOutages(parsed)
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to load outages", variant: "destructive" })
    }
  }

  useEffect(loadOutages, [])

  /* ------------------------------- Derived ------------------------------ */

  const generateFilteredReport = () => {
    const reportData = {
      filters: {
        month: selectedMonth,
        environments: envFilter,
        search,
        sortBy,
      },
      outages: filters,
      summary: {
        total: filters.length,
        high: filters.filter((o) => o.severity === "High").length,
        medium: filters.filter((o) => o.severity === "Medium").length,
        low: filters.filter((o) => o.severity === "Low").length,
        internal: filters.filter((o) => o.outageType === "Internal").length,
        external: filters.filter((o) => o.outageType === "External").length,
        totalHours: filters.reduce(
          (acc, o) => acc + Math.round((o.endDate.getTime() - o.startDate.getTime()) / 3.6e6),
          0,
        ),
        totalUsers: filters.reduce((a, o) => a + (o.estimatedUsers || 0), 0),
      },
    }

    const reportContent = `
  GCP Planned Outages - Filtered Report
  Generated: ${new Date().toLocaleString()}
  Filters Applied: Month=${monthOptions.find((m) => m.value === selectedMonth)?.label}, Environments=${envFilter.join(", ")}, Search="${search}"
  
  SUMMARY
  =======
  Total Outages: ${reportData.summary.total}
  High Severity: ${reportData.summary.high}
  Medium Severity: ${reportData.summary.medium}
  Low Severity: ${reportData.summary.low}
  Internal Type: ${reportData.summary.internal}
  External Type: ${reportData.summary.external}
  Total Downtime: ${reportData.summary.totalHours} hours
  Total Users Affected: ${reportData.summary.totalUsers}
  
  DETAILED OUTAGES
  ================
  ${filters
    .map(
      (o) => `
  ${o.title} (#${o.id})
  - Start: ${fmt(o.startDate)}
  - End: ${fmt(o.endDate)}
  - Duration: ${diffLabel(o.startDate, o.endDate)}
  - Severity: ${o.severity}
  - Type: ${o.outageType || "Internal"}
  - Team: ${o.assignee}
  - Environments: ${o.environments.join(", ")}
  - Users Affected: ${o.estimatedUsers || 0}
  `,
    )
    .join("\n")}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gcp-outages-filtered-report-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Report Generated",
      description: "Filtered report has been downloaded successfully",
    })
  }

  // Get default two-week range from most recent outages
  const getDefaultTwoWeekRange = () => {
    if (!outages.length) {
      const now = new Date()
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      return { start: now, end: twoWeeksLater }
    }

    const now = new Date()
    const upcomingOutages = outages.filter((o) => o.startDate >= now)
    const ongoingOutages = outages.filter((o) => o.startDate <= now && o.endDate >= now)

    let referenceDate = now

    if (upcomingOutages.length > 0) {
      // Use the earliest upcoming outage as reference
      referenceDate = upcomingOutages[0].startDate
    } else if (ongoingOutages.length > 0) {
      // Use ongoing outages
      referenceDate = ongoingOutages[0].startDate
    }

    const start = new Date(referenceDate.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days before
    const end = new Date(referenceDate.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days after

    return { start, end }
  }

  const filters = outages.filter((o) => {
    let dateMatch = true

    if (useCustomRange && customDateRange.start && customDateRange.end) {
      const outageStart = o.startDate.toISOString().split("T")[0]
      dateMatch = outageStart >= customDateRange.start && outageStart <= customDateRange.end
    } else {
      dateMatch = o.startDate.toISOString().startsWith(selectedMonth)
    }

    const envMatch = o.environments.some((e) => envFilter.includes(e))
    const txt = (o.title + o.assignee + (o.category ?? "")).toLowerCase()
    const searchMatch = txt.includes(search.toLowerCase())
    return dateMatch && envMatch && searchMatch
  })

  filters.sort((a, b) => {
    if (sortBy === "severity")
      return { High: 3, Medium: 2, Low: 1 }[b.severity] - { High: 3, Medium: 2, Low: 1 }[a.severity]
    if (sortBy === "team") return a.assignee.localeCompare(b.assignee)
    return a.startDate.getTime() - b.startDate.getTime()
  })

  const range = useMemo(() => {
    if (!filters.length) {
      return getDefaultTwoWeekRange()
    }

    if (useCustomRange && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start)
      const end = new Date(customDateRange.end)
      return { start, end, days: Math.ceil((end.getTime() - start.getTime()) / 864e5) }
    }

    const s = Math.min(...filters.map((o) => o.startDate.getTime()))
    const e = Math.max(...filters.map((o) => o.endDate.getTime()))
    const start = new Date(s),
      end = new Date(e)
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() + 1)
    return { start, end, days: Math.ceil((end.getTime() - start.getTime()) / 864e5) }
  }, [filters, useCustomRange, customDateRange, outages])

  const ganttPos = (s: Date, e: Date) => {
    const pct = (v: number) => (v / (range.end.getTime() - range.start.getTime())) * 100
    return {
      left: `${pct(s.getTime() - range.start.getTime())}%`,
      width: `${Math.max(2, pct(e.getTime() - s.getTime()))}%`,
    }
  }

  /* ----------------------------- Render UI ------------------------------ */

  if (!mounted)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )

  const allSelected = ENVIRONMENTS.every((e) => envFilter.includes(e))
  const someSelected = envFilter.length && envFilter.length < ENVIRONMENTS.length

  const Tooltip = () =>
    tooltip?.v ? (
      <div
        className="fixed z-50 max-w-xs p-3 rounded-lg shadow-lg pointer-events-none bg-black text-white dark:bg-white dark:text-black"
        style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
      >
        <div className="font-semibold">{tooltip.o.title}</div>
        <div className="text-sm opacity-90">
          {fmt(tooltip.o.startDate)} → {fmt(tooltip.o.endDate)}
        </div>
        <div className="text-sm opacity-90">Duration: {diffLabel(tooltip.o.startDate, tooltip.o.endDate)}</div>
        <div className="text-sm opacity-90">Team: {tooltip.o.assignee}</div>
        {tooltip.o.outageType && <div className="text-sm opacity-90">Type: {tooltip.o.outageType}</div>}
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* ------------------------------ Header ------------------------------ */}
        <header className="space-y-2 text-center">
          <div className="flex justify-center items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">GCP Planned Outages Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadOutages()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
              <ThemeToggle />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Last updated: {lastUpdated.toLocaleString()} • Auto-refresh 30 s
          </p>
        </header>

        {/* ------------------------------- Tabs ------------------------------- */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Plus className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="h-4 w-4" />
              Report
            </TabsTrigger>
            <TabsTrigger value="email-test">
              <Mail className="h-4 w-4" />
              Email Test
            </TabsTrigger>
          </TabsList>

          {/* ------------------------ DASHBOARD CONTENT ----------------------- */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* ---- High-severity alerts ---- */}
            <div className="space-y-2">
              {filters
                .filter((o) => o.severity === "High")
                .slice(0, 3)
                .map((o) => (
                  <Alert key={o.id} className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300 text-sm">
                      <strong>HIGH IMPACT:</strong> {o.title} on {fmt(o.startDate)} – {fmt(o.endDate)}
                      {o.outageType && <span> ({o.outageType})</span>}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>

            {/* ---- Stats ---- */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {filters.filter((o) => o.severity === "High").length}
                  </div>
                  <p className="text-sm">High</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filters.filter((o) => o.severity === "Medium").length}
                  </div>
                  <p className="text-sm">Medium</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {filters.filter((o) => o.severity === "Low").length}
                  </div>
                  <p className="text-sm">Low</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {filters.filter((o) => o.outageType === "Internal").length}
                  </div>
                  <p className="text-sm">Internal</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {filters.filter((o) => o.outageType === "External").length}
                  </div>
                  <p className="text-sm">External</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center p-3">
                  <div className="text-2xl font-bold text-orange-600">
                    {filters.reduce((a, o) => a + (o.estimatedUsers || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-sm">Users</p>
                </CardContent>
              </Card>
            </div>

            {/* ---- Filters card ---- */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                  {(envFilter.length < ENVIRONMENTS.length || search || sortBy !== "date") && (
                    <Badge variant="secondary" className="ml-2">
                      {filters.length} filtered
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search-sort row */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                        placeholder="Title, team, category…"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="severity">Severity</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Month</Label>
                    <Select
                      value={selectedMonth}
                      onValueChange={(val) => {
                        setSelectedMonth(val)
                        setUseCustomRange(false)
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <Checkbox
                      id="custom-range"
                      checked={useCustomRange}
                      onCheckedChange={setUseCustomRange}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="custom-range" className="cursor-pointer font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Use Custom Date Range (Override Month Filter)
                    </Label>
                  </div>
                  {useCustomRange && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-background border border-border rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Start Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Environment checkboxes */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Environments</Label>
                  <div className="space-y-3">
                    {/* Select All toggle */}
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                      <div className="relative">
                        <Checkbox
                          id="all"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected
                          }}
                          onCheckedChange={(c) => setEnvFilter(c ? [...ENVIRONMENTS] : [])}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                      <Label htmlFor="all" className="cursor-pointer flex items-center gap-2 font-medium">
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                        Select All Environments
                      </Label>
                    </div>

                    {/* Individual environment toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ENVIRONMENTS.map((env) => (
                        <div
                          key={env}
                          className="flex items-center space-x-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={env}
                            checked={envFilter.includes(env)}
                            onCheckedChange={(c) => {
                              setEnvFilter(c ? [...envFilter, env] : envFilter.filter((e) => e !== env))
                            }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor={env} className="cursor-pointer flex items-center gap-2 flex-1">
                            <div
                              className={`w-3 h-3 rounded-full ${environmentColors[env as keyof typeof environmentColors]}`}
                            />
                            <span className="font-medium">{env}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* View toggles / reset / Generate Report */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">View</Label>
                    <div className="relative inline-flex bg-muted rounded-lg p-1">
                      <button
                        className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                          view === "timeline"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView("timeline")}
                      >
                        <Calendar className="h-4 w-4 mr-2 inline" />
                        Timeline
                      </button>
                      <button
                        className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                          view === "list"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView("list")}
                      >
                        <Server className="h-4 w-4 mr-2 inline" />
                        List
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Show Generate Report button only when filters are applied */}
                    {(envFilter.length < ENVIRONMENTS.length || search || sortBy !== "date" || useCustomRange) && (
                      <Button size="sm" variant="default" onClick={generateFilteredReport}>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEnvFilter([...ENVIRONMENTS])
                        setSearch("")
                        setSortBy("date")
                        setUseCustomRange(false)
                        setCustomDateRange({ start: "", end: "" })
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ---- Timeline / List ---- */}
            {view === "timeline" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline (Sorted by Outage Time)
                  </CardTitle>
                  <CardDescription>
                    {range.start.toLocaleDateString()} – {range.end.toLocaleDateString()}
                    {!useCustomRange && !filters.length && " (Default 2-week view from upcoming outages)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Enhanced timeline header with dates */}
                  <div className="hidden sm:block mb-4">
                    <div className="flex">
                      <div className="w-96 pr-4 flex items-center justify-center">
                        <h3 className="text-lg font-semibold text-center">Planned Outages</h3>
                      </div>
                      <div className="flex-1 relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                        {/* Month headers */}
                        <div className="h-8 flex border-b border-gray-300 dark:border-gray-600">
                          {(() => {
                            const months: { [key: string]: { start: number; width: number; name: string } } = {}
                            const totalDays = Math.min(range.days || 14, 31)

                            // Calculate month spans
                            for (let i = 0; i < totalDays; i++) {
                              const currentDate = new Date(range.start)
                              currentDate.setDate(currentDate.getDate() + i)
                              const monthKey = currentDate.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })

                              if (!months[monthKey]) {
                                months[monthKey] = { start: i, width: 1, name: monthKey }
                              } else {
                                months[monthKey].width++
                              }
                            }

                            return Object.entries(months).map(([monthKey, data]) => (
                              <div
                                key={monthKey}
                                className="flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 last:border-r-0"
                                style={{
                                  width: `${(data.width / totalDays) * 100}%`,
                                  minWidth: "60px",
                                }}
                              >
                                {data.name}
                              </div>
                            ))
                          })()}
                        </div>

                        {/* Days grid */}
                        <div className="h-12 flex">
                          {Array.from({ length: Math.min(range.days || 14, 31) }, (_, i) => {
                            const currentDate = new Date(range.start)
                            currentDate.setDate(currentDate.getDate() + i)
                            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
                            const isToday = currentDate.toDateString() === new Date().toDateString()

                            return (
                              <div
                                key={i}
                                className={`flex-1 flex flex-col items-center justify-center text-xs font-medium border-r border-gray-300 dark:border-gray-600 last:border-r-0 min-w-0 py-1 ${
                                  isWeekend ? "bg-gray-200 dark:bg-gray-700" : ""
                                } ${isToday ? "bg-blue-100 dark:bg-blue-900" : ""}`}
                              >
                                <div
                                  className={`${isWeekend ? "text-red-600 dark:text-red-400" : ""} ${isToday ? "font-bold text-blue-600 dark:text-blue-400" : ""}`}
                                >
                                  {currentDate.getDate()}
                                </div>
                                <div className="text-gray-400 dark:text-gray-500 text-xs">
                                  {currentDate.toLocaleDateString("en-US", { weekday: "short" })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* outage rows */}
                  {loading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-14 rounded bg-muted animate-pulse mb-2" />)
                  ) : !filters.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No outages match your filters</p>
                      <p className="text-sm mt-2">Showing default 2-week timeline view</p>
                    </div>
                  ) : (
                    filters.map((o) => (
                      <div key={o.id} className="flex items-start gap-2 mb-2 hover:bg-muted/50 rounded p-2">
                        {/* info cell */}
                        <div className="w-full sm:w-96">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">{o.title}</h4>
                            <div className="flex gap-1">
                              <Badge className={severityCss[o.severity]}>{o.severity}</Badge>
                              {o.outageType && <Badge className={typeCss[o.outageType]}>{o.outageType}</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.environments.map((e) => (
                              <Badge
                                key={e}
                                className={`text-xs ${environmentColors[e as keyof typeof environmentColors]} text-white`}
                              >
                                {e}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {fmt(o.startDate)} → {fmt(o.endDate)}
                          </div>
                        </div>

                        {/* bar cell */}
                        <div className="flex-1 hidden sm:block relative h-14 bg-muted rounded overflow-hidden">
                          <div
                            className={`absolute top-2 h-10 rounded flex items-center px-3 text-white text-xs font-medium cursor-pointer shadow-lg transition-transform hover:scale-105
                              ${
                                o.severity === "High"
                                  ? "bg-gradient-to-r from-red-500 to-red-600"
                                  : o.severity === "Medium"
                                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                                    : "bg-gradient-to-r from-green-500 to-green-600"
                              }`}
                            style={ganttPos(o.startDate, o.endDate)}
                            onClick={() => setDetail(o)}
                            onMouseEnter={(e) => {
                              setHover(o.id)
                              setTooltip({ o, x: e.clientX, y: e.clientY, v: true })
                            }}
                            onMouseLeave={() => {
                              setHover(null)
                              setTooltip(null)
                            }}
                            onMouseMove={(e) => tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })}
                          >
                            {diffLabel(o.startDate, o.endDate)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Server className="h-5 w-5" />
                    List (Sorted by Outage Time)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded bg-muted animate-pulse mb-4" />)
                  ) : !filters.length ? (
                    <div className="text-center py-8 text-muted-foreground">No outages match your filters</div>
                  ) : (
                    filters.map((o) => (
                      <div
                        key={o.id}
                        className="p-4 border rounded mb-4 cursor-pointer hover:shadow"
                        onClick={() => setDetail(o)}
                      >
                        <div className="flex justify-between mb-1">
                          <h4 className="font-semibold">{o.title}</h4>
                          <div className="flex gap-1">
                            <Badge>#{o.id}</Badge>
                            {o.outageType && <Badge className={typeCss[o.outageType]}>{o.outageType}</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fmt(o.startDate)} → {fmt(o.endDate)} • {diffLabel(o.startDate, o.endDate)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* -------------------- SCHEDULE OOT (single / multi) -------------------- */}
          <TabsContent value="schedule" className="space-y-6">
            <Tabs defaultValue="single">
              <TabsList>
                <TabsTrigger value="single">Single</TabsTrigger>
                <TabsTrigger value="multiple">Multiple</TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="mt-6">
                <EnhancedOutageForm onSuccess={loadOutages} />
              </TabsContent>
              <TabsContent value="multiple" className="mt-6">
                <TabularMultiOutageForm onSuccess={loadOutages} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* --------------------------- METRICS TAB --------------------------- */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <BarChart3 className="h-5 w-5" />
                  Uptime Metrics
                </CardTitle>
              </CardHeader>
            </Card>
            <UptimeMetrics />
          </TabsContent>

          {/* --------------------------- REPORT TAB ---------------------------- */}
          <TabsContent value="report" className="space-y-6">
            <InteractiveReport />
          </TabsContent>

          {/* --------------------------- EMAIL TEST TAB ------------------------ */}
          <TabsContent value="email-test" className="space-y-6">
            <EmailTestForm />
          </TabsContent>
        </Tabs>

        {/* floating tooltip & detailed modal */}
        <Tooltip />
        <OutageDetailModal outage={detail} isOpen={!!detail} onClose={() => setDetail(null)} />
      </div>
    </div>
  )
}
