import { NextResponse } from "next/server"
import { getOutages } from "../../utils/outages"

export async function GET() {
  try {
    const outages = await getOutages()
    return NextResponse.json({ outages })
  } catch (error) {
    /* ---------- Graceful fallback ---------- */
    console.error("GET /api/outages error:", error)
    /* Even when the file system is readonly (e.g. next-lite preview) we still
       want the dashboard to load, so return an empty array with 200 OK. */
    return NextResponse.json({ outages: [] })
  }
}
