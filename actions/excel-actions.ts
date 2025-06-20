"use server"

/* ---------- keep parseExcelFile here (unchanged) ---------- */
import * as XLSX from "xlsx"
import type { OutageData } from "./data-actions"
import { createMultipleOutages, getOutages } from "./data-actions"

/* Existing utility: parse Excel buffer into OutageData[] */
export async function parseExcelFile(buffer: ArrayBuffer): Promise<OutageData[]> {
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error("No worksheet found")

  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

  return json.map((row) => {
    const envs = String(row.Environments ?? row.environments ?? "")
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean)

    return {
      title: row.Title || row.title || "",
      startDate: new Date(row.StartDate || row.startDate),
      endDate: new Date(row.EndDate || row.endDate),
      environments: envs,
      affectedModels: row.AffectedModels || row.affectedModels || "",
      reason: row.Reason || row.reason || "",
      detailedImpact: [row.Reason || row.reason || ""],
      assignee: row.Assignee || row.assignee || "",
      severity: (row.Severity || row.severity || "Low") as "High" | "Medium" | "Low",
      priority: Number(row.Priority || row.priority) || 1,
      category: row.Category || row.category || "",
      contactEmail: row.ContactEmail || row.contactEmail || "",
      estimatedUsers: Number(row.EstimatedUsers || row.estimatedUsers) || 0,
    } satisfies OutageData
  })
}

/* Re-export helpers so existing components still work */
export { getOutages, createMultipleOutages }
