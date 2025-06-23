"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  Activity,
  Calendar,
  BarChart3,
  Zap,
  Shield,
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts"
import { generateMLPredictions, type MLInsights } from "@/lib/ml-predictions"

interface MLPredictionsDashboardProps {
  outages: any[]
}

export function MLPredictionsDashboard({ outages }: MLPredictionsDashboardProps) {
  const [mlInsights, setMLInsights] = useState<MLInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<"7d" | "14d" | "30d">("14d")

  useEffect(() => {
    if (outages.length > 0) {
      setLoading(true)
      try {
        const insights = generateMLPredictions(outages)
        setMLInsights(insights)
      } catch (error) {
        console.error("Error generating ML predictions:", error)
      } finally {
        setLoading(false)
      }
    }
  }, [outages])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Generating ML predictions...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!mlInsights) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Unable to generate predictions. Insufficient data.</p>
        </CardContent>
      </Card>
    )
  }

  const timeframeMap = { "7d": 7, "14d": 14, "30d": 30 }
  const filteredPredictions = mlInsights.predictions.slice(0, timeframeMap[selectedTimeframe])

  // Prepare chart data
  const predictionChartData = filteredPredictions.map((pred, index) => ({
    day: `Day ${index + 1}`,
    date: pred.date.toLocaleDateString(),
    predicted: pred.predictedOutages,
    confidence: pred.confidence * 100,
    riskLevel: pred.riskLevel,
    upper: pred.predictedOutages * (1 + (1 - pred.confidence)),
    lower: Math.max(0, pred.predictedOutages * (1 - (1 - pred.confidence))),
  }))

  const riskDistribution = filteredPredictions.reduce(
    (acc, pred) => {
      acc[pred.riskLevel] = (acc[pred.riskLevel] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const riskChartData = Object.entries(riskDistribution).map(([level, count]) => ({
    level,
    count,
    percentage: Math.round((count / filteredPredictions.length) * 100),
  }))

  const avgConfidence = Math.round(
    (filteredPredictions.reduce((sum, pred) => sum + pred.confidence, 0) / filteredPredictions.length) * 100,
  )

  const highRiskDays = filteredPredictions.filter(
    (pred) => pred.riskLevel === "High" || pred.riskLevel === "Critical",
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            ML-Powered Outage Predictions
          </h2>
          <p className="text-muted-foreground">AI-driven forecasting and risk analysis</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "14d", "30d"] as const).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Model Performance & Confidence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Math.round(mlInsights.modelAccuracy * 100)}%</div>
              <p className="text-sm text-muted-foreground">Model Accuracy (R²)</p>
              <Progress value={mlInsights.modelAccuracy * 100} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{avgConfidence}%</div>
              <p className="text-sm text-muted-foreground">Avg Prediction Confidence</p>
              <Progress value={avgConfidence} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{highRiskDays}</div>
              <p className="text-sm text-muted-foreground">High Risk Days Ahead</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{mlInsights.trendAnalysis.volatility}</div>
              <p className="text-sm text-muted-foreground">Volatility Index</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Trend</p>
                <Badge
                  variant={
                    mlInsights.trendAnalysis.trend === "increasing"
                      ? "destructive"
                      : mlInsights.trendAnalysis.trend === "decreasing"
                        ? "default"
                        : "secondary"
                  }
                >
                  {mlInsights.trendAnalysis.trend}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Seasonality</p>
                <Badge variant="outline">{mlInsights.trendAnalysis.seasonality}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cyclical Pattern</p>
                <Badge variant={mlInsights.trendAnalysis.cyclicalPattern ? "default" : "secondary"}>
                  {mlInsights.trendAnalysis.cyclicalPattern ? "Detected" : "None"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Volatility</p>
                <Badge
                  variant={
                    mlInsights.trendAnalysis.volatility > 2
                      ? "destructive"
                      : mlInsights.trendAnalysis.volatility > 1
                        ? "secondary"
                        : "default"
                  }
                >
                  {mlInsights.trendAnalysis.volatility > 2
                    ? "High"
                    : mlInsights.trendAnalysis.volatility > 1
                      ? "Medium"
                      : "Low"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictions Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Outage Predictions with Confidence Intervals
          </CardTitle>
          <CardDescription>
            Predicted outages for the next {timeframeMap[selectedTimeframe]} days with confidence bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">{data.date}</p>
                          <p className="text-sm">
                            <span className="text-blue-600">Predicted: {data.predicted}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-green-600">Confidence: {Math.round(data.confidence)}%</span>
                          </p>
                          <p className="text-sm">
                            <Badge
                              variant={
                                data.riskLevel === "High" || data.riskLevel === "Critical" ? "destructive" : "default"
                              }
                            >
                              {data.riskLevel} Risk
                            </Badge>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="upper" stackId="1" stroke="none" fill="#e0e7ff" fillOpacity={0.3} />
                <Area type="monotone" dataKey="lower" stackId="1" stroke="none" fill="#ffffff" fillOpacity={1} />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
                <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="5 5" label="High Risk Threshold" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {riskChartData.map((item) => (
                <div key={item.level} className="flex items-center justify-between">
                  <Badge
                    variant={
                      item.level === "Critical" || item.level === "High"
                        ? "destructive"
                        : item.level === "Medium"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {item.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item.count} days ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Factors Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mlInsights.riskFactors.map((factor, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{factor.factor}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{factor.impact}%</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(factor.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  <Progress value={factor.impact} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Alerts */}
      {highRiskDays > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">High Risk Period Detected</AlertTitle>
          <AlertDescription className="text-orange-700">
            {highRiskDays} high-risk days identified in the next {timeframeMap[selectedTimeframe]} days. Consider
            implementing additional monitoring and having incident response teams on standby.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI-Generated Recommendations
          </CardTitle>
          <CardDescription>Based on predictive analysis and historical patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mlInsights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming High-Risk Days */}
      {filteredPredictions.filter((p) => p.riskLevel === "High" || p.riskLevel === "Critical").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming High-Risk Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPredictions
                .filter((pred) => pred.riskLevel === "High" || pred.riskLevel === "Critical")
                .slice(0, 5)
                .map((pred, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{pred.date.toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Predicted outages: {pred.predictedOutages} | Confidence: {Math.round(pred.confidence * 100)}%
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pred.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={pred.riskLevel === "Critical" ? "destructive" : "secondary"}>
                      {pred.riskLevel}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
