"use server"

import * as XLSX from "xlsx"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { revalidatePath, revalidateTag } from "next/cache"

interface OutageData {
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
}

interface StoredOutage extends OutageData {
  id: number
  status: string
  type: string
  createdAt: Date
  updatedAt: Date
}

const DATA_PATH = join(process.cwd(), "data")
const JSON_FILE = join(DATA_PATH, "outages.json")
const EXCEL_FILE = join(DATA_PATH, "outages.xlsx")

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_PATH)) {
    await mkdir(DATA_PATH, { recursive: true })
  }
}

// Read existing outages from JSON
async function readOutagesFromJSON(): Promise<StoredOutage[]> {
  try {
    await ensureDataDir()
    if (!existsSync(JSON_FILE)) {
      return []
    }

    const data = await readFile(JSON_FILE, "utf-8")
    const outages = JSON.parse(data)

    return outages.map((outage: any) => ({
      ...outage,
      startDate: new Date(outage.startDate),
      endDate: new Date(outage.endDate),
      createdAt: new Date(outage.createdAt),
      updatedAt: new Date(outage.updatedAt),
    }))
  } catch (error) {
    console.error("Error reading outages from JSON:", error)
    return []
  }
}

// Read existing outages from Excel
async function readOutagesFromExcel(): Promise<StoredOutage[]> {
  try {
    await ensureDataDir()
    if (!existsSync(EXCEL_FILE)) {
      return []
    }

    const fileBuffer = await readFile(EXCEL_FILE)
    const workbook = XLSX.read(fileBuffer, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!worksheet) {
      return []
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return jsonData.map((row: any) => ({
      id: row.ID || 0,
      title: row.Title || "",
      startDate: new Date(row.StartDate || new Date()),
      endDate: new Date(row.EndDate || new Date()),
      environments: row.Environments ? row.Environments.split(",") : [],
      affectedModels: row.AffectedModels || "",
      reason: row.Reason || "",
      detailedImpact: row.DetailedImpact ? row.DetailedImpact.split("|") : [],
      assignee: row.Assignee || "",
      severity: (row.Severity as "High" | "Medium" | "Low") || "Low",
      priority: row.Priority || 1,
      category: row.Category || "",
      contactEmail: row.ContactEmail || "",
      estimatedUsers: row.EstimatedUsers || 0,
      status: row.Status || "Scheduled",
      type: row.Type || "Planned",
      createdAt: new Date(row.CreatedAt || new Date()),
      updatedAt: new Date(row.UpdatedAt || new Date()),
    })) as StoredOutage[]
  } catch (error) {
    console.error("Error reading outages from Excel:", error)
    return []
  }
}

// Write outages to both JSON and Excel
async function writeOutagesToBothFormats(outages: StoredOutage[]) {
  try {
    await ensureDataDir()

    // Write to JSON
    await writeFile(JSON_FILE, JSON.stringify(outages, null, 2))

    // Write to Excel
    const excelData = outages.map((outage) => ({
      ID: outage.id,
      Title: outage.title,
      StartDate: outage.startDate.toISOString(),
      EndDate: outage.endDate.toISOString(),
      Environments: outage.environments.join(","),
      AffectedModels: outage.affectedModels,
      Reason: outage.reason,
      DetailedImpact: outage.detailedImpact.join("|"),
      Assignee: outage.assignee,
      Severity: outage.severity,
      Priority: outage.priority || 1,
      Category: outage.category || "",
      ContactEmail: outage.contactEmail || "",
      EstimatedUsers: outage.estimatedUsers || 0,
      Status: outage.status,
      Type: outage.type,
      CreatedAt: outage.createdAt.toISOString(),
      UpdatedAt: outage.updatedAt.toISOString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outages")

    // Write to buffer then to file
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    await writeFile(EXCEL_FILE, buffer)
  } catch (error) {
    console.error("Error writing outages to files:", error)
    throw new Error("Failed to save outage data")
  }
}

// Get outages (prioritize JSON, fallback to Excel)
export async function getOutages(): Promise<StoredOutage[]> {
  const jsonOutages = await readOutagesFromJSON()
  if (jsonOutages.length > 0) {
    return jsonOutages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  const excelOutages = await readOutagesFromExcel()
  return excelOutages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Create single outage
export async function createOutage(outageData: OutageData) {
  try {
    const existingOutages = await getOutages()

    const newOutage: StoredOutage = {
      ...outageData,
      id: existingOutages.length > 0 ? Math.max(...existingOutages.map((o) => o.id)) + 1 : 1,
      status: "Scheduled",
      type: "Planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedOutages = [newOutage, ...existingOutages]
    await writeOutagesToBothFormats(updatedOutages)

    revalidateTag("outages")
    revalidatePath("/")

    return {
      success: true,
      outage: newOutage,
      message: `Outage "${newOutage.title}" has been successfully created with ID #${newOutage.id}`,
    }
  } catch (error) {
    console.error("Error creating outage:", error)
    throw error instanceof Error ? error : new Error("Failed to create outage")
  }
}

// Create multiple outages
export async function createMultipleOutages(outagesData: OutageData[]) {
  try {
    const existingOutages = await getOutages()
    let nextId = existingOutages.length > 0 ? Math.max(...existingOutages.map((o) => o.id)) + 1 : 1

    const newOutages: StoredOutage[] = outagesData.map((outageData) => ({
      ...outageData,
      id: nextId++,
      status: "Scheduled",
      type: "Planned",
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const updatedOutages = [...newOutages, ...existingOutages]
    await writeOutagesToBothFormats(updatedOutages)

    revalidateTag("outages")
    revalidatePath("/")

    return {
      success: true,
      outages: newOutages,
      message: `${newOutages.length} outages have been successfully created`,
    }
  } catch (error) {
    console.error("Error creating multiple outages:", error)
    throw error instanceof Error ? error : new Error("Failed to create multiple outages")
  }
}

// Parse Excel file for bulk upload
export async function parseExcelFile(fileBuffer: ArrayBuffer): Promise<OutageData[]> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "array" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!worksheet) {
      throw new Error("No worksheet found in Excel file")
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return jsonData.map((row: any) => ({
      title: row.Title || row.title || "",
      startDate: new Date(row.StartDate || row.startDate || new Date()),
      endDate: new Date(row.EndDate || row.endDate || new Date()),
      environments: row.Environments ? row.Environments.split(",") : [],
      affectedModels: row.AffectedModels || row.affectedModels || "",
      reason: row.Reason || row.reason || "",
      detailedImpact: row.DetailedImpact ? row.DetailedImpact.split("|") : [],
      assignee: row.Assignee || row.assignee || "",
      severity: (row.Severity || row.severity || "Low") as "High" | "Medium" | "Low",
      priority: Number(row.Priority || row.priority) || 1,
      category: row.Category || row.category || "",
      contactEmail: row.ContactEmail || row.contactEmail || "",
      estimatedUsers: Number(row.EstimatedUsers || row.estimatedUsers) || 0,
    }))
  } catch (error) {
    console.error("Error parsing Excel file:", error)
    throw new Error("Failed to parse Excel file")
  }
}
