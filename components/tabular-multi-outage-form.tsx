"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Plus,
  X,
  Mail,
  Send,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Check,
  Trash2,
  Copy,
  FileSpreadsheet,
  Users,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { parseExcelFile } from "@/lib/parse-excel"
// Add timezone import at the top
import { getCommonTimezones, getUserTimezone } from "@/lib/timezone-utils"

// Types and interfaces
interface Environment {
  id: string
  name: string
  color: string
  description: string
}

interface Team {
  id: string
  name: string
  email: string
  description: string
}

// Update the OutageRow interface to include timezone
interface OutageRow {
  id: string
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string // Add this field
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignees: string[]
  severity: "High" | "Medium" | "Low" | ""
  category: string
  contactEmail: string
  estimatedUsers: number
  outageType: "Internal" | "External" | ""
}

// Add timezone data and update createEmptyRow function
const timezones = getCommonTimezones()

const createEmptyRow = (): OutageRow => ({
  id: Math.random().toString(36).substr(2, 9),
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  timezone: getUserTimezone(), // Default to user's timezone
  environments: [],
  affectedModels: "",
  reason: "",
  detailedImpact: [""],
  assignees: [],
  severity: "",
  category: "",
  contactEmail: "",
  estimatedUsers: 0,
  outageType: "",
})

const categories = [
  "Maintenance",
  "Security Update",
  "Infrastructure Upgrade",
  "Database Migration",
  "Network Maintenance",
  "Software Deployment",
  "Hardware Replacement",
  "Emergency Patch",
  "Capacity Expansion",
  "Other",
]

const severityColors: Record<string, string> = {
  High: "bg-red-100 text-red-800 border-red-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Low: "bg-green-100 text-green-800 border-green-200",
}

// API functions
async function createMultipleOutages(outages: any[]) {
  const results = []
  for (const outage of outages) {
    const res = await fetch("/api/outages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outage),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Unknown error" }))
      throw new Error(`Failed to create outage "${outage.title}": ${errorData.message}`)
    }
    const result = await res.json()
    results.push(result.outage)
  }
  return results
}

async function fetchConfig(type: "environments" | "teams") {
  const res = await fetch(`/api/config?type=${type}`)
  if (!res.ok) throw new Error(`Failed to fetch ${type} config`)
  return await res.json()
}

async function sendBulkNotifications(payload: any) {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to send notifications")
  return await res.json()
}

export default function TabularMultiOutageForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [createdOutages, setCreatedOutages] = useState<any[]>([])
  const [emailRecipients, setEmailRecipients] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showLeftIndicator, setShowLeftIndicator] = useState(false)
  const [showRightIndicator, setShowRightIndicator] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Initialize with one empty row

  const [rows, setRows] = useState<OutageRow[]>([createEmptyRow()])

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftIndicator(scrollLeft > 0)
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const checkScrollIndicators = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current
      const hasHorizontalScroll = scrollWidth > clientWidth
      setShowRightIndicator(hasHorizontalScroll)
      setShowLeftIndicator(false)
    }
  }

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [envConfig, teamConfig] = await Promise.all([fetchConfig("environments"), fetchConfig("teams")])

        setEnvironments(Array.isArray(envConfig.environments) ? envConfig.environments : envConfig)
        setTeams(Array.isArray(teamConfig.teams) ? teamConfig.teams : teamConfig)
      } catch (error) {
        console.error("Failed to load configuration:", error)
        toast({
          title: "Configuration Error",
          description: "Failed to load configuration data",
          variant: "destructive",
        })
      } finally {
        setLoadingConfig(false)
      }
    }
    loadConfig()
  }, [toast])

  useEffect(() => {
    checkScrollIndicators()
    const handleResize = () => checkScrollIndicators()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [rows])

  // Row management
  const addRow = () => {
    setRows([...rows, createEmptyRow()])
  }

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id))
    }
  }

  const duplicateRow = (id: string) => {
    const rowToDuplicate = rows.find((row) => row.id === id)
    if (rowToDuplicate) {
      const newRow = { ...rowToDuplicate, id: Math.random().toString(36).substr(2, 9) }
      const index = rows.findIndex((row) => row.id === id)
      const newRows = [...rows]
      newRows.splice(index + 1, 0, newRow)
      setRows(newRows)
    }
  }

  const clearAllRows = () => {
    setRows([createEmptyRow()])
    toast({
      title: "Cleared",
      description: "All rows have been cleared",
    })
  }

  // Field update functions
  const updateRow = (id: string, field: keyof OutageRow, value: any) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const updateRowEnvironments = (id: string, envId: string, checked: boolean) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    if (envId === "all") {
      const newEnvs = checked ? environments.map((env) => env.id) : []
      updateRow(id, "environments", newEnvs)
    } else {
      const newEnvs = checked ? [...row.environments, envId] : row.environments.filter((e) => e !== envId)
      updateRow(id, "environments", newEnvs)
    }
  }

  const updateRowTeams = (id: string, teamId: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    const newTeams = row.assignees.includes(teamId)
      ? row.assignees.filter((t) => t !== teamId)
      : [...row.assignees, teamId]
    updateRow(id, "assignees", newTeams)
  }

  const updateRowImpact = (id: string, index: number, value: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    const newImpact = row.detailedImpact.map((item, i) => (i === index ? value : item))
    updateRow(id, "detailedImpact", newImpact)
  }

  const addRowImpact = (id: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    updateRow(id, "detailedImpact", [...row.detailedImpact, ""])
  }

  const removeRowImpact = (id: string, index: number) => {
    const row = rows.find((r) => r.id === id)
    if (!row || row.detailedImpact.length <= 1) return

    const newImpact = row.detailedImpact.filter((_, i) => i !== index)
    updateRow(id, "detailedImpact", newImpact)
  }

  // Validation
  const validateRows = () => {
    const errors: string[] = []

    rows.forEach((row, index) => {
      const rowNum = index + 1
      if (!row.title) errors.push(`Row ${rowNum}: Title is required`)
      if (!row.startDate) errors.push(`Row ${rowNum}: Start date is required`)
      if (!row.endDate) errors.push(`Row ${rowNum}: End date is required`)
      if (!row.severity) errors.push(`Row ${rowNum}: Severity is required`)
      if (!row.outageType) errors.push(`Row ${rowNum}: Outage type is required`)
      if (row.environments.length === 0) errors.push(`Row ${rowNum}: At least one environment is required`)
    })

    return errors
  }

  // Excel import handling
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError(null)

    try {
      const buffer = await file.arrayBuffer()
      const importedData = await parseExcelFile(buffer, file.name)

      // Transform imported data to match our row format
      const newRows: OutageRow[] = importedData.map((data) => {
        // Map environment names to IDs
        const envIds = data.environments
          .map((envName) => {
            const env = environments.find((e) => e.name.toLowerCase() === envName.toLowerCase())
            return env ? env.id : envName
          })
          .filter(Boolean)

        // Map assignee names to team IDs
        const teamIds = data.assignee
          .split(",")
          .map((assigneeName) => {
            const team = teams.find((t) => t.name.toLowerCase() === assigneeName.trim().toLowerCase())
            return team ? team.id : assigneeName.trim()
          })
          .filter(Boolean)

        return {
          id: Math.random().toString(36).substr(2, 9),
          title: data.title,
          startDate: data.startDate.toISOString().split("T")[0],
          startTime: data.startDate.toTimeString().slice(0, 5),
          endDate: data.endDate.toISOString().split("T")[0],
          endTime: data.endDate.toTimeString().slice(0, 5),
          timezone: getUserTimezone(),
          environments: envIds,
          affectedModels: data.affectedModels,
          reason: data.reason,
          detailedImpact: Array.isArray(data.detailedImpact) ? data.detailedImpact : [data.detailedImpact || ""],
          assignees: teamIds,
          severity: data.severity,
          category: data.category || "",
          contactEmail: data.contactEmail || "",
          estimatedUsers: data.estimatedUsers || 0,
          outageType: data.outageType || "",
        }
      })

      setRows(newRows)

      toast({
        title: "Import Successful",
        description: `${importedData.length} outages imported from Excel file`,
      })

      // Clear the file input
      event.target.value = ""
    } catch (error) {
      console.error("Import error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to import Excel file"
      setImportError(errorMessage)
      toast({
        title: "Import Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    // Create a sample Excel template
    const templateData = [
      {
        Title: "Sample Outage",
        StartDate: "2024-01-15",
        EndDate: "2024-01-15",
        Environments: "Production,Staging",
        AffectedModels: "User Service, Payment API",
        Reason: "Scheduled maintenance",
        Assignee: "DevOps Team",
        Severity: "Medium",
        Category: "Maintenance",
        ContactEmail: "devops@company.com",
        EstimatedUsers: 1000,
        OutageType: "Internal",
      },
    ]

    // Convert to CSV for simplicity (Excel format would require additional library)
    const headers = Object.keys(templateData[0])
    const csvContent = [
      headers.join(","),
      templateData.map((row) => headers.map((header) => `"${row[header]}"`).join(",")).join("\n"),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "outage-template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Submission
  const handleSubmit = async () => {
    const validationErrors = validateRows()
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: validationErrors.join(", "),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Transform rows to API format
      // Update the handleSubmit function to include timezone in outage data transformation:
      const outageData = rows.map((row) => {
        const selectedEnvironmentNames = row.environments.map((envId) => {
          const env = environments.find((e) => e.id === envId)
          return env ? env.name : envId
        })

        const selectedTeamNames = row.assignees.map((teamId) => {
          const team = teams.find((t) => t.id === teamId)
          return team ? team.name : teamId
        })

        // Create dates in the specified timezone
        const startDateTime = new Date(`${row.startDate}T${row.startTime || "00:00"}`)
        const endDateTime = new Date(`${row.endDate}T${row.endTime || "23:59"}`)

        return {
          title: row.title,
          startDate: startDateTime,
          endDate: endDateTime,
          timezone: row.timezone, // Include timezone information
          environments: selectedEnvironmentNames,
          affectedModels: row.affectedModels,
          reason: row.reason,
          detailedImpact: row.detailedImpact.filter((item) => item.trim() !== ""),
          assignee: selectedTeamNames.join(", "),
          severity: row.severity as "High" | "Medium" | "Low",
        }
      })

      const results = await createMultipleOutages(outageData)

      // Add additional data for display
      const enhancedResults = results.map((outage, index) => ({
        ...outage,
        category: rows[index].category,
        contactEmail: rows[index].contactEmail,
        estimatedUsers: rows[index].estimatedUsers,
        outageType: rows[index].outageType,
        assignees: rows[index].assignees.map((teamId) => {
          const team = teams.find((t) => t.id === teamId)
          return team ? team.name : teamId
        }),
      }))

      setCreatedOutages(enhancedResults)

      // Prepare email data
      const allTeamEmails = rows.flatMap((row) =>
        row.assignees.map((teamId) => teams.find((t) => t.id === teamId)?.email).filter(Boolean),
      )
      const uniqueEmails = [...new Set(allTeamEmails)].join(", ")

      setEmailRecipients(uniqueEmails)
      setEmailSubject(`GCP Planned Outages Notification - ${results.length} New Outages Scheduled`)
      setEmailMessage(
        `${results.length} new planned outages have been scheduled. Please review the details in the dashboard.`,
      )

      toast({
        title: "Success",
        description: `${results.length} outages created successfully!`,
      })

      setShowEmailDialog(true)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error creating outages:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create outages",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Email handling
  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one email recipient",
        variant: "destructive",
      })
      return
    }

    setSendingEmail(true)

    try {
      const recipients = emailRecipients
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email)

      const result = await sendBulkNotifications({
        recipientEmails: recipients,
        subject: emailSubject,
        message: emailMessage,
        dashboardUrl: window.location.origin,
        recentOutages: createdOutages,
      })

      toast({
        title: "Email Notification",
        description: result.message || "Email notifications sent successfully",
      })

      setShowEmailDialog(false)
      resetForm()
    } catch (error) {
      console.error("Email error:", error)
      toast({
        title: "Email Error",
        description: error instanceof Error ? error.message : "Failed to send notifications",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const resetForm = () => {
    setRows([createEmptyRow()])
    setCreatedOutages([])
    setEmailRecipients("")
    setEmailSubject("")
    setEmailMessage("")
  }

  const skipEmail = () => {
    setShowEmailDialog(false)
    resetForm()
    toast({
      title: "Outages Created",
      description: `${createdOutages.length} outages created successfully. Email notifications skipped.`,
    })
  }

  if (loadingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading configuration...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Schedule Multiple Outages
              </CardTitle>
              <CardDescription>Create multiple planned outages manually or import from Excel file</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isImporting}
                />
                <Button type="button" variant="outline" size="sm" disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Import Excel
                    </>
                  )}
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearAllRows}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 w-full">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Bulk Outage Creation:</strong> Fill out the table below to create multiple outages at once. Each
                row represents one outage. Use the action buttons to add, duplicate, or remove rows.
              </AlertDescription>
            </Alert>
            {importError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Import Error:</strong> {importError}
                </AlertDescription>
              </Alert>
            )}

            <div className="relative w-full max-w-full">
              {/* Left scroll indicator */}
              {showLeftIndicator && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none flex items-center justify-start pl-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Right scroll indicator */}
              {showRightIndicator && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none flex items-center justify-end pr-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              )}

              <div className="w-full border rounded-md overflow-hidden">
                <div
                  ref={scrollContainerRef}
                  className="w-full p-4 overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                  onScroll={handleScroll}
                  style={{ minWidth: "100%" }}
                >
                  {/* Update the table min-width to accommodate the new timezone column: */}
                  <Table className="min-w-[2000px]">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b-2 border-blue-200 dark:border-blue-800">
                        <TableHead className="w-[60px] sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 z-10 font-bold text-blue-900 dark:text-blue-100">
                          Actions
                        </TableHead>
                        <TableHead className="w-[200px] font-bold text-blue-900 dark:text-blue-100">Title *</TableHead>
                        <TableHead className="w-[120px] font-bold text-blue-900 dark:text-blue-100">
                          Start Date *
                        </TableHead>
                        <TableHead className="w-[100px] font-bold text-blue-900 dark:text-blue-100">
                          Start Time
                        </TableHead>
                        <TableHead className="w-[120px] font-bold text-blue-900 dark:text-blue-100">
                          End Date *
                        </TableHead>
                        <TableHead className="w-[100px] font-bold text-blue-900 dark:text-blue-100">End Time</TableHead>
                        <TableHead className="w-[150px] font-bold text-blue-900 dark:text-blue-100">Timezone</TableHead>
                        <TableHead className="w-[150px] font-bold text-blue-900 dark:text-blue-100">
                          Environments *
                        </TableHead>
                        <TableHead className="w-[120px] font-bold text-blue-900 dark:text-blue-100">Teams</TableHead>
                        <TableHead className="w-[100px] font-bold text-blue-900 dark:text-blue-100">
                          Severity *
                        </TableHead>
                        <TableHead className="w-[100px] font-bold text-blue-900 dark:text-blue-100">Type *</TableHead>
                        <TableHead className="w-[120px] font-bold text-blue-900 dark:text-blue-100">Category</TableHead>
                        <TableHead className="w-[150px] font-bold text-blue-900 dark:text-blue-100">
                          Affected Models
                        </TableHead>
                        <TableHead className="w-[200px] font-bold text-blue-900 dark:text-blue-100">Reason</TableHead>
                        <TableHead className="w-[150px] font-bold text-blue-900 dark:text-blue-100">
                          Impact Details
                        </TableHead>
                        <TableHead className="w-[150px] font-bold text-blue-900 dark:text-blue-100">
                          Contact Email
                        </TableHead>
                        <TableHead className="w-[100px] font-bold text-blue-900 dark:text-blue-100">
                          Est. Users
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, rowIndex) => (
                        <TableRow
                          key={row.id}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-950/10 border-b border-gray-200 dark:border-gray-700"
                        >
                          {/* Enhanced Actions - make sticky */}
                          <TableCell className="sticky left-0 bg-background z-10 border-r border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                                onClick={() => duplicateRow(row.id)}
                                title="Duplicate row"
                              >
                                <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                              {rows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700"
                                  onClick={() => removeRow(row.id)}
                                  title="Remove row"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>

                          {/* Enhanced Title */}
                          <TableCell>
                            <Input
                              value={row.title}
                              onChange={(e) => updateRow(row.id, "title", e.target.value)}
                              placeholder="Outage title"
                              className="min-w-[180px] border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </TableCell>

                          {/* Enhanced Date/Time inputs */}
                          <TableCell>
                            <Input
                              type="date"
                              value={row.startDate}
                              onChange={(e) => updateRow(row.id, "startDate", e.target.value)}
                              className="min-w-[120px] border-2 focus:border-green-500 dark:focus:border-green-400"
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              type="time"
                              value={row.startTime}
                              onChange={(e) => updateRow(row.id, "startTime", e.target.value)}
                              className="min-w-[100px] border-2 focus:border-green-500 dark:focus:border-green-400"
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              type="date"
                              value={row.endDate}
                              onChange={(e) => updateRow(row.id, "endDate", e.target.value)}
                              className="min-w-[120px] border-2 focus:border-green-500 dark:focus:border-green-400"
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              type="time"
                              value={row.endTime}
                              onChange={(e) => updateRow(row.id, "endTime", e.target.value)}
                              className="min-w-[100px] border-2 focus:border-green-500 dark:focus:border-green-400"
                            />
                          </TableCell>

                          {/* Enhanced Timezone */}
                          <TableCell>
                            <Select
                              value={row.timezone}
                              onValueChange={(value) => updateRow(row.id, "timezone", value)}
                            >
                              <SelectTrigger className="w-full border-2 focus:border-green-500 dark:focus:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                {timezones.map((tz) => (
                                  <SelectItem
                                    key={tz.value}
                                    value={tz.value}
                                    className="py-3 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{tz.label.split(" (")[0]}</span>
                                      <span className="text-xs text-muted-foreground">{tz.offset}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Enhanced Environments */}
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between text-left border-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    {row.environments.length === 0
                                      ? "Select..."
                                      : `${row.environments.length} selected`}
                                  </div>
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                                    <Checkbox
                                      id={`all-env-${row.id}`}
                                      checked={row.environments.length === environments.length}
                                      onCheckedChange={(checked) =>
                                        updateRowEnvironments(row.id, "all", checked as boolean)
                                      }
                                    />
                                    <Label
                                      htmlFor={`all-env-${row.id}`}
                                      className="font-medium text-purple-900 dark:text-purple-100"
                                    >
                                      Select All
                                    </Label>
                                  </div>
                                  <Separator />
                                  <div className="max-h-48 overflow-y-auto space-y-2">
                                    {environments.map((env) => (
                                      <div
                                        key={env.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                                      >
                                        <Checkbox
                                          id={`${env.id}-${row.id}`}
                                          checked={row.environments.includes(env.id)}
                                          onCheckedChange={(checked) =>
                                            updateRowEnvironments(row.id, env.id, checked as boolean)
                                          }
                                        />
                                        <Label
                                          htmlFor={`${env.id}-${row.id}`}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <div className={`w-3 h-3 rounded-full ${env.color}`} />
                                          <div>
                                            <div className="font-medium text-sm">{env.name}</div>
                                            <div className="text-xs text-muted-foreground">{env.description}</div>
                                          </div>
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            {row.environments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {row.environments.slice(0, 2).map((envId) => {
                                  const env = environments.find((e) => e.id === envId)
                                  return env ? (
                                    <Badge
                                      key={envId}
                                      className={`${env.color} text-white text-xs px-2 py-1 shadow-sm`}
                                    >
                                      {env.name}
                                    </Badge>
                                  ) : null
                                })}
                                {row.environments.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    +{row.environments.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>

                          {/* Enhanced Teams */}
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between text-left border-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700 focus:border-cyan-500 dark:focus:border-cyan-400"
                                >
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-cyan-600" />
                                    {row.assignees.length === 0 ? "Select..." : `${row.assignees.length} selected`}
                                  </div>
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <Command>
                                  <CommandInput
                                    placeholder="Search teams..."
                                    className="border-cyan-200 dark:border-cyan-700"
                                  />
                                  <CommandList>
                                    <CommandEmpty className="py-4 text-center text-muted-foreground">
                                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p>No teams found.</p>
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {teams.map((team) => (
                                        <CommandItem
                                          key={team.id}
                                          value={team.id}
                                          onSelect={() => updateRowTeams(row.id, team.id)}
                                          className="py-3 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              row.assignees.includes(team.id)
                                                ? "opacity-100 text-cyan-600"
                                                : "opacity-0"
                                            }`}
                                          />
                                          <div>
                                            <div className="font-medium text-sm">{team.name}</div>
                                            <div className="text-xs text-muted-foreground">{team.description}</div>
                                            <div className="text-xs text-cyan-600 dark:text-cyan-400">{team.email}</div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {row.assignees.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {row.assignees.slice(0, 2).map((teamId) => {
                                  const team = teams.find((t) => t.id === teamId)
                                  return team ? (
                                    <Badge
                                      key={teamId}
                                      variant="secondary"
                                      className="text-xs px-2 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                                    >
                                      {team.name}
                                    </Badge>
                                  ) : null
                                })}
                                {row.assignees.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    +{row.assignees.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>

                          {/* Enhanced Severity */}
                          <TableCell>
                            <Select
                              value={row.severity}
                              onValueChange={(value) => updateRow(row.id, "severity", value)}
                            >
                              <SelectTrigger className="w-full border-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-700 focus:border-orange-500 dark:focus:border-orange-400">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low" className="hover:bg-green-50 dark:hover:bg-green-900/20">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span>Low</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Medium" className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span>Medium</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="High" className="hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span>High</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Enhanced Type */}
                          <TableCell>
                            <Select
                              value={row.outageType}
                              onValueChange={(value) => updateRow(row.id, "outageType", value)}
                            >
                              <SelectTrigger className="w-full border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Internal" className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-purple-600" />
                                    <span>Internal</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="External" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span>External</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Enhanced Category */}
                          <TableCell>
                            <Select
                              value={row.category}
                              onValueChange={(value) => updateRow(row.id, "category", value)}
                            >
                              <SelectTrigger className="w-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 focus:border-gray-500 dark:focus:border-gray-400">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                      <span>{cat}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Rest of the cells with enhanced styling... */}
                          <TableCell>
                            <Input
                              value={row.affectedModels}
                              onChange={(e) => updateRow(row.id, "affectedModels", e.target.value)}
                              placeholder="Models/Services"
                              className="min-w-[140px] border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </TableCell>

                          <TableCell>
                            <Textarea
                              value={row.reason}
                              onChange={(e) => updateRow(row.id, "reason", e.target.value)}
                              placeholder="Reason for outage"
                              rows={2}
                              className="min-w-[180px] resize-none border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </TableCell>

                          <TableCell>
                            <div className="space-y-2">
                              {row.detailedImpact.map((impact, impactIndex) => (
                                <div key={impactIndex} className="flex gap-1">
                                  <Textarea
                                    value={impact}
                                    onChange={(e) => updateRowImpact(row.id, impactIndex, e.target.value)}
                                    placeholder={`Impact ${impactIndex + 1}`}
                                    rows={1}
                                    className="min-w-[120px] resize-none text-xs border-2 focus:border-orange-500 dark:focus:border-orange-400"
                                  />
                                  {row.detailedImpact.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                      onClick={() => removeRowImpact(row.id, impactIndex)}
                                    >
                                      <X className="h-3 w-3 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs hover:bg-green-100 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700"
                                onClick={() => addRowImpact(row.id)}
                              >
                                <Plus className="h-3 w-3 mr-1 text-green-600" />
                                Add
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              type="email"
                              value={row.contactEmail}
                              onChange={(e) => updateRow(row.id, "contactEmail", e.target.value)}
                              placeholder="contact@company.com"
                              className="min-w-[140px] border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={row.estimatedUsers}
                              onChange={(e) =>
                                updateRow(row.id, "estimatedUsers", Number.parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="min-w-[80px] border-2 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRow}
                  className="px-6 py-3 border-2 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700"
                >
                  <Plus className="w-4 h-4 mr-2 text-green-600" />
                  Add Row
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAllRows}
                  className="px-6 py-3 border-2 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2 text-red-600" />
                  Clear All
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{rows.length}</div>
                  <div className="text-sm text-muted-foreground">outage{rows.length !== 1 ? "s" : ""} to create</div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-semibold shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Create {rows.length} Outage{rows.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Bulk Outage Notifications
            </DialogTitle>
            <DialogDescription>
              {createdOutages.length} outages have been created successfully. Send notification emails to stakeholders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Created Outages Summary */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Created Outages ({createdOutages.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {createdOutages.map((outage, index) => (
                  <div key={outage.id} className="flex justify-between items-center p-2 bg-background rounded border">
                    <div>
                      <div className="font-medium">{outage.title}</div>
                      <div className="text-xs text-muted-foreground">ID: #{outage.id}</div>
                    </div>
                    <div className="flex gap-1">
                      {outage.severity && <Badge className={severityColors[outage.severity]}>{outage.severity}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Email Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkEmailRecipients">Email Recipients *</Label>
                <Textarea
                  id="bulkEmailRecipients"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="Enter email addresses separated by commas"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkEmailSubject">Subject</Label>
                <Input id="bulkEmailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkEmailMessage">Additional Message</Label>
                <Textarea
                  id="bulkEmailMessage"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={skipEmail}>
                Skip Email
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendEmail} disabled={sendingEmail}>
                  {sendingEmail ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Notifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
