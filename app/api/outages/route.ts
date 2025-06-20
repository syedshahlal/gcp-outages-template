import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export const runtime = "nodejs"

interface Outage {
  id: string
  title: string
  startDate: string
  endDate: string
  environments: string[]
  affectedModels?: string
  reason?: string
  detailedImpact?: string[]
  assignee?: string
  severity: "High" | "Medium" | "Low"
  createdAt: string
  updatedAt: string
}

export async function GET() {
  try {
    const dataPath = join(process.cwd(), "data", "outages.json")

    if (!existsSync(dataPath)) {
      return NextResponse.json({ outages: [] })
    }

    const data = await readFile(dataPath, "utf8")
    const outages = JSON.parse(data)

    return NextResponse.json({ outages: outages.outages || outages })
  } catch (error) {
    console.error("Error reading outages:", error)
    return NextResponse.json({ outages: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.startDate || !body.endDate || !body.severity) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // Generate unique ID
    const id = `OUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newOutage: Outage = {
      id,
      title: body.title,
      startDate: new Date(body.startDate).toISOString(),
      endDate: new Date(body.endDate).toISOString(),
      environments: body.environments || [],
      affectedModels: body.affectedModels || "",
      reason: body.reason || "",
      detailedImpact: body.detailedImpact || [],
      assignee: body.assignee || "",
      severity: body.severity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Read existing outages
    const dataPath = join(process.cwd(), "data", "outages.json")
    let existingOutages: Outage[] = []

    if (existsSync(dataPath)) {
      try {
        const data = await readFile(dataPath, "utf8")
        const parsed = JSON.parse(data)
        existingOutages = parsed.outages || parsed || []
      } catch (error) {
        console.error("Error reading existing outages:", error)
        existingOutages = []
      }
    }

    // Add new outage
    existingOutages.push(newOutage)

    // Write back to file
    await writeFile(dataPath, JSON.stringify({ outages: existingOutages }, null, 2), "utf8")

    return NextResponse.json({
      success: true,
      message: "Outage created successfully",
      outage: newOutage,
    })
  } catch (error) {
    console.error("Error creating outage:", error)
    return NextResponse.json({ success: false, message: "Failed to create outage" }, { status: 500 })
  }
}
