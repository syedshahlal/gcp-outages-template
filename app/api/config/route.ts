import { NextResponse } from "next/server"
import environmentsJson from "../../../data/environments.json"
import teamsJson from "../../../data/teams.json"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "environments") {
    // handle both `{ environments: [...] }` and `[...]`
    const list = Array.isArray(environmentsJson) ? environmentsJson : (environmentsJson.environments ?? [])
    return NextResponse.json({ environments: list })
  }

  if (type === "teams") {
    const list = Array.isArray(teamsJson) ? teamsJson : (teamsJson.teams ?? [])
    return NextResponse.json({ teams: list })
  }

  return NextResponse.json({ error: "Invalid config type (use ?type=environments|teams)" }, { status: 400 })
}
