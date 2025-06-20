import { NextResponse } from "next/server"
import environments from "../../../data/environments.json"
import teams from "../../../data/teams.json"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "environments") {
    return NextResponse.json({ environments })
  }
  if (type === "teams") {
    return NextResponse.json({ teams })
  }
  return NextResponse.json({ error: "Invalid config type (use ?type=environments|teams)" }, { status: 400 })
}
