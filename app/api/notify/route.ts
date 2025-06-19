import { NextResponse } from "next/server"
import { sendOutageNotification } from "@/actions/email-actions"

/**
 * POST /api/notify
 *
 * Body: {
 *   recipientEmails: string[],
 *   subject?: string,
 *   message?: string,
 *   dashboardUrl?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Parameters<typeof sendOutageNotification>[0]

    const result = await sendOutageNotification(payload)

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
