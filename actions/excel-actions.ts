"use server"

import * as XLSX from "xlsx"
import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

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
}

interface StoredOutage extends OutageData {
  id: number
  status: string
  type: string
  createdAt: Date
}

const DATA_PATH = join(process.cwd(), "data")
const EXCEL_FILE = join(DATA_PATH, "outages.xlsx")

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_PATH)) {
    await mkdir(DATA_PATH, { recursive: true })
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
      severity: row.Severity || "Low",
      status: row.Status || "Not Started",
      type: row.Type || "Planned",
      createdAt: new Date(row.CreatedAt || new Date()),
    })) as StoredOutage[]
  } catch (error) {
    console.error("Error reading outages from Excel:", error)
    return []
  }
}

// Write outages to Excel
async function writeOutagesToExcel(outages: StoredOutage[]) {
  try {
    await ensureDataDir()

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
      Status: outage.status,
      Type: outage.type,
      CreatedAt: outage.createdAt.toISOString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outages")

    // Write to buffer then to file
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    await writeFile(EXCEL_FILE, buffer)
  } catch (error) {
    console.error("Error writing outages to Excel:", error)
    throw new Error("Failed to save outage data to Excel")
  }
}

export async function createOutage(outageData: OutageData) {
  try {
    const existingOutages = await readOutagesFromExcel()

    const newOutage: StoredOutage = {
      ...outageData,
      id: existingOutages.length > 0 ? Math.max(...existingOutages.map((o) => o.id)) + 1 : 1,
      status: "Not Started",
      type: "Planned",
      createdAt: new Date(),
    }

    const updatedOutages = [...existingOutages, newOutage]
    await writeOutagesToExcel(updatedOutages)

    return { success: true, outage: newOutage }
  } catch (error) {
    console.error("Error creating outage:", error)
    throw new Error("Failed to create outage")
  }
}

export async function getOutages(): Promise<StoredOutage[]> {
  return await readOutagesFromExcel()
}

export async function updateOutage(id: number, updates: Partial<OutageData>) {
  try {
    const existingOutages = await readOutagesFromExcel()
    const outageIndex = existingOutages.findIndex((o) => o.id === id)

    if (outageIndex === -1) {
      throw new Error("Outage not found")
    }

    existingOutages[outageIndex] = {
      ...existingOutages[outageIndex],
      ...updates,
    }

    await writeOutagesToExcel(existingOutages)
    return { success: true, outage: existingOutages[outageIndex] }
  } catch (error) {
    console.error("Error updating outage:", error)
    throw new Error("Failed to update outage")
  }
}

export async function deleteOutage(id: number) {
  try {
    const existingOutages = await readOutagesFromExcel()
    const filteredOutages = existingOutages.filter((o) => o.id !== id)

    if (filteredOutages.length === existingOutages.length) {
      throw new Error("Outage not found")
    }

    await writeOutagesToExcel(filteredOutages)
    return { success: true }
  } catch (error) {
    console.error("Error deleting outage:", error)
    throw new Error("Failed to delete outage")
  }
}
