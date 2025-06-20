import { NextResponse } from "next/server"
import { getOutages, createOutage } from "@/actions/data-actions"

export const runtime = "nodejs"

/* ------------------------------  GET handler  ----------------------------- */
export async function GET() {
  try {
    const outages = await getOutages()
    return NextResponse.json({ outages })
  } catch (error) {
    console.error("GET /api/outages error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch outages" }, { status: 500 })
  }
}

/* ------------------------------  POST handler ----------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("Creating outage with data:", body)

    // Basic validation
    const required = ["title", "startDate", "endDate", "severity"]
    const missing = required.filter((k) => !body[k])
    if (missing.length) {
      return NextResponse.json(
        { success: false, message: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 },
      )
    }

    // Transform the data to match the expected format for data-actions
    const outageData = {
      title: body.title,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      environments: Array.isArray(body.environments) ? body.environments : [],
      affectedModels: body.affectedModels || "",
      reason: body.reason || "",
      detailedImpact: Array.isArray(body.detailedImpact) ? body.detailedImpact : [],
      assignee: body.assignee || "",
      severity: body.severity as "High" | "Medium" | "Low",
      priority: body.priority || 1,
      category: body.category || "",
      contactEmail: body.contactEmail || "",
      estimatedUsers: body.estimatedUsers || 0,
      outageType: body.outageType || ("Internal" as "Internal" | "External"),
    }

    console.log("Transformed outage data:", outageData)

    // Use the data action to create and persist the outage
    const result = await createOutage(outageData)

    if (result.success) {
      console.log("Outage created successfully:", result.outage)
      return NextResponse.json({
        success: true,
        outage: result.outage,
        message: result.message,
      })
    } else {
      console.error("Failed to create outage:", result)
      return NextResponse.json({ success: false, message: "Failed to create outage" }, { status: 500 })
    }
  } catch (err) {
    console.error("POST /api/outages error:", err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal error creating outage",
      },
      { status: 500 },
    )
  }
}
