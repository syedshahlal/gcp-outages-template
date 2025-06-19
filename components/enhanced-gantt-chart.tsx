"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react"

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
}

interface EnhancedGanttChartProps {
  outages: OutageData[]
  selectedMonth: string
  selectedEnvironments: string[]
  onOutageSelect: (outage: OutageData) => void
}

const environments = ["POC", "SBX DEV", "SBX UAT", "PROD"]
const environmentColors = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  PROD: "bg-red-500",
}

const severityColors = {
  High: "from-red-500 to-red-600",
  Medium: "from-yellow-500 to-yellow-600",
  Low: "from-green-500 to-green-600",
}

export function EnhancedGanttChart({
  outages,
  selectedMonth,
  selectedEnvironments,
  onOutageSelect,
}: EnhancedGanttChartProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [sortBy, setSortBy] = useState<"date" | "severity" | "team" | "priority">("date")
  const [groupBy, setGroupBy] = useState<"none" | "team" | "severity" | "environment">("none")
  const [showCompleted, setShowCompleted] = useState(true)
  const [hoveredOutage, setHoveredOutage] = useState<number | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const filteredAndSortedOutages = useMemo(() => {
    const filtered = outages.filter((outage) => {
      const hasSelectedEnv = outage.environments.some((env) => selectedEnvironments.includes(env))
      const monthMatch = outage.startDate.toISOString().startsWith(selectedMonth)
      const searchMatch =
        searchTerm === "" ||
        outage.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outage.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (outage.category && outage.category.toLowerCase().includes(searchTerm.toLowerCase()))

      const statusMatch = showCompleted || outage.status !== "Completed"

      return hasSelectedEnv && monthMatch && searchMatch && statusMatch
    })

    // Sort outages
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "severity":
          const severityOrder = { High: 3, Medium: 2, Low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        case "team":
          return a.assignee.localeCompare(b.assignee)
        case "priority":
          return (a.priority || 1) - (b.priority || 1)
        case "date":
        default:
          return a.startDate.getTime() - b.startDate.getTime()
      }
    })

    return filtered
  }, [outages, selectedEnvironments, selectedMonth, searchTerm, sortBy, showCompleted])

  const groupedOutages = useMemo(() => {
    if (groupBy === "none") {
      return { "All Outages": filteredAndSortedOutages }
    }

    const groups: { [key: string]: OutageData[] } = {}

    filteredAndSortedOutages.forEach((outage) => {
      let groupKey = ""

      switch (groupBy) {
        case "team":
          groupKey = outage.assignee || "Unassigned"
          break
        case "severity":
          groupKey = `${outage.severity} Impact`
          break
        case "environment":
          groupKey = outage.environments.join(", ") || "No Environment"
          break
        default:
          groupKey = "All Outages"
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(outage)
    })

    return groups
  }, [filteredAndSortedOutages, groupBy])

  const dateRange = useMemo(() => {
    if (filteredAndSortedOutages.length === 0) {
      return { start: new Date(), end: new Date(), totalDays: 1 }
    }

    const startDate = new Date(Math.min(...filteredAndSortedOutages.map((o) => o.startDate.getTime())))
    const endDate = new Date(Math.max(...filteredAndSortedOutages.map((o) => o.endDate.getTime())))

    startDate.setDate(startDate.getDate() - 1)
    endDate.setDate(endDate.getDate() + 1)

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    return { start: startDate, end: endDate, totalDays }
  }, [filteredAndSortedOutages])

  const getGanttPosition = (startDate: Date, endDate: Date) => {
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime()
    const startMs = startDate.getTime() - dateRange.start.getTime()
    const durationMs = endDate.getTime() - startDate.getTime()

    const startPercent = (startMs / totalMs) * 100
    const widthPercent = (durationMs / totalMs) * 100

    return {
      left: `${Math.max(0, startPercent)}%`,
      width: `${Math.max(2, widthPercent * zoomLevel)}%`,
    }
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
      return `${diffDays}d ${remainingHours > 0 ? `${remainingHours}h` : ""}`
    }
    return `${diffHours}h`
  }

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName)
    } else {
      newCollapsed.add(groupName)
    }
    setCollapsedGroups(newCollapsed)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSortBy("date")
    setGroupBy("none")
    setZoomLevel(1)
    setShowCompleted(true)
    setCollapsedGroups(new Set())
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Enhanced Interactive Gantt Chart
            </CardTitle>
            <CardDescription className="text-sm">
              Advanced timeline with grouping, filtering, and zoom controls
              <br />
              Showing {filteredAndSortedOutages.length} outages | Timeline: {dateRange.start.toLocaleDateString()} -{" "}
              {dateRange.end.toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Enhanced Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search outages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="severity">Severity</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Group By</Label>
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="severity">Severity</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zoom and Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Controls</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2 min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCompleted(!showCompleted)} className="ml-2">
                  {showCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All Filters
            </Button>
          </div>

          {/* Enhanced Timeline Header */}
          <div className="relative">
            <div className="flex text-xs font-medium text-gray-600 mb-2">
              <div className="w-full sm:w-96 pr-4">Outage Information</div>
              <div className="hidden sm:block flex-1 text-center">
                {selectedMonth === "2024-06" ? "June 2024" : selectedMonth} - Timeline (Zoom:{" "}
                {Math.round(zoomLevel * 100)}%)
              </div>
            </div>
            <div className="flex">
              <div className="w-full sm:w-96 pr-4"></div>
              <div className="hidden sm:block flex-1 relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.min(dateRange.totalDays, 31) }, (_, i) => {
                    const currentDate = new Date(dateRange.start)
                    currentDate.setDate(currentDate.getDate() + i)
                    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

                    return (
                      <div
                        key={i}
                        className={`flex-1 flex flex-col items-center justify-center text-xs font-medium border-r border-gray-300 last:border-r-0 min-w-0 py-1 ${
                          isWeekend ? "bg-gray-200" : ""
                        }`}
                      >
                        <div className={isWeekend ? "text-red-600" : ""}>{currentDate.getDate()}</div>
                        <div className="text-gray-400 text-xs">
                          {currentDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Gantt Bars */}
          <div className="space-y-4">
            {Object.entries(groupedOutages).map(([groupName, groupOutages]) => (
              <div key={groupName} className="border rounded-lg">
                {/* Group Header */}
                {groupBy !== "none" && (
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroup(groupName)}
                  >
                    <div className="flex items-center gap-2">
                      {collapsedGroups.has(groupName) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                      <h3 className="font-medium">{groupName}</h3>
                      <Badge variant="secondary">{groupOutages.length} outages</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupBy === "severity" && (
                        <div
                          className={`w-3 h-3 rounded bg-gradient-to-r ${severityColors[groupName.split(" ")[0] as keyof typeof severityColors]}`}
                        ></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Group Content */}
                {!collapsedGroups.has(groupName) && (
                  <div className="p-2 space-y-2">
                    {groupOutages.map((outage, index) => {
                      const position = getGanttPosition(outage.startDate, outage.endDate)
                      const isOverlapping = groupOutages.some(
                        (other, otherIndex) =>
                          otherIndex !== index && other.startDate < outage.endDate && other.endDate > outage.startDate,
                      )

                      return (
                        <div key={outage.id} className="relative group">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center hover:bg-gray-50 rounded-lg p-2 transition-colors">
                            {/* Enhanced Outage Info */}
                            <div className="w-full sm:w-96 pr-4 mb-2 sm:mb-0">
                              <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <h4 className="font-medium text-sm flex-1">{outage.title}</h4>
                                  <div className="flex gap-1">
                                    <Badge
                                      className={`text-xs ${
                                        outage.severity === "High"
                                          ? "bg-red-100 text-red-800"
                                          : outage.severity === "Medium"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800"
                                      }`}
                                      variant="outline"
                                    >
                                      {outage.severity}
                                    </Badge>
                                    {outage.priority && (
                                      <Badge variant="secondary" className="text-xs">
                                        P{outage.priority}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      #{outage.id}
                                    </Badge>
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

                                <div className="text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span className="sm:hidden">
                                      {outage.startDate.toLocaleDateString()} - {outage.endDate.toLocaleDateString()}
                                    </span>
                                    <span className="hidden sm:inline">
                                      {formatDateTime(outage.startDate)} → {formatDateTime(outage.endDate)}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {outage.assignee}
                                  </span>
                                  {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                                    <span className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {outage.estimatedUsers} users
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Enhanced Gantt Bar */}
                            <div className="hidden sm:block flex-1 relative h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {isOverlapping && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 z-10"></div>
                              )}
                              <div
                                className={`absolute top-2 h-12 rounded-lg flex items-center px-3 text-white text-xs font-medium shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 bg-gradient-to-r ${
                                  severityColors[outage.severity]
                                } ${hoveredOutage === outage.id ? "ring-2 ring-white ring-opacity-50" : ""}`}
                                style={position}
                                onClick={() => onOutageSelect(outage)}
                                onMouseEnter={() => setHoveredOutage(outage.id)}
                                onMouseLeave={() => setHoveredOutage(null)}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{getDuration(outage.startDate, outage.endDate)}</span>
                                  {outage.category && (
                                    <Badge variant="secondary" className="text-xs bg-white/20">
                                      {outage.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mobile Action Button */}
                            <div className="sm:hidden w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOutageSelect(outage)}
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
                )}
              </div>
            ))}
          </div>

          {/* Enhanced Legend */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Severity Levels</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                    <span className="text-sm">High Impact</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded"></div>
                    <span className="text-sm">Medium Impact</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
                    <span className="text-sm">Low Impact</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Environments</h4>
                <div className="flex flex-wrap gap-3">
                  {environments.map((env) => (
                    <div key={env} className="flex items-center gap-1">
                      <div
                        className={`w-3 h-3 ${environmentColors[env as keyof typeof environmentColors]} rounded`}
                      ></div>
                      <span className="text-sm">{env}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p>• Orange bar at top indicates overlapping outages</p>
              <p>• Weekend days are highlighted in gray</p>
              <p>• Click on any outage bar for detailed information</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
