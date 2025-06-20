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
  outageType: "Internal" | "External" // New field for categorization
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
  if (!existsSync(JSON_FILE)) return []

  const data = await readFile(JSON_FILE, "utf8")
  const outages: StoredOutage[] = JSON.parse(data)
  return outages.map((o) => ({
    ...o,
    startDate: new Date(o.startDate),
    endDate: new Date(o.endDate),
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
    outageType: o.outageType || "Internal", // Default to Internal for backward compatibility
  }))
}

async function readExcel(): Promise<StoredOutage[]> {
  await ensureDataDir()
  if (!existsSync(EXCEL_FILE)) return []

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
    status: row.Status || "Scheduled",
    type: row.Type || "Planned",
    createdAt: new Date(row.CreatedAt || Date.now()),
    updatedAt: new Date(row.UpdatedAt || Date.now()),
  }))
}

/* -------------------------------------------------------------------------- */
/*                             WRITE HELPERS                                  */
/* -------------------------------------------------------------------------- */

async function writeBoth(outages: StoredOutage[]) {
  await ensureDataDir()

  // Sort outages by start date (earliest first) before writing
  const sortedOutages = [...outages].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  /* ---------- JSON ---------- */
  await writeFile(JSON_FILE, JSON.stringify(sortedOutages, null, 2))

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
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function getOutages(): Promise<StoredOutage[]> {
  const json = await readJSON()
  if (json.length) {
    // Sort by start date (earliest first) for consistent ordering
    return json.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  const xlsx = await readExcel()
  return xlsx.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}

export async function createOutage(data: OutageData) {
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

  return {
    success: true,
    outage: newOutage,
    message: `Outage "${newOutage.title}" created (ID #${newOutage.id})`,
  }
}

export async function createMultipleOutages(rows: OutageData[]) {
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

  return {
    success: true,
    outages: newOutages,
    message: `${newOutages.length} outage${newOutages.length > 1 ? "s" : ""} created`,
  }
}

// New function to generate interactive report data
export async function generateReportData() {
  const outages = await getOutages()
  const now = new Date()

  // Calculate metrics
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

  const totalDowntime = outages.reduce((acc, outage) => {
    const duration = (outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)
    return acc + duration
  }, 0)

  const averageDowntime = totalOutages > 0 ? totalDowntime / totalOutages : 0

  const totalUsersAffected = outages.reduce((acc, outage) => acc + (outage.estimatedUsers || 0), 0)

  return {
    summary: {
      totalOutages,
      upcomingOutages: upcomingOutages.length,
      pastOutages: pastOutages.length,
      ongoingOutages: ongoingOutages.length,
      totalDowntime: Math.round(totalDowntime),
      averageDowntime: Math.round(averageDowntime * 10) / 10,
      totalUsersAffected,
    },
    breakdowns: {
      severity: severityBreakdown,
      type: typeBreakdown,
      environment: environmentImpact,
    },
    recentOutages: outages.slice(-10).reverse(), // Last 10 outages
    upcomingOutages: upcomingOutages.slice(0, 10), // Next 10 outages
  }
}
