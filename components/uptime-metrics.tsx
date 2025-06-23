"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface UptimeData {
  day: string
  uptime: number
  downtime: number
  uptimePercentage: number
}

const generateUptimeData = (): UptimeData[] => {
  // Sample data for the past week
  return [
    { day: "Mon", uptime: 22.5, downtime: 1.5, uptimePercentage: 93.75 },
    { day: "Tue", uptime: 24, downtime: 0, uptimePercentage: 100 },
    { day: "Wed", uptime: 21, downtime: 3, uptimePercentage: 87.5 },
    { day: "Thu", uptime: 23, downtime: 1, uptimePercentage: 95.83 },
    { day: "Fri", uptime: 20, downtime: 4, uptimePercentage: 83.33 },
    { day: "Sat", uptime: 24, downtime: 0, uptimePercentage: 100 },
    { day: "Sun", uptime: 22, downtime: 2, uptimePercentage: 91.67 },
  ]
}

// Chart components that will be loaded dynamically
function BarChartComponent({ data }: { data: UptimeData[] }) {
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
        <div className="text-gray-500">Loading chart...</div>
      </div>
    )
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } = chartComponents

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="uptime" fill="var(--color-uptime)" name="Uptime (hours)" />
        <Bar dataKey="downtime" fill="var(--color-downtime)" name="Downtime (hours)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LineChartComponent({ data }: { data: UptimeData[] }) {
  const [chartComponents, setChartComponents] = useState<any>(null)

  useEffect(() => {
    const loadCharts = async () => {
      try {
        const recharts = await import("recharts")
        setChartComponents({
          ResponsiveContainer: recharts.ResponsiveContainer,
          LineChart: recharts.LineChart,
          Line: recharts.Line,
          XAxis: recharts.XAxis,
          YAxis: recharts.YAxis,
          CartesianGrid: recharts.CartesianGrid,
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
        <div className="text-gray-500">Loading chart...</div>
      </div>
    )
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } = chartComponents

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis domain={[80, 100]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="uptimePercentage"
          stroke="var(--color-uptimePercentage)"
          strokeWidth={3}
          name="Uptime %"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function UptimeMetrics() {
  const uptimeData = useMemo(() => generateUptimeData(), [])

  const averageUptime = useMemo(() => {
    return uptimeData.reduce((acc, day) => acc + day.uptimePercentage, 0) / uptimeData.length
  }, [uptimeData])

  const totalDowntime = useMemo(() => {
    return uptimeData.reduce((acc, day) => acc + day.downtime, 0)
  }, [uptimeData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary Cards */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Uptime</p>
              <p className="text-2xl font-bold text-green-600">{averageUptime.toFixed(2)}%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Downtime</p>
              <p className="text-2xl font-bold text-red-600">{totalDowntime}h</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className="text-2xl font-bold text-blue-600">
                {averageUptime >= 99 ? "Excellent" : averageUptime >= 95 ? "Good" : "Needs Attention"}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime/Downtime Bar Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Weekly Uptime vs Downtime</CardTitle>
          <CardDescription>Hours of uptime and downtime per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              uptime: {
                label: "Uptime",
                color: "hsl(var(--chart-1))",
              },
              downtime: {
                label: "Downtime",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <BarChartComponent data={uptimeData} />
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Uptime Percentage Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Uptime Trend</CardTitle>
          <CardDescription>Daily uptime percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              uptimePercentage: {
                label: "Uptime %",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <LineChartComponent data={uptimeData} />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
