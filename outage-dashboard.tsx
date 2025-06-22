"use client"

import type React from "react"

import { useState, useMemo, useEffect, useRef } from "react"
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
  FileText,
  Globe,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
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

// Add scroll functions after the existing helper functions:

// Add these helper functions after the existing helper functions

// Timeline scroll functions
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

  // Add these state variables after the existing ones
  const [scrollPosition, setScrollPosition] = useState(0)
  const [timelineWidth, setTimelineWidth] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Add state for timeline hover:
  // Remove this line:
  // const [timelineHover, setTimelineHover] = useState<{ x: number; time: Date; visible: boolean } | null>(null)

  // Add these state variables for scroll management after the existing state variables:
  const [timelineScrollPosition, setTimelineScrollPosition] = useState(0)
  const [visibleDays, setVisibleDays] = useState(10) // Show 10 days at a time
  const timelineScrollRef = useRef<HTMLDivElement>(null)

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

  const scrollTimelineLeft = () => {
    if (timelineScrollRef.current) {
      const scrollAmount =
        (timelineScrollRef.current.scrollWidth /
          Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))) *
        3 // Scroll 3 days at a time
      const newPosition = Math.max(0, timelineScrollPosition - scrollAmount)
      timelineScrollRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
      setTimelineScrollPosition(newPosition)
    }
  }

  const scrollTimelineRight = () => {
    if (timelineScrollRef.current) {
      const scrollAmount =
        (timelineScrollRef.current.scrollWidth /
          Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))) *
        3 // Scroll 3 days at a time
      const maxScroll = timelineScrollRef.current.scrollWidth - timelineScrollRef.current.clientWidth
      const newPosition = Math.min(maxScroll, timelineScrollPosition + scrollAmount)
      timelineScrollRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
      setTimelineScrollPosition(newPosition)
    }
  }

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setTimelineScrollPosition(e.currentTarget.scrollLeft)
  }

  // Calculate visible date range based on scroll position
  const getVisibleDateRange = () => {
    const totalDays = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
    const totalWidth = timelineScrollRef.current?.scrollWidth || 1000
    const visibleWidth = timelineScrollRef.current?.clientWidth || 800

    const scrollPercentage = timelineScrollPosition / (totalWidth - visibleWidth)
    const startDayOffset = Math.floor(scrollPercentage * (totalDays - visibleDays))

    const visibleStart = new Date(range.start)
    visibleStart.setDate(visibleStart.getDate() + startDayOffset)

    const visibleEnd = new Date(visibleStart)
    visibleEnd.setDate(visibleEnd.getDate() + visibleDays)

    return { start: visibleStart, end: visibleEnd, totalDays }
  }

  // Get upcoming outages for right sidebar
  const upcomingOutages = useMemo(() => {
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return outages
      .filter((o) => o.startDate >= now && o.startDate <= nextMonth)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10) // Show top 10 upcoming outages
  }, [outages])

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

  const scrollTimeline = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(
              scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth,
              scrollPosition + scrollAmount,
            )

      scrollContainerRef.current.scrollTo({ left: newPosition, behavior: "smooth" })
      setScrollPosition(newPosition)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft)
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">GCP Planned Outages Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>{getTimezoneAbbreviation(selectedTimezone)}</span>
              <span>•</span>
              <span>Last updated: {lastUpdated?.toLocaleTimeString() || "Never"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchOutages(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Three Column Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Filters */}
        <div className="w-80 border-r bg-background/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Filters Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
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
                <div className="space-y-2">
                  <TimezoneSelector
                    value={selectedTimezone}
                    onValueChange={setSelectedTimezone}
                    label="Display Timezone"
                    showCurrentTime={true}
                  />
                </div>

                {/* Search */}
                <div className="space-y-2">
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

                {/* Sort and Month */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="severity">Severity</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={selectedMonth}
                      onValueChange={(val) => {
                        setSelectedMonth(val)
                        setUseCustomRange(false)
                      }}
                    >
                      <SelectTrigger>
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
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="custom-range"
                      checked={useCustomRange}
                      onCheckedChange={(checked) => setUseCustomRange(checked as boolean)}
                    />
                    <Label htmlFor="custom-range" className="cursor-pointer font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Custom Date Range
                    </Label>
                  </div>
                  {useCustomRange && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Start Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End Date</Label>
                        <Input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Environment checkboxes */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-medium">Environments</Label>
                  <div className="space-y-3">
                    {/* Select All toggle */}
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="all"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onCheckedChange={(c) => setEnvFilter(c ? [...ENVIRONMENTS] : [])}
                      />
                      <Label htmlFor="all" className="cursor-pointer font-medium">
                        Select All
                      </Label>
                    </div>

                    {/* Individual environment toggles */}
                    <div className="space-y-2">
                      {ENVIRONMENTS.map((env) => (
                        <div key={env} className="flex items-center space-x-3">
                          <Checkbox
                            id={env}
                            checked={envFilter.includes(env)}
                            onChange={(c) => {
                              setEnvFilter(c ? [...envFilter, env] : envFilter.filter((e) => e !== env))
                            }}
                          />
                          <Label htmlFor={env} className="cursor-pointer flex items-center gap-2 flex-1">
                            <div
                              className={`w-3 h-3 rounded-full ${environmentColors[env as keyof typeof environmentColors]}`}
                            />
                            <span className="text-sm">{env}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEnvFilter([...ENVIRONMENTS])
                      setSearch("")
                      setSortBy("date")
                      setUseCustomRange(false)
                      setCustomDateRange({ start: "", end: "" })
                      setSeverityFilter([])
                    }}
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* High-severity alerts */}
            <div className="space-y-2">
              {filters
                .filter((o) => o.severity === "High")
                .slice(0, 2)
                .map((o) => (
                  <Alert key={o.id} className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300 text-sm">
                      <strong>HIGH IMPACT:</strong> {o.title} on {formatTimelineDate(o.startDate, selectedTimezone)}
                      {o.outageType && <span> ({o.outageType})</span>}
                    </AlertDescription>
                  </Alert>
                ))}
            </div>

            {/* Tabs */}
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

              {/* Dashboard Content */}
              <TabsContent value="dashboard" className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>

                {/* Timeline */}
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
                        <span className="ml-2 text-sm">
                          Showing {filters.length} of {outages.length} outages
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full">
                        {/* Scroll Controls */}
                        <div className="flex justify-between items-center mb-4 p-2 bg-muted/50 rounded-lg">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={scrollTimelineLeft}
                              disabled={timelineScrollPosition <= 0}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={scrollTimelineRight}
                              disabled={
                                timelineScrollRef.current
                                  ? timelineScrollPosition >=
                                    timelineScrollRef.current.scrollWidth - timelineScrollRef.current.clientWidth
                                  : false
                              }
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Showing {visibleDays} days • Scroll to view more
                          </div>
                        </div>

                        <div className="w-full">
                          {/* Timeline header */}
                          <div className="flex mb-4">
                            <div className="w-80 pr-2 flex items-center justify-center shrink-0">
                              <h3 className="text-lg font-semibold text-center">Planned Outages</h3>
                            </div>
                            <div className="flex-1 relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                              <div
                                ref={timelineScrollRef}
                                className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                                onScroll={handleTimelineScroll}
                                style={{ scrollbarWidth: "thin" }}
                              >
                                {/* Full timeline width container */}
                                <div
                                  style={{
                                    width: `${Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) * 80}px`,
                                    minWidth: "100%",
                                  }}
                                >
                                  {/* Time scale header */}
                                  <div className="h-12 border-b border-gray-300 dark:border-gray-600">
                                    <div className="h-12 flex">
                                      {Array.from(
                                        {
                                          length: Math.ceil(
                                            (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24),
                                          ),
                                        },
                                        (_, i) => {
                                          const currentDate = new Date(range.start)
                                          currentDate.setDate(currentDate.getDate() + i)
                                          const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
                                          const isToday = currentDate.toDateString() === new Date().toDateString()

                                          return (
                                            <div
                                              key={i}
                                              className={`flex items-center justify-center text-sm font-semibold border-r border-gray-300 dark:border-gray-600 last:border-r-0 ${
                                                isWeekend
                                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                  : "text-gray-700 dark:text-gray-300"
                                              } ${isToday ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold" : ""}`}
                                              style={{ width: "80px", minWidth: "80px" }}
                                            >
                                              <div className="text-center">
                                                <div className="font-bold">
                                                  {currentDate.toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                  })}
                                                </div>
                                                <div className="text-xs opacity-75">
                                                  {currentDate.toLocaleDateString("en-US", {
                                                    weekday: "short",
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        },
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline content */}
                          <div className="relative">
                            <div className="space-y-1">
                              {loading ? (
                                [...Array(4)].map((_, i) => (
                                  <div key={i} className="flex">
                                    <div className="w-80 h-14 rounded bg-muted animate-pulse mr-2"></div>
                                    <div className="flex-1 h-14 rounded bg-muted animate-pulse"></div>
                                  </div>
                                ))
                              ) : !filters.length ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No outages match your filters</p>
                                  <p className="text-sm mt-2">Total outages available: {outages.length}</p>
                                  <p className="text-sm">Try adjusting your filters</p>
                                </div>
                              ) : (
                                filters.map((o, index) => {
                                  const totalTimelineMs = range.end.getTime() - range.start.getTime()
                                  const outageStartMs = o.startDate.getTime() - range.start.getTime()
                                  const outageDurationMs = o.endDate.getTime() - o.startDate.getTime()

                                  return (
                                    <div key={o.id} className="flex items-center hover:bg-muted/50 rounded p-1 group">
                                      {/* Info panel */}
                                      <div className="w-80 pr-2 shrink-0">
                                        <div className="flex justify-between items-start mb-1">
                                          <h4 className="font-medium text-sm leading-tight">{o.title}</h4>
                                          <div className="flex gap-1 ml-2">
                                            <Badge className={`${severityCss[o.severity]} text-xs`}>{o.severity}</Badge>
                                            {o.outageType && (
                                              <Badge className={`${typeCss[o.outageType]} text-xs`}>
                                                {o.outageType}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-1">
                                          {o.environments.map((e) => (
                                            <Badge
                                              key={e}
                                              className={`text-xs ${environmentColors[e as keyof typeof environmentColors]} text-white`}
                                            >
                                              {e}
                                            </Badge>
                                          ))}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatTimelineDate(o.startDate, selectedTimezone)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Duration: {diffLabel(o.startDate, o.endDate)}
                                        </div>
                                      </div>

                                      {/* Scrollable Gantt bar container */}
                                      <div className="flex-1 relative overflow-hidden">
                                        <div
                                          className="relative h-12 bg-muted/30 rounded"
                                          style={{
                                            width: `${Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) * 80}px`,
                                            marginLeft: `-${timelineScrollPosition}px`,
                                          }}
                                        >
                                          {/* Grid lines */}
                                          <div className="absolute inset-0 opacity-20">
                                            {Array.from(
                                              {
                                                length: Math.ceil(
                                                  (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24),
                                                ),
                                              },
                                              (_, i) => (
                                                <div
                                                  key={i}
                                                  className="absolute top-0 bottom-0 w-px bg-gray-400"
                                                  style={{ left: `${i * 80}px` }}
                                                />
                                              ),
                                            )}
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
                                              left: `${(outageStartMs / totalTimelineMs) * Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) * 80}px`,
                                              width: `${Math.max(40, (outageDurationMs / totalTimelineMs) * Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) * 80)}px`,
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
                                            <span className="truncate">{diffLabel(o.startDate, o.endDate)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              )}
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
                              <div className="text-xs text-muted-foreground ml-4">
                                Use scroll controls or drag timeline to view more days • Showing {visibleDays} days at a
                                time
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Outage List
                      </CardTitle>
                      <CardDescription>
                        Showing {filters.length} of {outages.length} outages
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {filters.map((o) => (
                        <Card key={o.id} className="border-2 hover:shadow-md transition-shadow">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{o.title}</CardTitle>
                            <div className="flex items-center space-x-2">
                              <Badge className={severityCss[o.severity]}>{o.severity}</Badge>
                              {o.outageType && <Badge className={typeCss[o.outageType]}>{o.outageType}</Badge>}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {formatTimelineDate(o.startDate, selectedTimezone)} –{" "}
                              {formatTimelineDate(o.endDate, selectedTimezone)} ({diffLabel(o.startDate, o.endDate)})
                            </p>
                            <p className="text-sm text-muted-foreground">Team: {o.assignee}</p>
                            <p className="text-sm text-muted-foreground">Environments: {o.environments.join(", ")}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Schedule Content */}
              <TabsContent value="schedule">
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule an Outage</CardTitle>
                    <CardDescription>Create a new planned outage event.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue="simple">
                      <TabsList>
                        <TabsTrigger value="simple">Simple Form</TabsTrigger>
                        <TabsTrigger value="enhanced">Enhanced Form</TabsTrigger>
                        <TabsTrigger value="tabular">Tabular Form</TabsTrigger>
                      </TabsList>
                      <TabsContent value="simple">
                        <p className="text-sm text-muted-foreground">
                          A basic form for quickly scheduling a single outage.
                        </p>
                        <EnhancedOutageForm />
                      </TabsContent>
                      <TabsContent value="enhanced">
                        <p className="text-sm text-muted-foreground">
                          A more detailed form with advanced options for scheduling a single outage.
                        </p>
                        <EnhancedOutageForm />
                      </TabsContent>
                      <TabsContent value="tabular">
                        <p className="text-sm text-muted-foreground">
                          A tabular form for scheduling multiple outages at once.
                        </p>
                        <TabularMultiOutageForm />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Metrics Content */}
              <TabsContent value="metrics">
                <Card>
                  <CardHeader>
                    <CardTitle>Outage Metrics</CardTitle>
                    <CardDescription>Visualize outage data and trends.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Upcoming Outages */}
        <div className="w-80 border-l bg-background/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Upcoming Outages
                  <Badge variant="secondary">{upcomingOutages.length}</Badge>
                </CardTitle>
                <CardDescription>Next 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingOutages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No upcoming outages</p>
                    <p className="text-xs">All clear for the next 30 days!</p>
                  </div>
                ) : (
                  upcomingOutages.map((outage) => {
                    const daysUntil = Math.ceil(
                      (outage.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                    )
                    const isToday = daysUntil === 0
                    const isTomorrow = daysUntil === 1

                    return (
                      <div
                        key={outage.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setDetail(outage)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm leading-tight pr-2">{outage.title}</h4>
                          <div className="flex gap-1 shrink-0">
                            <Badge className={`${severityCss[outage.severity]} text-xs`}>{outage.severity}</Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {outage.environments.slice(0, 2).map((env) => (
                            <Badge
                              key={env}
                              className={`text-xs ${environmentColors[env as keyof typeof environmentColors]} text-white`}
                            >
                              {env}
                            </Badge>
                          ))}
                          {outage.environments.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{outage.environments.length - 2}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {isToday ? "Today" : isTomorrow ? "Tomorrow" : `In ${daysUntil} days`} •{" "}
                              {formatTimelineDate(outage.startDate, selectedTimezone)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Duration: {diffLabel(outage.startDate, outage.endDate)}</span>
                          </div>
                          {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{outage.estimatedUsers.toLocaleString()} users affected</span>
                            </div>
                          )}
                          <div className="text-xs">
                            <span className="font-medium">Team:</span> {outage.assignee}
                          </div>
                        </div>

                        {(isToday || isTomorrow) && (
                          <div className="mt-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded text-xs font-medium">
                            {isToday ? "🚨 Starting Today" : "⚠️ Starting Tomorrow"}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const now = new Date()
                    setCustomDateRange({
                      start: now.toISOString().split("T")[0],
                      end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    })
                    setUseCustomRange(true)
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Next 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSeverityFilter(["High"])}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  High Severity Only
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={generateFilteredReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Tooltip />
    </div>
  )
}
