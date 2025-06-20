// Ensure we can use fs & other Node APIs
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getOutages, createOutage } from "@/actions/data-actions"

export async function GET() {
  const data = await getOutages()
  return NextResponse.json(data)
}

/* You can POST new outages from the browser, too */
export async function POST(request: Request) {
  const body = await request.json()
  const { success, outage, message } = await createOutage(body)
  return NextResponse.json({ success, outage, message })
}
