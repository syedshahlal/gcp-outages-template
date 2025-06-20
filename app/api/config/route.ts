import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    console.log(`API config called with type: ${type}`)

    if (type === "environments") {
      try {
        const environmentsJson = await import("../../../data/environments.json")
        console.log("Loaded environments JSON:", environmentsJson)

        const list = Array.isArray(environmentsJson.default)
          ? environmentsJson.default
          : (environmentsJson.default?.environments ?? environmentsJson.environments ?? [])

        console.log("Returning environments:", list)
        return NextResponse.json({ environments: list })
      } catch (error) {
        console.error("Error loading environments:", error)
        return NextResponse.json({ error: "Failed to load environments", environments: [] })
      }
    }

    if (type === "teams") {
      try {
        const teamsJson = await import("../../../data/teams.json")
        console.log("Loaded teams JSON:", teamsJson)

        const list = Array.isArray(teamsJson.default)
          ? teamsJson.default
          : (teamsJson.default?.teams ?? teamsJson.teams ?? [])

        console.log("Returning teams:", list)
        return NextResponse.json({ teams: list })
      } catch (error) {
        console.error("Error loading teams:", error)
        return NextResponse.json({ error: "Failed to load teams", teams: [] })
      }
    }

    return NextResponse.json(
      {
        error: "Invalid config type (use ?type=environments|teams)",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("API config error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
