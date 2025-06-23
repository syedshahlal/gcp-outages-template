"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import * as XLSX from "xlsx"

/* -------------------------------------------------------------------------- */
/*                            PATH / HELPERS                                  */
/* -------------------------------------------------------------------------- */

const DATA_PATH = join(process.cwd(), "data")
const JSON_FILE = join(DATA_PATH, "outages.json")
const EXCEL_FILE = join(DATA_PATH, "outages.xlsx")

async function ensureDataDir() {
  if (!existsSync(DATA_PATH)) {
    await mkdir(DATA_PATH, { recursive: true })
  }
}

/* -------------------------------------------------------------------------- */
/*                                TYPES                                       */
/* -------------------------------------------------------------------------- */

export interface OutageData {
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  severity: "High" | "Medium" | "Low"
  priority?: number
  category?: string
  contactEmail?: string
  estimatedUsers?: number
  outageType: "Internal" | "External"
  timezone?: string
}

export interface StoredOutage extends OutageData {
  id: number
  status: string
  type: string
  createdAt: Date
  updatedAt: Date
}

/* -------------------------------------------------------------------------- */
/*                          READ HELPERS (JSON / XLSX)                        */
/* -------------------------------------------------------------------------- */

async function readJSON(): Promise<StoredOutage[]> {
  await ensureDataDir()
  if (!existsSync(JSON_FILE)) {
    // Create empty outages.json if it doesn't exist
    const emptyData = { outages: [] }
    await writeFile(JSON_FILE, JSON.stringify(emptyData, null, 2))
    return []
  }

  try {
    const data = await readFile(JSON_FILE, "utf8")
    const parsed = JSON.parse(data)

    // Handle both formats: { outages: [...] } and [...]
    const outages = Array.isArray(parsed) ? parsed : parsed.outages || []

    return outages.map((o: any) => ({
      ...o,
      startDate: new Date(o.startDate),
      endDate: new Date(o.endDate),
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
      outageType: o.outageType || "Internal",
      timezone: o.timezone || "UTC",
    }))
  } catch (error) {
    console.error("Error reading outages.json:", error)
    return []
  }
}

async function readExcel(): Promise<StoredOutage[]> {
  await ensureDataDir()
  if (!existsSync(EXCEL_FILE)) return []

  try {
    const buf = await readFile(EXCEL_FILE)
    const workbook = XLSX.read(buf, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) return []

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

    return rows.map((row) => ({
      id: Number(row.ID) || 0,
      title: row.Title || "",
      startDate: new Date(row.StartDate),
      endDate: new Date(row.EndDate),
      environments: String(row.Environments || "")
        .split(",")
        .filter(Boolean),
      affectedModels: row.AffectedModels || "",
      reason: row.Reason || "",
      detailedImpact: String(row.DetailedImpact || "")
        .split("|")
        .filter(Boolean),
      assignee: row.Assignee || "",
      severity: (row.Severity || "Low") as "High" | "Medium" | "Low",
      priority: Number(row.Priority) || 1,
      category: row.Category || "",
      contactEmail: row.ContactEmail || "",
      estimatedUsers: Number(row.EstimatedUsers) || 0,
      outageType: (row.OutageType || "Internal") as "Internal" | "External",
      timezone: row.Timezone || "UTC",
      status: row.Status || "Scheduled",
      type: row.Type || "Planned",
      createdAt: new Date(row.CreatedAt || Date.now()),
      updatedAt: new Date(row.UpdatedAt || Date.now()),
    }))
  } catch (error) {
    console.error("Error reading Excel file:", error)
    return []
  }
}

/* -------------------------------------------------------------------------- */
/*                             WRITE HELPERS                                  */
/* -------------------------------------------------------------------------- */

async function writeBoth(outages: StoredOutage[]) {
  await ensureDataDir()

  // Sort outages by start date (earliest first) before writing
  const sortedOutages = [...outages].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  try {
    /* ---------- JSON ---------- */
    const jsonData = {
      outages: sortedOutages,
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalCount: sortedOutages.length,
        version: "1.0",
      },
    }
    await writeFile(JSON_FILE, JSON.stringify(jsonData, null, 2))
    console.log(`Successfully wrote ${sortedOutages.length} outages to JSON`)

    /* ---------- XLSX ---------- */
    const excelRows = sortedOutages.map((o) => ({
      ID: o.id,
      Title: o.title,
      StartDate: o.startDate.toISOString(),
      EndDate: o.endDate.toISOString(),
      Environments: o.environments.join(","),
      AffectedModels: o.affectedModels,
      Reason: o.reason,
      DetailedImpact: o.detailedImpact.join("|"),
      Assignee: o.assignee,
      Severity: o.severity,
      Priority: o.priority ?? 1,
      Category: o.category ?? "",
      ContactEmail: o.contactEmail ?? "",
      EstimatedUsers: o.estimatedUsers ?? 0,
      OutageType: o.outageType,
      Timezone: o.timezone ?? "UTC",
      Status: o.status,
      Type: o.type,
      CreatedAt: o.createdAt.toISOString(),
      UpdatedAt: o.updatedAt.toISOString(),
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Outages")
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    await writeFile(EXCEL_FILE, buf)
    console.log(`Successfully wrote ${sortedOutages.length} outages to Excel`)
  } catch (error) {
    console.error("Error writing outage data:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function getOutages(): Promise<StoredOutage[]> {
  try {
    const json = await readJSON()
    if (json.length) {
      // Sort by start date (earliest first) for consistent ordering
      return json.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    }

    const xlsx = await readExcel()
    return xlsx.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  } catch (error) {
    console.error("Error getting outages:", error)
    return []
  }
}

export async function createOutage(data: OutageData) {
  try {
    const existing = await getOutages()
    const nextId = existing.length ? Math.max(...existing.map((o) => o.id)) + 1 : 1

    const newOutage: StoredOutage = {
      ...data,
      id: nextId,
      status: "Scheduled",
      type: "Planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const all = [newOutage, ...existing]
    await writeBoth(all)

    revalidateTag("outages")
    revalidatePath("/")

    console.log(`Created outage with ID ${nextId}: ${newOutage.title}`)

    return {
      success: true,
      outage: newOutage,
      message: `Outage "${newOutage.title}" created (ID #${newOutage.id})`,
    }
  } catch (error) {
    console.error("Error creating outage:", error)
    return {
      success: false,
      error: error.message,
      message: "Failed to create outage",
    }
  }
}

export async function createMultipleOutages(rows: OutageData[]) {
  try {
    const existing = await getOutages()
    let nextId = existing.length ? Math.max(...existing.map((o) => o.id)) + 1 : 1

    const newOutages: StoredOutage[] = rows.map((r) => ({
      ...r,
      id: nextId++,
      status: "Scheduled",
      type: "Planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    await writeBoth([...newOutages, ...existing])

    revalidateTag("outages")
    revalidatePath("/")

    console.log(`Created ${newOutages.length} outages`)

    return {
      success: true,
      outages: newOutages,
      message: `${newOutages.length} outage${newOutages.length > 1 ? "s" : ""} created`,
    }
  } catch (error) {
    console.error("Error creating multiple outages:", error)
    return {
      success: false,
      error: error.message,
      message: "Failed to create outages",
    }
  }
}

// Enhanced metrics calculation for better accuracy
export async function generateReportData() {
  try {
    const outages = await getOutages()
    const now = new Date()

    // Calculate comprehensive metrics
    const totalOutages = outages.length
    const upcomingOutages = outages.filter((o) => o.startDate > now)
    const pastOutages = outages.filter((o) => o.endDate < now)
    const ongoingOutages = outages.filter((o) => o.startDate <= now && o.endDate >= now)

    const severityBreakdown = {
      High: outages.filter((o) => o.severity === "High").length,
      Medium: outages.filter((o) => o.severity === "Medium").length,
      Low: outages.filter((o) => o.severity === "Low").length,
    }

    const typeBreakdown = {
      Internal: outages.filter((o) => o.outageType === "Internal").length,
      External: outages.filter((o) => o.outageType === "External").length,
    }

    const environmentImpact = outages.reduce(
      (acc, outage) => {
        outage.environments.forEach((env) => {
          acc[env] = (acc[env] || 0) + 1
        })
        return acc
      },
      {} as Record<string, number>,
    )

    // Enhanced duration calculations with timezone awareness
    const totalDowntime = outages.reduce((acc, outage) => {
      const duration = (outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)
      return acc + Math.max(0, duration) // Ensure no negative durations
    }, 0)

    const averageDowntime = totalOutages > 0 ? totalDowntime / totalOutages : 0

    const totalUsersAffected = outages.reduce((acc, outage) => acc + (outage.estimatedUsers || 0), 0)

    // New enhanced metrics
    const completionRate = (pastOutages.length / Math.max(1, totalOutages)) * 100
    const criticalOutages = outages.filter((o) => o.severity === "High").length
    const upcomingCritical = upcomingOutages.filter((o) => o.severity === "High").length

    // Monthly trend data
    const monthlyData = getMonthlyTrends(outages)

    // Team workload analysis
    const teamWorkload = getTeamWorkloadAnalysis(outages)

    return {
      summary: {
        totalOutages,
        upcomingOutages: upcomingOutages.length,
        pastOutages: pastOutages.length,
        ongoingOutages: ongoingOutages.length,
        totalDowntime: Math.round(totalDowntime * 10) / 10,
        averageDowntime: Math.round(averageDowntime * 10) / 10,
        totalUsersAffected,
        completionRate: Math.round(completionRate * 10) / 10,
        criticalOutages,
        upcomingCritical,
      },
      breakdowns: {
        severity: severityBreakdown,
        type: typeBreakdown,
        environment: environmentImpact,
      },
      trends: {
        monthly: monthlyData,
        teamWorkload,
      },
      recentOutages: outages.slice(-10).reverse(),
      upcomingOutages: upcomingOutages.slice(0, 10),
      insights: generateInsights(outages, now),
    }
  } catch (error) {
    console.error("Error generating report data:", error)
    return {
      summary: {
        totalOutages: 0,
        upcomingOutages: 0,
        pastOutages: 0,
        ongoingOutages: 0,
        totalDowntime: 0,
        averageDowntime: 0,
        totalUsersAffected: 0,
        completionRate: 0,
        criticalOutages: 0,
        upcomingCritical: 0,
      },
      breakdowns: {
        severity: { High: 0, Medium: 0, Low: 0 },
        type: { Internal: 0, External: 0 },
        environment: {},
      },
      trends: {
        monthly: [],
        teamWorkload: [],
      },
      recentOutages: [],
      upcomingOutages: [],
      insights: [],
    }
  }
}

// Helper function for monthly trends
function getMonthlyTrends(outages: StoredOutage[]) {
  const monthlyMap = new Map<string, { total: number; high: number; medium: number; low: number }>()

  outages.forEach((outage) => {
    const monthKey = outage.startDate.toISOString().substring(0, 7) // YYYY-MM
    const existing = monthlyMap.get(monthKey) || { total: 0, high: 0, medium: 0, low: 0 }

    existing.total++
    existing[outage.severity.toLowerCase() as keyof typeof existing]++

    monthlyMap.set(monthKey, existing)
  })

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      ...data,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// Helper function for team workload analysis
function getTeamWorkloadAnalysis(outages: StoredOutage[]) {
  const teamMap = new Map<string, { total: number; upcoming: number; ongoing: number }>()
  const now = new Date()

  outages.forEach((outage) => {
    const teams = outage.assignee
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const isUpcoming = outage.startDate > now
    const isOngoing = outage.startDate <= now && outage.endDate >= now

    teams.forEach((team) => {
      const existing = teamMap.get(team) || { total: 0, upcoming: 0, ongoing: 0 }
      existing.total++
      if (isUpcoming) existing.upcoming++
      if (isOngoing) existing.ongoing++
      teamMap.set(team, existing)
    })
  })

  return Array.from(teamMap.entries())
    .map(([team, data]) => ({
      team,
      ...data,
    }))
    .sort((a, b) => b.total - a.total)
}

// Helper function for generating insights
function generateInsights(outages: StoredOutage[], now: Date) {
  const insights = []

  // High severity upcoming outages
  const upcomingHigh = outages.filter((o) => o.startDate > now && o.severity === "High")
  if (upcomingHigh.length > 0) {
    insights.push({
      type: "warning",
      title: "Critical Outages Scheduled",
      message: `${upcomingHigh.length} high-severity outage(s) scheduled in the coming period`,
      priority: "high",
    })
  }

  // Environment impact analysis
  const envImpact = outages.reduce(
    (acc, outage) => {
      outage.environments.forEach((env) => {
        acc[env] = (acc[env] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>,
  )

  const mostImpactedEnv = Object.entries(envImpact).sort(([, a], [, b]) => b - a)[0]
  if (mostImpactedEnv && mostImpactedEnv[1] > 3) {
    insights.push({
      type: "info",
      title: "Environment Impact",
      message: `${mostImpactedEnv[0]} has the most scheduled outages (${mostImpactedEnv[1]})`,
      priority: "medium",
    })
  }

  return insights
}
