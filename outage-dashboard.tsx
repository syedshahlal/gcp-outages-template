"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
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
  FileText,
  Globe,
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
import { TimezoneSelector } from "@/components/timezone-selector"
import dynamic from "next/dynamic"
import { useToast } from "@/hooks/use-toast"
import { InteractiveReport } from "./components/interactive-report"
import { OutageDetailModal } from "./components/outage-detail-modal"
import { getUserTimezone, formatTimelineDate, getTimezoneAbbreviation, formatDetailedDate } from "@/lib/timezone-utils"

// Import JSON data statically to avoid SSR issues
import outagesJson from "@/data/outages.json"

// Dynamically imported heavy components with no SSR
// EnhancedOutageForm  (uses default OR named export)
const EnhancedOutageForm = dynamic(
  () =>
    import("./components/enhanced-outage-form").then(
      (mod) => (mod.EnhancedOutageForm ?? mod.default) as React.ComponentType<any>,
    ),
  { ssr: false, loading: () => <div className="h-96 rounded-lg bg-muted animate-pulse" /> },
)

// TabularMultiOutageForm
const TabularMultiOutageForm = dynamic(
  () =>
    import("./components/tabular-multi-outage-form").then(
      (mod) => (mod.TabularMultiOutageForm ?? mod.default) as React.ComponentType<any>,
    ),
  { ssr: false, loading: () => <div className="h-96 rounded-lg bg-muted animate-pulse" /> },
)

/* -------------------------------------------------------------------------- */
/*                               Type Definitions                              */
/* -------------------------------------------------------------------------- */

interface OutageData {
  id: number | string
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
  outageType?: "Internal" | "External"
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

const getMonthOptions = () => {
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
}

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

// Add these helper functions after the existing helper functions
const applyQuickFilter = (
  filterType: string,
  setEnvFilter: React.Dispatch<React.SetStateAction<string[]>>,
  setSearch: React.Dispatch<React.SetStateAction<string>>,
  setSortBy: React.Dispatch<React.SetStateAction<"date" | "severity" | "team">>,
  setUseCustomRange: React.Dispatch<React.SetStateAction<boolean>>,
  setCustomDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>,
  setSeverityFilter: React.Dispatch<React.SetStateAction<string[]>>,
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>,
  toast: (opts: { title: string; description?: string }) => void,
) => {
  const now = new Date()

  switch (filterType) {
    case "high-severity":
      setSeverityFilter(["High"])
      toast({ title: "Filtered by High Severity", description: "Showing only high severity outages" })
      break
    case "scheduled":
      setCustomDateRange({
        start: now.toISOString().split("T")[0],
        end: new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString().split("T")[0],
      })
      setUseCustomRange(true)
      toast({ title: "Filtered by Scheduled", description: "Showing scheduled outages from today onwards" })
      break
    case "upcoming":
      setCustomDateRange({
        start: now.toISOString().split("T")[0],
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      })
      setUseCustomRange(true)
      toast({ title: "Filtered by Upcoming", description: "Showing outages in the next 7 days" })
      break
    case "this-month":
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
      setUseCustomRange(false)
      toast({ title: "Filtered by This Month", description: "Showing outages for current month" })
      break
    case "total":
    default:
      setEnvFilter([...ENVIRONMENTS])
      setSearch("")
      setSortBy("date")
      setUseCustomRange(false)
      setCustomDateRange({ start: "", end: "" })
      setSeverityFilter([])
      toast({ title: "Showing All Outages", description: "All filters have been reset" })
      break
  }
}

/* -------------------------------------------------------------------------- */
/*                            Main Dashboard Component                         */
/* -------------------------------------------------------------------------- */

export default function OutageDashboard() {
  const { toast } = useToast()

  /* ----------------------------- Local State ----------------------------- */

  const [outages, setOutages] = useState<OutageData[]>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [envFilter, setEnvFilter] = useState<string[]>([...ENVIRONMENTS])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "severity" | "team">("date")
  const [view, setView] = useState<"timeline" | "list">("timeline")

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [mobile, setMobile] = useState(false)
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([])

  const [expanded, setExpanded] = useState({ gantt: true, day: true })
  const [hover, setHover] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ o: OutageData; x: number; y: number; v: boolean } | null>(null)
  const [detail, setDetail] = useState<OutageData | null>(null)

  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  })
  const [useCustomRange, setUseCustomRange] = useState(false)

  // Add severity filter state
  const [severityFilter, setSeverityFilter] = useState<string[]>([])

  // Add timezone state
  const [selectedTimezone, setSelectedTimezone] = useState<string>("")

  /* ---------------------------- Side Effects ---------------------------- */

  useEffect(() => {
    setMounted(true)

    // Initialize timezone
    setSelectedTimezone(getUserTimezone())

    // Initialize month options and selected month
    const options = getMonthOptions()
    setMonthOptions(options)

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    setSelectedMonth(currentMonth)

    // Set up resize listener
    const onResize = () => setMobile(window.innerWidth < 640)
    onResize()
    window.addEventListener("resize", onResize)

    return () => window.removeEventListener("resize", onResize)
  }, [])

  const fetchOutages = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      setRefreshing(isRefresh)

      console.log("Fetching outages...")

      // Give the UI a tiny delay for nicer spinners
      await new Promise((r) => setTimeout(r, 300))

      /* ----------------------------------------------------------
       * 1) Try the API route first (only works in prod / dev-server)
       * 2) If that fails (e.g. Next.js preview) fall back to the
       *    embedded JSON so the page still renders.
       * ---------------------------------------------------------- */
      let data: any[] | null = null

      try {
        const base =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/outages`
            : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/outages`

        console.log("Fetching from API:", base)
        const resp = await fetch(base, { cache: "no-store" })
        console.log("API response status:", resp.status)

        if (resp.ok) {
          const json = await resp.json()
          console.log("API response data:", json)
          // The API can return either an array or an object { outages: [...] }
          data = Array.isArray(json) ? json : (json?.outages ?? [])
        } else {
          console.warn("API responded but not OK:", resp.status)
        }
      } catch (apiError) {
        console.warn("API fetch failed:", apiError)
        /* network / runtime error - ignore – we'll fall back */
      }

      if (!data || data.length === 0) {
        console.info("Using bundled outages.json fallback (preview/runtime without API)")
        data = Array.isArray(outagesJson) ? outagesJson : (outagesJson?.outages ?? [])
      }

      console.log("Raw data before processing:", data)

      const parsed = data.map((o: any) => ({
        ...o,
        id: o.id || Math.random().toString(36).substr(2, 9), // Ensure ID exists
        startDate: new Date(o.startDate),
        endDate: new Date(o.endDate),
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
        outageType: o.outageType || "Internal",
        environments: Array.isArray(o.environments) ? o.environments : [],
        detailedImpact: Array.isArray(o.detailedImpact) ? o.detailedImpact : [],
      })) as OutageData[]

      console.log("Parsed outages:", parsed)
      console.log("Outages count:", parsed.length)

      parsed.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      setOutages(parsed)
      setLastUpdated(new Date())

      console.log("Outages set in state, count:", parsed.length)
    } catch (err) {
      console.error("Fatal error loading outages:", err)
      toast({
        title: "Failed to load outages",
        description: "Please try again later.",
        variant: "destructive",
      })
      setOutages([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      console.log("Component mounted, fetching outages...")
      fetchOutages()
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || outages.length === 0) return

    console.log("Setting up auto-refresh interval")
    const id = setInterval(() => {
      console.log("Auto-refreshing outages...")
      fetchOutages(true)
    }, 30000)

    return () => {
      console.log("Clearing auto-refresh interval")
      clearInterval(id)
    }
  }, [mounted, outages.length])

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
  Timezone: ${selectedTimezone} (${getTimezoneAbbreviation(selectedTimezone)})
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
  - Start: ${formatDetailedDate(o.startDate, selectedTimezone)}
  - End: ${formatDetailedDate(o.endDate, selectedTimezone)}
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

  const filters = useMemo(() => {
    console.log("Applying filters...")
    console.log("Total outages before filtering:", outages.length)
    console.log("Selected month:", selectedMonth)
    console.log("Environment filter:", envFilter)
    console.log("Search term:", search)
    console.log("Use custom range:", useCustomRange)
    console.log("Custom date range:", customDateRange)

    const filtered = outages.filter((o) => {
      let dateMatch = true

      if (useCustomRange && customDateRange.start && customDateRange.end) {
        const outageStart = o.startDate.toISOString().split("T")[0]
        const outageEnd = o.endDate.toISOString().split("T")[0]
        dateMatch =
          (outageStart >= customDateRange.start && outageStart <= customDateRange.end) ||
          (outageEnd >= customDateRange.start && outageEnd <= customDateRange.end) ||
          (outageStart <= customDateRange.start && outageEnd >= customDateRange.end)
        console.log(
          `Custom range filter for ${o.title}: ${dateMatch} (${outageStart}-${outageEnd} overlaps ${customDateRange.start}-${customDateRange.end})`,
        )
      } else if (selectedMonth) {
        const outageMonth = o.startDate.toISOString().substring(0, 7) // YYYY-MM format
        dateMatch = outageMonth === selectedMonth
        console.log(`Month filter for ${o.title}: ${dateMatch} (${outageMonth} === ${selectedMonth})`)
      }

      const envMatch = o.environments.length === 0 || o.environments.some((e) => envFilter.includes(e))
      console.log(`Environment filter for ${o.title}: ${envMatch} (${o.environments} intersects ${envFilter})`)

      const txt = (o.title + o.assignee + (o.category ?? "")).toLowerCase()
      const searchMatch = search === "" || txt.includes(search.toLowerCase())
      console.log(`Search filter for ${o.title}: ${searchMatch}`)

      // Update the filters logic to include severity
      const severityMatch = severityFilter.length === 0 || severityFilter.includes(o.severity)

      const finalMatch = dateMatch && envMatch && searchMatch && severityMatch
      console.log(`Final match for ${o.title}: ${finalMatch}`)

      return finalMatch
    })

    console.log("Filtered outages count:", filtered.length)
    console.log(
      "Filtered outages:",
      filtered.map((o) => ({ title: o.title, start: o.startDate.toISOString().substring(0, 7) })),
    )
    return filtered
  }, [outages, selectedMonth, envFilter, search, useCustomRange, customDateRange, severityFilter])

  useEffect(() => {
    console.log("Filters changed, filtered count:", filters.length)
  }, [filters])

  filters.sort((a, b) => {
    if (sortBy === "severity")
      return { High: 3, Medium: 2, Low: 1 }[b.severity] - { High: 3, Medium: 2, Low: 1 }[a.severity]
    if (sortBy === "team") return a.assignee.localeCompare(b.assignee)
    return a.startDate.getTime() - b.startDate.getTime()
  })

  const range = useMemo(() => {
    console.log("Calculating range for", filters.length, "filtered outages")

    if (!filters.length) {
      const defaultRange = getDefaultTwoWeekRange()
      console.log("Using default range:", defaultRange)
      return defaultRange
    }

    if (useCustomRange && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start)
      const end = new Date(customDateRange.end)
      const days = Math.ceil((end.getTime() - start.getTime()) / 864e5)
      console.log("Using custom range:", { start, end, days })
      return { start, end, days }
    }

    const s = Math.min(...filters.map((o) => o.startDate.getTime()))
    const e = Math.max(...filters.map((o) => o.endDate.getTime()))
    const start = new Date(s)
    const end = new Date(e)
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() + 1)
    const days = Math.ceil((end.getTime() - start.getTime()) / 864e5)

    console.log("Calculated range from filtered data:", { start, end, days })
    return { start, end, days }
  }, [filters, useCustomRange, customDateRange])

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
          {formatTimelineDate(tooltip.o.startDate, selectedTimezone)} →{" "}
          {formatTimelineDate(tooltip.o.endDate, selectedTimezone)}
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
              <Button variant="outline" size="sm" onClick={() => fetchOutages(true)} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
              <ThemeToggle />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>
                Timezone: {selectedTimezone.replace("_", " ")} ({getTimezoneAbbreviation(selectedTimezone)})
              </span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>Last updated: {lastUpdated?.toLocaleString() || "Never"}</span>
            <span className="hidden sm:inline">•</span>
            <span>Auto-refresh 30s</span>
          </div>
        </header>

        {/* ------------------------------- Tabs ------------------------------- */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Plus className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <FileText className="h-4 w-4" />
              Metrics
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
                      <strong>HIGH IMPACT:</strong> {o.title} on {formatTimelineDate(o.startDate, selectedTimezone)} –{" "}
                      {formatTimelineDate(o.endDate, selectedTimezone)}
                      {o.outageType && <span> ({o.outageType})</span>}
                    </AlertDescription>
                  </Alert>
                ))}
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
                {/* Timezone Selector */}
                <div className="border-b pb-4">
                  <TimezoneSelector
                    value={selectedTimezone}
                    onValueChange={setSelectedTimezone}
                    label="Display Timezone"
                    showCurrentTime={true}
                  />
                </div>

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
                        console.log("Month filter changed to:", val)
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
                      onCheckedChange={(checked) => {
                        console.log("Custom range toggled:", checked)
                        setUseCustomRange(checked as boolean)
                      }}
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
                          onChange={(e) => {
                            console.log("Custom start date changed:", e.target.value)
                            setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">End Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => {
                            console.log("Custom end date changed:", e.target.value)
                            setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))
                          }}
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
                        setSeverityFilter([])
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ---- Clickable Stats (moved below filters) ---- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-500"
                onClick={() =>
                  applyQuickFilter(
                    "total",
                    setEnvFilter,
                    setSearch,
                    setSortBy,
                    setUseCustomRange,
                    setCustomDateRange,
                    setSeverityFilter,
                    setSelectedMonth,
                    toast,
                  )
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Outages</p>
                    <div className="text-2xl font-bold">{filters.length}</div>
                    <p className="text-xs text-blue-600 font-medium">Click to show all</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-red-500"
                onClick={() =>
                  applyQuickFilter(
                    "high-severity",
                    setEnvFilter,
                    setSearch,
                    setSortBy,
                    setUseCustomRange,
                    setCustomDateRange,
                    setSeverityFilter,
                    setSelectedMonth,
                    toast,
                  )
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">High Severity</p>
                    <div className="text-2xl font-bold text-red-600">
                      {filters.filter((o) => o.severity === "High").length}
                    </div>
                    <p className="text-xs text-red-600 font-medium">Click to filter</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-500"
                onClick={() =>
                  applyQuickFilter(
                    "scheduled",
                    setEnvFilter,
                    setSearch,
                    setSortBy,
                    setUseCustomRange,
                    setCustomDateRange,
                    setSeverityFilter,
                    setSelectedMonth,
                    toast,
                  )
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        filters.filter((o) => {
                          const now = new Date()
                          return o.startDate > now
                        }).length
                      }
                    </div>
                    <p className="text-xs text-blue-600 font-medium">Click to filter</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-orange-500"
                onClick={() =>
                  applyQuickFilter(
                    "upcoming",
                    setEnvFilter,
                    setSearch,
                    setSortBy,
                    setUseCustomRange,
                    setCustomDateRange,
                    setSeverityFilter,
                    setSelectedMonth,
                    toast,
                  )
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                    <div className="text-2xl font-bold text-orange-600">
                      {
                        filters.filter((o) => {
                          const now = new Date()
                          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                          return o.startDate >= now && o.startDate <= nextWeek
                        }).length
                      }
                    </div>
                    <p className="text-xs text-orange-600 font-medium">Click to filter</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-500"
                onClick={() =>
                  applyQuickFilter(
                    "this-month",
                    setEnvFilter,
                    setSearch,
                    setSortBy,
                    setUseCustomRange,
                    setCustomDateRange,
                    setSeverityFilter,
                    setSelectedMonth,
                    toast,
                  )
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        filters.filter((o) => {
                          const now = new Date()
                          const currentMonth = now.getMonth()
                          const currentYear = now.getFullYear()
                          return o.startDate.getMonth() === currentMonth && o.startDate.getFullYear() === currentYear
                        }).length
                      }
                    </div>
                    <p className="text-xs text-green-600 font-medium">Click to filter</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-500" />
                </CardContent>
              </Card>
            </div>

            {/* ---- Timeline / List ---- */}
            {view === "timeline" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline (Sorted by Outage Time)
                  </CardTitle>
                  <CardDescription>
                    {formatTimelineDate(range.start, selectedTimezone)} –{" "}
                    {formatTimelineDate(range.end, selectedTimezone)}
                    {!useCustomRange && !filters.length && " (Default 2-week view from upcoming outages)"}
                    <span className="ml-2 text-sm">
                      Showing {filters.length} of {outages.length} outages
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {getTimezoneAbbreviation(selectedTimezone)}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Enhanced timeline with horizontal scroll */}
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Timeline header */}
                      <div className="flex mb-4">
                        <div className="w-80 pr-4 flex items-center justify-center shrink-0">
                          <h3 className="text-lg font-semibold text-center">Planned Outages</h3>
                        </div>
                        <div className="flex-1 relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden min-w-[500px]">
                          {/* Calculate proper time scale */}
                          {(() => {
                            const totalHours = Math.ceil(
                              (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60),
                            )
                            const minWidth = Math.max(800, totalHours * 4) // 4px per hour minimum

                            return (
                              <>
                                {/* Time scale header */}
                                <div className="h-16 border-b border-gray-300 dark:border-gray-600">
                                  {/* Days row */}
                                  <div className="h-8 flex border-b border-gray-300 dark:border-gray-600">
                                    {(() => {
                                      const days = Math.ceil(totalHours / 24)
                                      return Array.from({ length: days }, (_, i) => {
                                        const currentDate = new Date(range.start)
                                        currentDate.setDate(currentDate.getDate() + i)
                                        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
                                        const isToday = currentDate.toDateString() === new Date().toDateString()

                                        return (
                                          <div
                                            key={i}
                                            className={`flex items-center justify-center text-xs font-semibold border-r border-gray-300 dark:border-gray-600 last:border-r-0 ${
                                              isWeekend
                                                ? "bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400"
                                                : "text-gray-700 dark:text-gray-300"
                                            } ${isToday ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold" : ""}`}
                                            style={{
                                              width: `${(24 / totalHours) * 100}%`,
                                              minWidth: "60px",
                                            }}
                                          >
                                            {currentDate.toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </div>
                                        )
                                      })
                                    })()}
                                  </div>

                                  {/* Hours row */}
                                  <div className="h-8 flex">
                                    {(() => {
                                      const hoursToShow = Math.min(totalHours, 168) // Max 1 week of hours
                                      const hourStep = totalHours > 168 ? Math.ceil(totalHours / 168) : 1

                                      return Array.from({ length: Math.ceil(totalHours / hourStep) }, (_, i) => {
                                        const hourIndex = i * hourStep
                                        const currentTime = new Date(range.start.getTime() + hourIndex * 60 * 60 * 1000)
                                        const hour = currentTime.getHours()
                                        const showHour = hourStep === 1 || hour % 6 === 0 // Show every hour or every 6 hours

                                        return (
                                          <div
                                            key={i}
                                            className="flex items-center justify-center text-xs border-r border-gray-300 dark:border-gray-600 last:border-r-0 text-gray-500 dark:text-gray-400"
                                            style={{
                                              width: `${(hourStep / totalHours) * 100}%`,
                                              minWidth: "20px",
                                            }}
                                          >
                                            {showHour ? `${hour.toString().padStart(2, "0")}:00` : ""}
                                          </div>
                                        )
                                      })
                                    })()}
                                  </div>
                                </div>

                                {/* Current time indicator */}
                                {(() => {
                                  const now = new Date()
                                  if (now >= range.start && now <= range.end) {
                                    const nowPosition =
                                      ((now.getTime() - range.start.getTime()) /
                                        (range.end.getTime() - range.start.getTime())) *
                                      100
                                    return (
                                      <div
                                        className="absolute top-16 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                        style={{ left: `${nowPosition}%` }}
                                      >
                                        <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="absolute -top-6 -left-8 text-xs text-red-500 font-semibold whitespace-nowrap">
                                          Now
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Outage rows with accurate positioning */}
                      <div className="space-y-1">
                        {loading ? (
                          [...Array(4)].map((_, i) => (
                            <div key={i} className="flex">
                              <div className="w-80 h-14 rounded bg-muted animate-pulse mr-4"></div>
                              <div className="flex-1 h-14 rounded bg-muted animate-pulse min-w-[500px]"></div>
                            </div>
                          ))
                        ) : !filters.length ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No outages match your filters</p>
                            <p className="text-sm mt-2">Total outages available: {outages.length}</p>
                            <p className="text-sm">Try adjusting your month or environment filters</p>
                          </div>
                        ) : (
                          filters.map((o, index) => {
                            // Calculate accurate positioning
                            const startPercent =
                              ((o.startDate.getTime() - range.start.getTime()) /
                                (range.end.getTime() - range.start.getTime())) *
                              100
                            const endPercent =
                              ((o.endDate.getTime() - range.start.getTime()) /
                                (range.end.getTime() - range.start.getTime())) *
                              100
                            const widthPercent = Math.max(0.5, endPercent - startPercent) // Minimum 0.5% width

                            return (
                              <div key={o.id} className="flex items-center hover:bg-muted/50 rounded p-1 group">
                                {/* Info panel */}
                                <div className="w-80 pr-4 shrink-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-medium text-sm leading-tight">{o.title}</h4>
                                    <div className="flex gap-1 ml-2">
                                      <Badge className={`${severityCss[o.severity]} text-xs`}>{o.severity}</Badge>
                                      {o.outageType && (
                                        <Badge className={`${typeCss[o.outageType]} text-xs`}>{o.outageType}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {o.environments.slice(0, 3).map((e) => (
                                      <Badge
                                        key={e}
                                        className={`text-xs ${environmentColors[e as keyof typeof environmentColors]} text-white`}
                                      >
                                        {e}
                                      </Badge>
                                    ))}
                                    {o.environments.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{o.environments.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatTimelineDate(o.startDate, selectedTimezone)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Duration: {diffLabel(o.startDate, o.endDate)}
                                  </div>
                                </div>

                                {/* Gantt bar */}
                                <div className="flex-1 relative h-12 bg-muted/30 rounded overflow-visible min-w-[500px]">
                                  {/* Grid lines for better readability */}
                                  <div className="absolute inset-0 opacity-20">
                                    {Array.from({ length: 25 }, (_, i) => (
                                      <div
                                        key={i}
                                        className="absolute top-0 bottom-0 w-px bg-gray-400"
                                        style={{ left: `${i * 4}%` }}
                                      />
                                    ))}
                                  </div>

                                  {/* Outage bar */}
                                  <div
                                    className={`absolute top-1 h-10 rounded-md flex items-center px-2 text-white text-xs font-medium cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-offset-1 ${
                                      o.severity === "High"
                                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 group-hover:ring-red-300"
                                        : o.severity === "Medium"
                                          ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 group-hover:ring-yellow-300"
                                          : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 group-hover:ring-green-300"
                                    }`}
                                    style={{
                                      left: `${Math.max(0, startPercent)}%`,
                                      width: `${widthPercent}%`,
                                      minWidth: "40px",
                                    }}
                                    onClick={() => setDetail(o)}
                                    onMouseEnter={(e) => {
                                      setHover(Number(o.id))
                                      setTooltip({ o, x: e.clientX, y: e.clientY, v: true })
                                    }}
                                    onMouseLeave={() => {
                                      setHover(null)
                                      setTooltip(null)
                                    }}
                                    onMouseMove={(e) =>
                                      tooltip && setTooltip({ ...tooltip, x: e.clientX, y: e.clientY })
                                    }
                                  >
                                    <span className="truncate">
                                      {widthPercent > 8
                                        ? diffLabel(o.startDate, o.endDate)
                                        : diffLabel(o.startDate, o.endDate).replace(" ", "")}
                                    </span>
                                  </div>

                                  {/* Overflow indicators */}
                                  {startPercent < 0 && (
                                    <div className="absolute left-0 top-1 h-10 w-2 bg-red-500 rounded-l-md flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-2 border-b-2 border-l-2 border-transparent border-l-white"></div>
                                    </div>
                                  )}
                                  {endPercent > 100 && (
                                    <div className="absolute right-0 top-1 h-10 w-2 bg-red-500 rounded-r-md flex items-center justify-center">
                                      <div className="w-0 h-0 border-t-2 border-b-2 border-r-2 border-transparent border-r-white"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>High Severity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span>Medium Severity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>Low Severity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-px h-4 bg-red-500"></div>
                        <span>Current Time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-gray-400 bg-transparent rounded"></div>
                        <span>Extends beyond view</span>
                      </div>
                    </div>
                  </div>
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
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No outages match your filters</p>
                      <p className="text-sm mt-2">Total outages available: {outages.length}</p>
                    </div>
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
                          {formatTimelineDate(o.startDate, selectedTimezone)} →{" "}
                          {formatTimelineDate(o.endDate, selectedTimezone)} • {diffLabel(o.startDate, o.endDate)}
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
                <EnhancedOutageForm onSuccess={() => fetchOutages(true)} />
              </TabsContent>
              <TabsContent value="multiple" className="mt-6">
                <TabularMultiOutageForm onSuccess={() => fetchOutages(true)} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* --------------------------- METRICS TAB ---------------------------- */}
          <TabsContent value="metrics" className="space-y-6">
            <InteractiveReport />
          </TabsContent>
        </Tabs>

        {/* floating tooltip & detailed modal */}
        <Tooltip />
        <OutageDetailModal outage={detail} isOpen={!!detail} onClose={() => setDetail(null)} />
      </div>
    </div>
  )
}
