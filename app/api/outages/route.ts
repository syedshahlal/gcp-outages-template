import { NextResponse } from "next/server"

export const runtime = "nodejs"

/* -------------------------------------------------------------------------- */
/*  In-memory store — survives hot reloads during the preview session only.   */
/* -------------------------------------------------------------------------- */
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

/* eslint-disable no-var */
var outages: Outage[] = globalThis.__OUTAGES__ ?? []
globalThis.__OUTAGES__ = outages
/* eslint-enable  no-var */

function generateId() {
  return `OUT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
}

/* ------------------------------  GET handler  ----------------------------- */
export async function GET() {
  return NextResponse.json({ outages })
}

/* ------------------------------  POST handler ----------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Basic validation
    const required = ["title", "startDate", "endDate", "severity"]
    const missing = required.filter((k) => !body[k])
    if (missing.length) {
      return NextResponse.json(
        { success: false, message: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 },
      )
    }

    const outage: Outage = {
      id: generateId(),
      title: body.title,
      startDate: new Date(body.startDate).toISOString(),
      endDate: new Date(body.endDate).toISOString(),
      environments: body.environments ?? [],
      affectedModels: body.affectedModels ?? "",
      reason: body.reason ?? "",
      detailedImpact: body.detailedImpact ?? [],
      assignee: body.assignee ?? "",
      severity: body.severity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    outages.push(outage)

    return NextResponse.json({ success: true, outage, message: "Outage created" })
  } catch (err) {
    console.error("POST /api/outages error:", err)
    return NextResponse.json({ success: false, message: "Internal error creating outage" }, { status: 500 })
  }
}
