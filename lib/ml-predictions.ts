// ML-based prediction utilities for outage forecasting

export interface PredictionData {
  date: Date
  predictedOutages: number
  confidence: number
  riskLevel: "Low" | "Medium" | "High" | "Critical"
  factors: string[]
}

export interface TrendAnalysis {
  trend: "increasing" | "decreasing" | "stable"
  seasonality: "strong" | "moderate" | "weak" | "none"
  volatility: number
  cyclicalPattern: boolean
}

export interface MLInsights {
  predictions: PredictionData[]
  trendAnalysis: TrendAnalysis
  riskFactors: Array<{ factor: string; impact: number; confidence: number }>
  recommendations: string[]
  modelAccuracy: number
}

// Simple moving average for trend detection
function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = []
  for (let i = window - 1; i < data.length; i++) {
    const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(sum / window)
  }
  return result
}

// Exponential smoothing for predictions
function exponentialSmoothing(data: number[], alpha = 0.3): number[] {
  const result: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

// Seasonal decomposition (simplified)
function detectSeasonality(data: number[], period = 7): { seasonal: number[]; trend: number[]; residual: number[] } {
  const seasonal: number[] = []
  const trend = calculateMovingAverage(data, period)
  const residual: number[] = []

  // Calculate seasonal components
  for (let i = 0; i < data.length; i++) {
    const seasonIndex = i % period
    if (!seasonal[seasonIndex]) seasonal[seasonIndex] = 0
    seasonal[seasonIndex] += data[i]
  }

  // Normalize seasonal components
  const seasonalNormalized = seasonal.map((s) => s / Math.ceil(data.length / period))

  // Calculate residuals
  for (let i = 0; i < data.length; i++) {
    const trendValue = trend[Math.max(0, i - Math.floor(period / 2))] || trend[0]
    const seasonalValue = seasonalNormalized[i % period]
    residual.push(data[i] - trendValue - seasonalValue)
  }

  return {
    seasonal: seasonalNormalized,
    trend,
    residual,
  }
}

// Linear regression for trend analysis
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared
  const yMean = sumY / n
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0)
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const r2 = 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

// Risk scoring algorithm
function calculateRiskScore(
  outageCount: number,
  severity: string,
  environment: string[],
  timeOfDay: number,
  dayOfWeek: number,
): number {
  let risk = 0

  // Base risk from outage count
  risk += Math.min(outageCount * 10, 50)

  // Severity multiplier
  const severityMultiplier = { High: 3, Medium: 2, Low: 1 }
  risk *= severityMultiplier[severity as keyof typeof severityMultiplier] || 1

  // Environment risk
  const prodEnvs = environment.filter((env) => env.includes("PROD")).length
  risk += prodEnvs * 15

  // Time-based risk (higher during business hours)
  if (timeOfDay >= 9 && timeOfDay <= 17) risk += 10

  // Day of week risk (higher on weekdays)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) risk += 5

  return Math.min(risk, 100)
}

// Main prediction function
export function generateMLPredictions(outages: any[]): MLInsights {
  // Prepare time series data
  const dailyOutages = prepareDailyOutageData(outages)
  const outageValues = dailyOutages.map((d) => d.count)
  const dates = dailyOutages.map((d) => d.date)

  // Trend analysis
  const movingAvg = calculateMovingAverage(outageValues, 7)
  const smoothed = exponentialSmoothing(outageValues)
  const seasonal = detectSeasonality(outageValues)

  // Linear regression for overall trend
  const xValues = Array.from({ length: outageValues.length }, (_, i) => i)
  const regression = linearRegression(xValues, outageValues)

  // Determine trend direction
  let trend: "increasing" | "decreasing" | "stable" = "stable"
  if (Math.abs(regression.slope) > 0.01) {
    trend = regression.slope > 0 ? "increasing" : "decreasing"
  }

  // Seasonality strength
  const seasonalVariance = seasonal.seasonal.reduce((sum, s) => sum + s * s, 0) / seasonal.seasonal.length
  const totalVariance = outageValues.reduce((sum, v) => sum + v * v, 0) / outageValues.length
  const seasonalityStrength = seasonalVariance / totalVariance

  let seasonality: "strong" | "moderate" | "weak" | "none" = "none"
  if (seasonalityStrength > 0.3) seasonality = "strong"
  else if (seasonalityStrength > 0.15) seasonality = "moderate"
  else if (seasonalityStrength > 0.05) seasonality = "weak"

  // Volatility calculation
  const volatility = Math.sqrt(seasonal.residual.reduce((sum, r) => sum + r * r, 0) / seasonal.residual.length)

  // Generate predictions for next 30 days
  const predictions: PredictionData[] = []
  const lastValue = smoothed[smoothed.length - 1]
  const trendComponent = regression.slope

  for (let i = 1; i <= 30; i++) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + i)

    // Base prediction using trend and last smoothed value
    let predictedValue = lastValue + trendComponent * i

    // Add seasonal component
    const seasonalIndex = (dates.length + i - 1) % 7
    const seasonalComponent = seasonal.seasonal[seasonalIndex] || 0
    predictedValue += seasonalComponent

    // Add some noise based on volatility
    const noise = (Math.random() - 0.5) * volatility * 0.5
    predictedValue = Math.max(0, predictedValue + noise)

    // Calculate confidence (decreases with time)
    const confidence = Math.max(0.3, regression.r2 * (1 - i / 60))

    // Determine risk level
    let riskLevel: "Low" | "Medium" | "High" | "Critical" = "Low"
    if (predictedValue > 5) riskLevel = "Critical"
    else if (predictedValue > 3) riskLevel = "High"
    else if (predictedValue > 1.5) riskLevel = "Medium"

    // Identify contributing factors
    const factors: string[] = []
    if (seasonalIndex === 1 || seasonalIndex === 2) factors.push("Monday/Tuesday peak")
    if (trend === "increasing") factors.push("Upward trend")
    if (seasonality === "strong") factors.push("Strong seasonal pattern")
    if (volatility > 1) factors.push("High volatility period")

    predictions.push({
      date: futureDate,
      predictedOutages: Math.round(predictedValue * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      riskLevel,
      factors,
    })
  }

  // Risk factor analysis
  const riskFactors = analyzeRiskFactors(outages)

  // Generate recommendations
  const recommendations = generateRecommendations(trend, seasonality, volatility, riskFactors)

  return {
    predictions,
    trendAnalysis: {
      trend,
      seasonality,
      volatility: Math.round(volatility * 100) / 100,
      cyclicalPattern: seasonality !== "none",
    },
    riskFactors,
    recommendations,
    modelAccuracy: Math.round(regression.r2 * 100) / 100,
  }
}

function prepareDailyOutageData(outages: any[]): Array<{ date: Date; count: number }> {
  const dailyData = new Map<string, number>()

  outages.forEach((outage) => {
    const date = new Date(outage.startDate)
    const dateKey = date.toISOString().split("T")[0]
    dailyData.set(dateKey, (dailyData.get(dateKey) || 0) + 1)
  })

  // Fill in missing dates with 0
  const result: Array<{ date: Date; count: number }> = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 90) // Last 90 days

  for (let i = 0; i < 90; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    const dateKey = currentDate.toISOString().split("T")[0]

    result.push({
      date: currentDate,
      count: dailyData.get(dateKey) || 0,
    })
  }

  return result
}

function analyzeRiskFactors(outages: any[]): Array<{ factor: string; impact: number; confidence: number }> {
  const factors = [
    {
      factor: "High Severity Outages",
      impact: (outages.filter((o) => o.severity === "High").length / outages.length) * 100,
      confidence: 0.9,
    },
    {
      factor: "Production Environment",
      impact: (outages.filter((o) => o.environments.includes("PROD")).length / outages.length) * 100,
      confidence: 0.85,
    },
    {
      factor: "Weekend Deployments",
      impact:
        (outages.filter((o) => {
          const day = new Date(o.startDate).getDay()
          return day === 0 || day === 6
        }).length /
          outages.length) *
        100,
      confidence: 0.7,
    },
    {
      factor: "External Dependencies",
      impact: (outages.filter((o) => o.outageType === "External").length / outages.length) * 100,
      confidence: 0.8,
    },
    {
      factor: "Long Duration Outages",
      impact:
        (outages.filter((o) => {
          const duration = (new Date(o.endDate).getTime() - new Date(o.startDate).getTime()) / (1000 * 60 * 60)
          return duration > 4
        }).length /
          outages.length) *
        100,
      confidence: 0.75,
    },
  ]

  return factors.map((f) => ({
    ...f,
    impact: Math.round(f.impact * 10) / 10,
    confidence: Math.round(f.confidence * 100) / 100,
  }))
}

function generateRecommendations(
  trend: string,
  seasonality: string,
  volatility: number,
  riskFactors: Array<{ factor: string; impact: number; confidence: number }>,
): string[] {
  const recommendations: string[] = []

  if (trend === "increasing") {
    recommendations.push("📈 Increasing trend detected - Consider implementing additional preventive measures")
    recommendations.push("🔍 Review recent changes that may be contributing to the upward trend")
  }

  if (seasonality === "strong") {
    recommendations.push("📅 Strong seasonal patterns identified - Plan resources accordingly for peak periods")
    recommendations.push("⏰ Consider scheduling maintenance during low-activity periods")
  }

  if (volatility > 1.5) {
    recommendations.push("⚠️ High volatility detected - Implement more robust monitoring and alerting")
    recommendations.push("🛡️ Consider chaos engineering practices to improve system resilience")
  }

  const highImpactFactors = riskFactors.filter((f) => f.impact > 30)
  highImpactFactors.forEach((factor) => {
    switch (factor.factor) {
      case "High Severity Outages":
        recommendations.push("🚨 Focus on reducing high-severity incidents through better testing and validation")
        break
      case "Production Environment":
        recommendations.push("🏭 Implement blue-green deployments and better production safeguards")
        break
      case "Weekend Deployments":
        recommendations.push("📅 Avoid weekend deployments or ensure adequate staffing during off-hours")
        break
      case "External Dependencies":
        recommendations.push("🔗 Implement circuit breakers and fallback mechanisms for external dependencies")
        break
      case "Long Duration Outages":
        recommendations.push("⚡ Improve incident response procedures and automation for faster recovery")
        break
    }
  })

  if (recommendations.length === 0) {
    recommendations.push("✅ System appears stable - Continue current practices and monitor for changes")
    recommendations.push("📊 Consider implementing predictive maintenance based on usage patterns")
  }

  return recommendations
}

// Anomaly detection using statistical methods
export function detectAnomalies(data: number[], threshold = 2): number[] {
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  const stdDev = Math.sqrt(variance)

  return data
    .map((value, index) => {
      const zScore = Math.abs(value - mean) / stdDev
      return zScore > threshold ? index : -1
    })
    .filter((index) => index !== -1)
}

// Confidence interval calculation
export function calculateConfidenceInterval(
  predictions: number[],
  confidence = 0.95,
): Array<{ lower: number; upper: number }> {
  const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length
  const variance = predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length
  const stdDev = Math.sqrt(variance)

  // Using normal distribution approximation
  const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.64
  const margin = zScore * stdDev

  return predictions.map((pred) => ({
    lower: Math.max(0, pred - margin),
    upper: pred + margin,
  }))
}
