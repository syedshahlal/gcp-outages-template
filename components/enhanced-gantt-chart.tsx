"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users } from "lucide-react"

interface OutageData {
  id: string | number
  title: string
  startDate: string
  endDate: string
  environments: string[]
  severity: "High" | "Medium" | "Low"
  assignee: string
  outageType?: "Internal" | "External"
  estimatedUsers?: number
}

const EnhancedGanttChart = () => {
  const [outages, setOutages] = useState<OutageData[]>([])
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Week")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        console.log("Fetching outages for Gantt chart...")

        const response = await fetch("/api/outages", { cache: "no-store" })
        console.log("Gantt chart API response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("Gantt chart API response data:", data)

          // Handle both array and object responses
          const outagesArray = Array.isArray(data) ? data : (data?.outages ?? [])
          console.log("Processed outages for Gantt:", outagesArray)

          setOutages(outagesArray)
        } else {
          console.warn("Failed to fetch outages for Gantt chart")
          setOutages([])
        }
      } catch (error) {
        console.error("Failed to fetch data for Gantt chart:", error)
        setOutages([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const hours = Math.floor((endDate.getTime() - startDate.getTime()) / 3.6e6)
    const days = Math.floor(hours / 24)
    return days ? `${days}d ${hours % 24}h` : `${hours}h`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "bg-red-500"
      case "Medium":
        return "bg-yellow-500"
      case "Low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getEnvironmentColors = (environments: string[]) => {
    const colors: Record<string, string> = {
      POC: "bg-blue-500",
      "SBX DEV": "bg-green-500",
      "SBX UAT": "bg-yellow-500",
      "SBX Beta": "bg-orange-500",
      PROD: "bg-red-500",
    }
    return environments.map((env) => colors[env] || "bg-gray-500")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading Gantt chart...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Outages Gantt Chart
        </CardTitle>
        <CardDescription>Visual timeline of planned outages ({outages.length} total)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* View Mode Controls */}
        <div className="flex gap-2 mb-6">
          {["Day", "Week", "Month"].map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(mode as any)}
            >
              {mode}
            </Button>
          ))}
        </div>

        {/* Outages List */}
        {outages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No outages available</p>
            <p className="text-sm mt-2">Create some outages in the Schedule tab to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {outages.map((outage) => (
              <div key={outage.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{outage.title}</h3>
                    <p className="text-sm text-muted-foreground">ID: #{outage.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${getSeverityColor(outage.severity)} text-white`}>{outage.severity}</Badge>
                    {outage.outageType && <Badge variant="outline">{outage.outageType}</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {calculateDuration(outage.startDate, outage.endDate)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Start</p>
                    <p className="text-sm text-muted-foreground">{formatDate(outage.startDate)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">End</p>
                    <p className="text-sm text-muted-foreground">{formatDate(outage.endDate)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium mb-1">Environments</p>
                    <div className="flex flex-wrap gap-1">
                      {outage.environments.map((env, index) => (
                        <Badge
                          key={env}
                          className={`${getEnvironmentColors(outage.environments)[index]} text-white text-xs`}
                        >
                          {env}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {outage.estimatedUsers && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{outage.estimatedUsers.toLocaleString()} users</span>
                    </div>
                  )}
                </div>

                {outage.assignee && (
                  <div className="mt-2">
                    <p className="text-sm">
                      <span className="font-medium">Assigned to:</span> {outage.assignee}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedGanttChart
export { EnhancedGanttChart }
