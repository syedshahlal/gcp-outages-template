"use server"

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

const DB_PATH = join(process.cwd(), "data")
const OUTAGES_FILE = join(DB_PATH, "outages.json")

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DB_PATH)) {
    await mkdir(DB_PATH, { recursive: true })
  }
}

// Read existing outages
async function readOutages(): Promise<StoredOutage[]> {
  try {
    await ensureDataDir()
    if (!existsSync(OUTAGES_FILE)) {
      return []
    }
    const data = await readFile(OUTAGES_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading outages:", error)
    return []
  }
}

// Write outages to file
async function writeOutages(outages: StoredOutage[]) {
  try {
    await ensureDataDir()
    await writeFile(OUTAGES_FILE, JSON.stringify(outages, null, 2))
  } catch (error) {
    console.error("Error writing outages:", error)
    throw new Error("Failed to save outage data")
  }
}

export async function createOutage(outageData: OutageData) {
  try {
    const existingOutages = await readOutages()

    const newOutage: StoredOutage = {
      ...outageData,
      id: existingOutages.length > 0 ? Math.max(...existingOutages.map((o) => o.id)) + 1 : 1,
      status: "Not Started",
      type: "Planned",
      createdAt: new Date(),
    }

    const updatedOutages = [...existingOutages, newOutage]
    await writeOutages(updatedOutages)

    return { success: true, outage: newOutage }
  } catch (error) {
    console.error("Error creating outage:", error)
    throw new Error("Failed to create outage")
  }
}

export async function getOutages(): Promise<StoredOutage[]> {
  return await readOutages()
}

export async function updateOutage(id: number, updates: Partial<OutageData>) {
  try {
    const existingOutages = await readOutages()
    const outageIndex = existingOutages.findIndex((o) => o.id === id)

    if (outageIndex === -1) {
      throw new Error("Outage not found")
    }

    existingOutages[outageIndex] = {
      ...existingOutages[outageIndex],
      ...updates,
    }

    await writeOutages(existingOutages)
    return { success: true, outage: existingOutages[outageIndex] }
  } catch (error) {
    console.error("Error updating outage:", error)
    throw new Error("Failed to update outage")
  }
}

export async function deleteOutage(id: number) {
  try {
    const existingOutages = await readOutages()
    const filteredOutages = existingOutages.filter((o) => o.id !== id)

    if (filteredOutages.length === existingOutages.length) {
      throw new Error("Outage not found")
    }

    await writeOutages(filteredOutages)
    return { success: true }
  } catch (error) {
    console.error("Error deleting outage:", error)
    throw new Error("Failed to delete outage")
  }
}
