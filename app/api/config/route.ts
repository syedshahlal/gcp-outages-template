import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export const runtime = "nodejs"

const DATA_PATH = join(process.cwd(), "data")

// Helper function to read JSON files safely
async function readJSONFile(filename: string) {
  const filePath = join(DATA_PATH, filename)

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    return null
  }

  try {
    const data = await readFile(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return null
  }
}

// GET handler for fetching configuration data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    console.log(`API: Fetching config for type: ${type}`)

    switch (type) {
      case "environments": {
        const data = await readJSONFile("environments.json")
        if (!data) {
          return NextResponse.json({ error: "Environments data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.environments?.length || 0} environments`)
        return NextResponse.json(data)
      }

      case "teams": {
        const data = await readJSONFile("teams.json")
        if (!data) {
          return NextResponse.json({ error: "Teams data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.teams?.length || 0} teams`)
        return NextResponse.json(data)
      }

      case "categories": {
        const data = await readJSONFile("categories.json")
        if (!data) {
          return NextResponse.json({ error: "Categories data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.categories?.length || 0} categories`)
        return NextResponse.json(data)
      }

      case "severities": {
        const data = await readJSONFile("severities.json")
        if (!data) {
          return NextResponse.json({ error: "Severities data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.severities?.length || 0} severities`)
        return NextResponse.json(data)
      }

      case "outage-types": {
        const data = await readJSONFile("outage-types.json")
        if (!data) {
          return NextResponse.json({ error: "Outage types data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.outageTypes?.length || 0} outage types`)
        return NextResponse.json(data)
      }

      case "timezones": {
        const data = await readJSONFile("timezones.json")
        if (!data) {
          return NextResponse.json({ error: "Timezones data not found" }, { status: 404 })
        }
        console.log(`API: Returning ${data.timezones?.length || 0} timezones`)
        return NextResponse.json(data)
      }

      case "all": {
        // Fetch all configuration data at once
        const [environments, teams, categories, severities, outageTypes, timezones] = await Promise.all([
          readJSONFile("environments.json"),
          readJSONFile("teams.json"),
          readJSONFile("categories.json"),
          readJSONFile("severities.json"),
          readJSONFile("outage-types.json"),
          readJSONFile("timezones.json"),
        ])

        const allConfig = {
          environments: environments?.environments || [],
          teams: teams?.teams || [],
          categories: categories?.categories || [],
          severities: severities?.severities || [],
          outageTypes: outageTypes?.outageTypes || [],
          timezones: timezones?.timezones || [],
        }

        console.log("API: Returning all configuration data")
        return NextResponse.json(allConfig)
      }

      default: {
        return NextResponse.json(
          {
            error:
              "Invalid type parameter. Use: environments, teams, categories, severities, outage-types, timezones, or all",
          },
          { status: 400 },
        )
      }
    }
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

// POST handler for updating configuration data (optional)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const body = await request.json()

    // This would allow updating configuration data
    // Implementation depends on your requirements

    return NextResponse.json({ message: "Configuration update not implemented yet" }, { status: 501 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
