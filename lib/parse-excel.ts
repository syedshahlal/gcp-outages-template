/**
 * Lightweight, browser-friendly Excel / CSV parser.
 * Accepts an ArrayBuffer plus the file name (to sniff extension)
 * and returns an array of plain JS objects, one per row.
 *
 * The columns it looks for match the template supplied
 * by the multi-outage import feature.
 */
export interface ImportedOutage {
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  assignee: string
  severity: "High" | "Medium" | "Low"
  category?: string
  contactEmail?: string
  estimatedUsers?: number
  outageType?: "Internal" | "External"
  detailedImpact?: string | string[]
}

function parseCSV(text: string): ImportedOutage[] {
  // Very small CSV parser – assumes no commas inside quoted fields.
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  const headers = headerLine.split(",").map((h) => h.trim())

  return lines.filter(Boolean).map((line) => {
    const cols = line.split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || "").replace(/^"|"$/g, "").trim()
    })

    // Convert into the strongly-typed object that the UI expects
    return {
      title: row.Title,
      startDate: new Date(row.StartDate),
      endDate: new Date(row.EndDate),
      environments: row.Environments ? row.Environments.split(/,\s*/) : [],
      affectedModels: row.AffectedModels || "",
      reason: row.Reason || "",
      assignee: row.Assignee || "",
      severity: (row.Severity || "") as ImportedOutage["severity"],
      category: row.Category,
      contactEmail: row.ContactEmail,
      estimatedUsers: row.EstimatedUsers ? Number(row.EstimatedUsers) : undefined,
      outageType: row.OutageType as ImportedOutage["outageType"],
    }
  })
}

export async function parseExcelFile(buffer: ArrayBuffer, fileName: string): Promise<ImportedOutage[]> {
  const ext = fileName.split(".").pop()?.toLowerCase()

  if (ext === "csv") {
    const text = new TextDecoder("utf-8").decode(buffer)
    return parseCSV(text)
  }

  // Excel path – load SheetJS’ browser build on demand
  const XLSX = await import("xlsx/dist/xlsx.full.mjs")
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const ws = workbook.Sheets[sheetName]
  const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

  return json.map((row) => ({
    title: row.Title,
    startDate: new Date(row.StartDate),
    endDate: new Date(row.EndDate),
    environments: row.Environments ? String(row.Environments).split(/,\s*/) : [],
    affectedModels: row.AffectedModels || "",
    reason: row.Reason || "",
    assignee: row.Assignee || "",
    severity: row.Severity as ImportedOutage["severity"],
    category: row.Category,
    contactEmail: row.ContactEmail,
    estimatedUsers: row.EstimatedUsers ? Number(row.EstimatedUsers) : undefined,
    outageType: row.OutageType as ImportedOutage["outageType"],
    detailedImpact: row.DetailedImpact,
  }))
}
