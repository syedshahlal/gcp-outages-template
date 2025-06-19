"use server"

import { writeFile, readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { revalidatePath, revalidateTag } from "next/cache"
import { cache } from "react"

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

// Cached data fetching with React 19 cache
export const getOutages = cache(async (): Promise<StoredOutage[]> => {
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
})

// Write outages to JSON with optimistic updates
async function writeOutagesToJSON(outages: StoredOutage[]) {
  try {
    await ensureDataDir()
    await writeFile(JSON_FILE, JSON.stringify(outages, null, 2))
  } catch (error) {
    console.error("Error writing outages to JSON:", error)
    throw new Error("Failed to save outage data")
  }
}

// Create outage with enhanced error handling and validation
export async function createOutage(outageData: OutageData) {
  try {
    // Validation
    if (!outageData.title?.trim()) {
      throw new Error("Title is required")
    }

    if (!outageData.startDate || !outageData.endDate) {
      throw new Error("Start and end dates are required")
    }

    if (outageData.startDate >= outageData.endDate) {
      throw new Error("End date must be after start date")
    }

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

    // Revalidate with tags for more granular cache control
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

// Update outage with optimistic updates
export async function updateOutage(id: number, updates: Partial<OutageData>) {
  try {
    const existingOutages = await getOutages()
    const outageIndex = existingOutages.findIndex((o) => o.id === id)

    if (outageIndex === -1) {
      throw new Error("Outage not found")
    }

    // Validation for updates
    if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
      throw new Error("End date must be after start date")
    }

    existingOutages[outageIndex] = {
      ...existingOutages[outageIndex],
      ...updates,
      updatedAt: new Date(),
    }

    await writeOutagesToJSON(existingOutages)
    revalidateTag("outages")
    revalidatePath("/")

    return { success: true, outage: existingOutages[outageIndex] }
  } catch (error) {
    console.error("Error updating outage:", error)
    throw error instanceof Error ? error : new Error("Failed to update outage")
  }
}

// Delete outage with confirmation
export async function deleteOutage(id: number) {
  try {
    const existingOutages = await getOutages()
    const filteredOutages = existingOutages.filter((o) => o.id !== id)

    if (filteredOutages.length === existingOutages.length) {
      throw new Error("Outage not found")
    }

    await writeOutagesToJSON(filteredOutages)
    revalidateTag("outages")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error deleting outage:", error)
    throw error instanceof Error ? error : new Error("Failed to delete outage")
  }
}

// Batch operations for better performance
export async function batchUpdateOutages(updates: Array<{ id: number; data: Partial<OutageData> }>) {
  try {
    const existingOutages = await getOutages()

    for (const update of updates) {
      const index = existingOutages.findIndex((o) => o.id === update.id)
      if (index !== -1) {
        existingOutages[index] = {
          ...existingOutages[index],
          ...update.data,
          updatedAt: new Date(),
        }
      }
    }

    await writeOutagesToJSON(existingOutages)
    revalidateTag("outages")
    revalidatePath("/")

    return { success: true, updated: updates.length }
  } catch (error) {
    console.error("Error batch updating outages:", error)
    throw error instanceof Error ? error : new Error("Failed to batch update outages")
  }
}
