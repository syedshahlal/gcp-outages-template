import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (!type || !["environments", "teams"].includes(type)) {
      return NextResponse.json({ error: "Invalid config type" }, { status: 400 })
    }

    const configPath = join(process.cwd(), "data", `${type}.json`)

    // Check if file exists, if not return default empty structure
    if (!existsSync(configPath)) {
      const defaultConfig = type === "environments" ? { environments: [] } : { teams: [] }
      return NextResponse.json(defaultConfig)
    }

    const data = await readFile(configPath, "utf8")
    const config = JSON.parse(data)

    return NextResponse.json(config)
  } catch (error) {
    console.error(`Error reading ${type} config:`, error)

    // Return fallback data
    const fallbackConfig =
      type === "environments"
        ? {
            environments: [
              { id: "poc", name: "POC", color: "bg-blue-500", description: "Proof of Concept Environment" },
              { id: "sbx-dev", name: "SBX DEV", color: "bg-green-500", description: "Sandbox Development Environment" },
              {
                id: "sbx-uat",
                name: "SBX UAT",
                color: "bg-yellow-500",
                description: "Sandbox User Acceptance Testing Environment",
              },
              { id: "sbx-beta", name: "SBX Beta", color: "bg-orange-500", description: "Sandbox Beta Environment" },
              { id: "prod", name: "PROD", color: "bg-red-500", description: "Production Environment" },
            ],
          }
        : {
            teams: [
              {
                id: "infrastructure",
                name: "Infrastructure Team",
                email: "infrastructure@company.com",
                description: "Manages core infrastructure and platform services",
              },
              {
                id: "gcp-l2-l3",
                name: "GCP L2 L3 Team",
                email: "gcp-support@company.com",
                description: "Google Cloud Platform Level 2 and Level 3 support",
              },
              {
                id: "tableau",
                name: "Tableau Team",
                email: "tableau@company.com",
                description: "Business Intelligence and Analytics platform team",
              },
              {
                id: "epas",
                name: "EPAS Team",
                email: "epas@company.com",
                description: "Enterprise PostgreSQL Advanced Server team",
              },
              { id: "em", name: "EM Team", email: "em@company.com", description: "Engineering Management team" },
              {
                id: "horizon",
                name: "Horizon Team",
                email: "horizon@company.com",
                description: "Horizon platform and services team",
              },
            ],
          }

    return NextResponse.json(fallbackConfig)
  }
}
