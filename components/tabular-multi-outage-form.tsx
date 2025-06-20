"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Upload, Plus, Trash2, Download, Mail, FileSpreadsheet, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { createMultipleOutages, parseExcelFile } from "@/actions/excel-actions"
import { sendOutageNotification, validateEmails } from "@/actions/email-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface OutageRow {
  id: string
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  environments: string[]
  affectedModels: string
  reason: string
  assignee: string
  severity: "High" | "Medium" | "Low" | ""
  priority: number
  category: string
  contactEmail: string
  estimatedUsers: number
}

const environments = ["POC", "SBX DEV", "SBX UAT", "SBX Beta", "PROD"]
const teams = ["Infrastructure Team", "GCP L2 L3 Team", "Tableau Team", "EPAS Team", "EM Team", "Horizon Team"]
const categories = ["Maintenance", "Security Update", "Infrastructure Upgrade", "Emergency Fix", "Planned Migration"]

const environmentColors = {
  POC: "bg-blue-600 text-white",
  "SBX DEV": "bg-emerald-600 text-white",
  "SBX UAT": "bg-amber-600 text-white",
  "SBX Beta": "bg-orange-600 text-white",
  PROD: "bg-red-600 text-white",
}

const severityColors = {
  High: "bg-red-100 text-red-800 border-red-300",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Low: "bg-green-100 text-green-800 border-green-300",
}

const createEmptyRow = (): OutageRow => ({
  id: Math.random().toString(36).substr(2, 9),
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  environments: [],
  affectedModels: "",
  reason: "",
  assignee: "",
  severity: "",
  priority: 1,
  category: "",
  contactEmail: "",
  estimatedUsers: 0,
})

export function TabularMultiOutageForm() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [outages, setOutages] = useState<OutageRow[]>([createEmptyRow()])
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddresses, setEmailAddresses] = useState("")
  const [emailSubject, setEmailSubject] = useState("GCP Outage Notification - New Outages Scheduled")
  const [emailMessage, setEmailMessage] = useState("")
  const [createdOutages, setCreatedOutages] = useState<any[]>([])
  const [emailPreview, setEmailPreview] = useState("")

  const addRow = () => {
    setOutages([...outages, createEmptyRow()])
  }

  const removeRow = (id: string) => {
    if (outages.length > 1) {
      setOutages(outages.filter((row) => row.id !== id))
    }
  }

  const updateRow = (id: string, field: keyof OutageRow, value: any) => {
    setOutages(outages.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const toggleEnvironment = (rowId: string, env: string) => {
    setOutages(
      outages.map((row) => {
        if (row.id === rowId) {
          const envs = row.environments.includes(env)
            ? row.environments.filter((e) => e !== env)
            : [...row.environments, env]
          return { ...row, environments: envs }
        }
        return row
      }),
    )
  }

  const downloadTemplate = () => {
    const template = `Title,StartDate,EndDate,Environments,AffectedModels,Reason,Assignee,Severity,Priority,Category,ContactEmail,EstimatedUsers
Weekly Maintenance,2024-12-01T02:00:00,2024-12-01T06:00:00,"POC,SBX DEV",All models,Routine maintenance,Infrastructure Team,Low,3,Maintenance,infra@company.com,100
Security Update,2024-12-02T01:00:00,2024-12-02T03:00:00,PROD,Critical systems,Security patches,GCP L2 L3 Team,High,1,Security Update,security@company.com,5000`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "outage_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const parsedOutages = await parseExcelFile(arrayBuffer)

      const formattedOutages: OutageRow[] = parsedOutages.map((outage) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: outage.title,
        startDate: outage.startDate.toISOString().split("T")[0],
        startTime: outage.startDate.toTimeString().slice(0, 5),
        endDate: outage.endDate.toISOString().split("T")[0],
        endTime: outage.endDate.toTimeString().slice(0, 5),
        environments: outage.environments,
        affectedModels: outage.affectedModels,
        reason: outage.reason,
        assignee: outage.assignee,
        severity: outage.severity,
        priority: outage.priority || 1,
        category: outage.category || "",
        contactEmail: outage.contactEmail || "",
        estimatedUsers: outage.estimatedUsers || 0,
      }))

      setOutages(formattedOutages)
      toast({
        title: "Success",
        description: `Loaded ${formattedOutages.length} outages from Excel file`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse Excel file. Please check the format.",
        variant: "destructive",
      })
    }
  }

  const validateOutages = () => {
    for (let i = 0; i < outages.length; i++) {
      const outage = outages[i]
      if (!outage.title.trim()) {
        toast({
          title: "Validation Error",
          description: `Row ${i + 1}: Title is required`,
          variant: "destructive",
        })
        return false
      }
      if (!outage.startDate || !outage.endDate) {
        toast({
          title: "Validation Error",
          description: `Row ${i + 1}: Start and end dates are required`,
          variant: "destructive",
        })
        return false
      }
      if (!outage.severity) {
        toast({
          title: "Validation Error",
          description: `Row ${i + 1}: Severity is required`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateOutages()) return

    startTransition(async () => {
      try {
        const outageData = outages.map((outage) => ({
          title: outage.title,
          startDate: new Date(`${outage.startDate}T${outage.startTime || "00:00"}`),
          endDate: new Date(`${outage.endDate}T${outage.endTime || "23:59"}`),
          environments: outage.environments,
          affectedModels: outage.affectedModels,
          reason: outage.reason,
          detailedImpact: [outage.reason], // Use reason as impact for tabular form
          assignee: outage.assignee,
          severity: outage.severity as "High" | "Medium" | "Low",
          priority: outage.priority,
          category: outage.category,
          contactEmail: outage.contactEmail,
          estimatedUsers: outage.estimatedUsers,
        }))

        const result = await createMultipleOutages(outageData)
        setCreatedOutages(result.outages)

        toast({
          title: "Success",
          description: result.message,
        })

        setShowEmailDialog(true)
      } catch (error) {
        console.error("Error creating outages:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create outages",
          variant: "destructive",
        })
      }
    })
  }

  const handleSendNotifications = async () => {
    try {
      const emails = emailAddresses
        .split(/[,;\n]/)
        .map((email) => email.trim())
        .filter(Boolean)

      if (emails.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one email address",
          variant: "destructive",
        })
        return
      }

      const { valid, invalid } = await validateEmails(emails)

      if (invalid.length > 0) {
        toast({
          title: "Invalid Emails",
          description: `Invalid email addresses: ${invalid.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      const result = await sendOutageNotification({
        recipientEmails: valid,
        subject: emailSubject,
        message: emailMessage,
        dashboardUrl: window.location.origin,
        recentOutages: createdOutages,
      })

      setEmailPreview(result.preview)

      toast({
        title: "Notifications Sent",
        description: `Email notifications sent to ${valid.length} recipients`,
      })

      setShowEmailDialog(false)
      setOutages([createEmptyRow()])
      setEmailAddresses("")
      setEmailMessage("")

      // Trigger a page refresh to update the dashboard
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Multiple Outage Scheduler - Tabular View
          </CardTitle>
          <CardDescription>
            Create multiple outages using a spreadsheet-like interface or upload an Excel file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Tabular Input</TabsTrigger>
              <TabsTrigger value="upload">Excel Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Excel File</h3>
                <p className="text-gray-600 mb-4">
                  Upload an Excel file with outage data. The file should contain columns for all outage details.
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={downloadTemplate} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Label htmlFor="excel-upload" className="cursor-pointer">
                    <Button asChild>
                      <span>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                    <Input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Outage Table ({outages.length} rows)</h3>
                <div className="flex gap-2">
                  <Button onClick={addRow} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead className="min-w-[200px]">Title *</TableHead>
                        <TableHead className="min-w-[120px]">Start Date *</TableHead>
                        <TableHead className="min-w-[100px]">Start Time</TableHead>
                        <TableHead className="min-w-[120px]">End Date *</TableHead>
                        <TableHead className="min-w-[100px]">End Time</TableHead>
                        <TableHead className="min-w-[120px]">Severity *</TableHead>
                        <TableHead className="min-w-[100px]">Priority</TableHead>
                        <TableHead className="min-w-[150px]">Category</TableHead>
                        <TableHead className="min-w-[180px]">Team</TableHead>
                        <TableHead className="min-w-[150px]">Contact Email</TableHead>
                        <TableHead className="min-w-[120px]">Est. Users</TableHead>
                        <TableHead className="min-w-[200px]">Environments</TableHead>
                        <TableHead className="min-w-[200px]">Affected Models</TableHead>
                        <TableHead className="min-w-[250px]">Reason</TableHead>
                        <TableHead className="w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outages.map((outage, index) => (
                        <TableRow key={outage.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>

                          {/* Title */}
                          <TableCell>
                            <Input
                              value={outage.title}
                              onChange={(e) => updateRow(outage.id, "title", e.target.value)}
                              placeholder="Outage title"
                              className="min-w-[180px]"
                            />
                          </TableCell>

                          {/* Start Date */}
                          <TableCell>
                            <Input
                              type="date"
                              value={outage.startDate}
                              onChange={(e) => updateRow(outage.id, "startDate", e.target.value)}
                              className="min-w-[120px]"
                            />
                          </TableCell>

                          {/* Start Time */}
                          <TableCell>
                            <Input
                              type="time"
                              value={outage.startTime}
                              onChange={(e) => updateRow(outage.id, "startTime", e.target.value)}
                              className="min-w-[100px]"
                            />
                          </TableCell>

                          {/* End Date */}
                          <TableCell>
                            <Input
                              type="date"
                              value={outage.endDate}
                              onChange={(e) => updateRow(outage.id, "endDate", e.target.value)}
                              className="min-w-[120px]"
                            />
                          </TableCell>

                          {/* End Time */}
                          <TableCell>
                            <Input
                              type="time"
                              value={outage.endTime}
                              onChange={(e) => updateRow(outage.id, "endTime", e.target.value)}
                              className="min-w-[100px]"
                            />
                          </TableCell>

                          {/* Severity */}
                          <TableCell>
                            <Select
                              value={outage.severity}
                              onValueChange={(value) => updateRow(outage.id, "severity", value)}
                            >
                              <SelectTrigger className="min-w-[120px]">
                                <SelectValue placeholder="Severity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="High">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    High
                                  </div>
                                </SelectItem>
                                <SelectItem value="Medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    Medium
                                  </div>
                                </SelectItem>
                                <SelectItem value="Low">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Low
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Priority */}
                          <TableCell>
                            <Select
                              value={outage.priority.toString()}
                              onValueChange={(value) => updateRow(outage.id, "priority", Number.parseInt(value))}
                            >
                              <SelectTrigger className="min-w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 - Critical</SelectItem>
                                <SelectItem value="2">2 - High</SelectItem>
                                <SelectItem value="3">3 - Medium</SelectItem>
                                <SelectItem value="4">4 - Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <Select
                              value={outage.category}
                              onValueChange={(value) => updateRow(outage.id, "category", value)}
                            >
                              <SelectTrigger className="min-w-[150px]">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Team */}
                          <TableCell>
                            <Select
                              value={outage.assignee}
                              onValueChange={(value) => updateRow(outage.id, "assignee", value)}
                            >
                              <SelectTrigger className="min-w-[180px]">
                                <SelectValue placeholder="Select team" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team} value={team}>
                                    {team}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Contact Email */}
                          <TableCell>
                            <Input
                              type="email"
                              value={outage.contactEmail}
                              onChange={(e) => updateRow(outage.id, "contactEmail", e.target.value)}
                              placeholder="team@company.com"
                              className="min-w-[150px]"
                            />
                          </TableCell>

                          {/* Estimated Users */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={outage.estimatedUsers}
                              onChange={(e) =>
                                updateRow(outage.id, "estimatedUsers", Number.parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="min-w-[120px]"
                            />
                          </TableCell>

                          {/* Environments */}
                          <TableCell>
                            <div className="space-y-2 min-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {environments.map((env) => (
                                  <Badge
                                    key={env}
                                    variant={outage.environments.includes(env) ? "default" : "outline"}
                                    className={`cursor-pointer text-xs ${
                                      outage.environments.includes(env)
                                        ? environmentColors[env as keyof typeof environmentColors]
                                        : "hover:bg-gray-100"
                                    }`}
                                    onClick={() => toggleEnvironment(outage.id, env)}
                                  >
                                    {env}
                                  </Badge>
                                ))}
                              </div>
                              {outage.environments.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {outage.environments.length} selected
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Affected Models */}
                          <TableCell>
                            <Input
                              value={outage.affectedModels}
                              onChange={(e) => updateRow(outage.id, "affectedModels", e.target.value)}
                              placeholder="All models"
                              className="min-w-[200px]"
                            />
                          </TableCell>

                          {/* Reason */}
                          <TableCell>
                            <Textarea
                              value={outage.reason}
                              onChange={(e) => updateRow(outage.id, "reason", e.target.value)}
                              placeholder="Reason for outage"
                              rows={2}
                              className="min-w-[250px] resize-none"
                            />
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            {outages.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeRow(outage.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Outages</div>
                    <div className="text-2xl font-bold text-blue-600">{outages.length}</div>
                  </div>
                  <div>
                    <div className="font-medium">High Impact</div>
                    <div className="text-2xl font-bold text-red-600">
                      {outages.filter((o) => o.severity === "High").length}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Medium Impact</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {outages.filter((o) => o.severity === "Medium").length}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Low Impact</div>
                    <div className="text-2xl font-bold text-green-600">
                      {outages.filter((o) => o.severity === "Low").length}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <Button onClick={handleSubmit} disabled={isPending} size="lg">
              {isPending ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-pulse" />
                  Creating {outages.length} Outages...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create {outages.length} Outage{outages.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Outage Notifications
            </DialogTitle>
            <DialogDescription>
              Send email notifications about the newly created outages with a comprehensive schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Successfully created {createdOutages.length} outage{createdOutages.length > 1 ? "s" : ""}. Send
                notifications to stakeholders with detailed outage information.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="email-addresses">Email Addresses *</Label>
              <Textarea
                id="email-addresses"
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;example@company.com, user@domain.com"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Additional Message (Optional)</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add any additional context or instructions..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Skip Notifications
              </Button>
              <Button onClick={handleSendNotifications}>
                <Mail className="w-4 h-4 mr-2" />
                Send Notifications
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      {emailPreview && (
        <Dialog open={!!emailPreview} onOpenChange={() => setEmailPreview("")}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>Preview of the sent notification email</DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: emailPreview }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
