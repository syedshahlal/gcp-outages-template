"use server"

import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { revalidatePath } from "next/cache"

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

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_PATH)) {
    await mkdir(DATA_PATH, { recursive: true })
  }
}

// Read outages from JSON
export async function getOutages(): Promise<StoredOutage[]> {
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

// Write outages to JSON
async function writeOutagesToJSON(outages: StoredOutage[]) {
  try {
    await ensureDataDir()
    await writeFile(JSON_FILE, JSON.stringify(outages, null, 2))
  } catch (error) {
    console.error("Error writing outages to JSON:", error)
    throw new Error("Failed to save outage data")
  }
}

// Create outage
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

    const updatedOutages = [...existingOutages, newOutage]
    await writeOutagesToJSON(updatedOutages)

    // Revalidate the dashboard to trigger real-time updates
    revalidatePath("/")

    return {
      success: true,
      outage: newOutage,
      message: `Outage "${newOutage.title}" has been successfully created with ID #${newOutage.id}`,
    }
  } catch (error) {
    console.error("Error creating outage:", error)
    throw new Error("Failed to create outage")
  }
}

// Update outage
export async function updateOutage(id: number, updates: Partial<OutageData>) {
  try {
    const existingOutages = await getOutages()
    const outageIndex = existingOutages.findIndex((o) => o.id === id)

    if (outageIndex === -1) {
      throw new Error("Outage not found")
    }

    existingOutages[outageIndex] = {
      ...existingOutages[outageIndex],
      ...updates,
      updatedAt: new Date(),
    }

    await writeOutagesToJSON(existingOutages)
    revalidatePath("/")

    return { success: true, outage: existingOutages[outageIndex] }
  } catch (error) {
    console.error("Error updating outage:", error)
    throw new Error("Failed to update outage")
  }
}

// Delete outage
export async function deleteOutage(id: number) {
  try {
    const existingOutages = await getOutages()
    const filteredOutages = existingOutages.filter((o) => o.id !== id)

    if (filteredOutages.length === existingOutages.length) {
      throw new Error("Outage not found")
    }

    await writeOutagesToJSON(filteredOutages)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error deleting outage:", error)
    throw new Error("Failed to delete outage")
  }
}
