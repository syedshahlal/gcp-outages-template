import { NextResponse } from "next/server"
import { getOutages, createOutage, createMultipleOutages, type OutageData } from "../../../actions/data-actions"

/* -------------------------------------------------------------------------- */
/*                                   GET                                      */
/* -------------------------------------------------------------------------- */
export async function GET() {
  try {
    const outages = await getOutages()
    return NextResponse.json({ outages })
  } catch (error) {
    // In Next.js the FS can be read-only – just fall back to empty array
    console.error("[GET /api/outages] failed – returning empty list:", error)
    return NextResponse.json({ outages: [] })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OutageData | OutageData[]

    // Single vs bulk
    if (Array.isArray(body)) {
      const result = await createMultipleOutages(body)
      return NextResponse.json(result)
    }

    const result = await createOutage(body)
    return NextResponse.json(result)
  } catch (error) {
    // Likely running in a read-only file-system (e.g., preview)
    console.error("[POST /api/outages] failed:", error)
    return NextResponse.json(
      { success: false, message: "Unable to persist outages in this environment." },
      { status: 501 },
    )
  }
}
