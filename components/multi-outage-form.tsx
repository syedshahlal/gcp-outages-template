"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { Upload, Plus, Trash2, Download, Mail, FileSpreadsheet, TableIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { createMultipleOutages, parseExcelFile } from "@/actions/excel-actions"
import { sendOutageNotification, validateEmails } from "@/actions/email-actions"

interface OutageFormData {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  severity: "High" | "Medium" | "Low" | ""
  priority: number
  category: string
  contactEmail: string
  estimatedUsers: number
}

const environments = ["POC", "SBX DEV", "SBX UAT", "PROD"]
const teams = ["Infrastructure Team", "GCP L2 L3 Team", "Tableau Team", "EPAS Team", "EM Team", "Horizon Team"]
const categories = ["Maintenance", "Security Update", "Infrastructure Upgrade", "Emergency Fix", "Planned Migration"]

const defaultOutage: OutageFormData = {
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  environments: [],
  affectedModels: "",
  reason: "",
  detailedImpact: [""],
  assignee: "",
  severity: "",
  priority: 1,
  category: "",
  contactEmail: "",
  estimatedUsers: 0,
}

export function MultiOutageForm() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [outages, setOutages] = useState<OutageFormData[]>([{ ...defaultOutage }])
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddresses, setEmailAddresses] = useState("")
  const [emailSubject, setEmailSubject] = useState("GCP Outage Notification - New Outages Scheduled")
  const [emailMessage, setEmailMessage] = useState("")
  const [createdOutages, setCreatedOutages] = useState<any[]>([])
  const [emailPreview, setEmailPreview] = useState("")

  const addOutage = () => {
    setOutages([...outages, { ...defaultOutage }])
  }

  const removeOutage = (index: number) => {
    if (outages.length > 1) {
      setOutages(outages.filter((_, i) => i !== index))
    }
  }

  const updateOutage = (index: number, field: keyof OutageFormData, value: any) => {
    const updated = [...outages]
    updated[index] = { ...updated[index], [field]: value }
    setOutages(updated)
  }

  const handleEnvironmentChange = (outageIndex: number, env: string, checked: boolean) => {
    const updated = [...outages]
    if (checked) {
      updated[outageIndex].environments = [...updated[outageIndex].environments, env]
    } else {
      updated[outageIndex].environments = updated[outageIndex].environments.filter((e) => e !== env)
    }
    setOutages(updated)
  }

  const addImpactItem = (outageIndex: number) => {
    const updated = [...outages]
    updated[outageIndex].detailedImpact = [...updated[outageIndex].detailedImpact, ""]
    setOutages(updated)
  }

  const removeImpactItem = (outageIndex: number, impactIndex: number) => {
    const updated = [...outages]
    updated[outageIndex].detailedImpact = updated[outageIndex].detailedImpact.filter((_, i) => i !== impactIndex)
    setOutages(updated)
  }

  const updateImpactItem = (outageIndex: number, impactIndex: number, value: string) => {
    const updated = [...outages]
    updated[outageIndex].detailedImpact[impactIndex] = value
    setOutages(updated)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const parsedOutages = await parseExcelFile(arrayBuffer)

      const formattedOutages: OutageFormData[] = parsedOutages.map((outage) => ({
        title: outage.title,
        startDate: outage.startDate.toISOString().split("T")[0],
        startTime: outage.startDate.toTimeString().slice(0, 5),
        endDate: outage.endDate.toISOString().split("T")[0],
        endTime: outage.endDate.toTimeString().slice(0, 5),
        environments: outage.environments,
        affectedModels: outage.affectedModels,
        reason: outage.reason,
        detailedImpact: outage.detailedImpact.length > 0 ? outage.detailedImpact : [""],
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

  const downloadTemplate = () => {
    const template = `Title,StartDate,EndDate,Environments,AffectedModels,Reason,DetailedImpact,Assignee,Severity,Priority,Category,ContactEmail,EstimatedUsers
Weekly Maintenance,2024-12-01T02:00:00,2024-12-01T06:00:00,"POC,SBX DEV",All models,Routine maintenance,System updates|Performance optimization,Infrastructure Team,Low,3,Maintenance,infra@company.com,100
Security Update,2024-12-02T01:00:00,2024-12-02T03:00:00,PROD,Critical systems,Security patches,Security vulnerability fixes,GCP L2 L3 Team,High,1,Security Update,security@company.com,5000`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "outage_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const validateOutages = () => {
    for (let i = 0; i < outages.length; i++) {
      const outage = outages[i]
      if (!outage.title.trim()) {
        toast({
          title: "Validation Error",
          description: `Outage ${i + 1}: Title is required`,
          variant: "destructive",
        })
        return false
      }
      if (!outage.startDate || !outage.endDate) {
        toast({
          title: "Validation Error",
          description: `Outage ${i + 1}: Start and end dates are required`,
          variant: "destructive",
        })
        return false
      }
      if (!outage.severity) {
        toast({
          title: "Validation Error",
          description: `Outage ${i + 1}: Severity is required`,
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
          detailedImpact: outage.detailedImpact.filter((item) => item.trim() !== ""),
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
      setOutages([{ ...defaultOutage }])
      setEmailAddresses("")
      setEmailMessage("")
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
            <TableIcon className="w-5 h-5" />
            Multiple Outage Scheduler
          </CardTitle>
          <CardDescription>
            Create multiple outages at once using the table interface or by uploading an Excel file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Table Input</TabsTrigger>
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
                <h3 className="text-lg font-medium">Outage Details ({outages.length})</h3>
                <Button onClick={addOutage} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Outage
                </Button>
              </div>

              <div className="space-y-6">
                {outages.map((outage, index) => (
                  <Card key={index} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Outage #{index + 1}</CardTitle>
                        {outages.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeOutage(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title *</Label>
                          <Input
                            value={outage.title}
                            onChange={(e) => updateOutage(index, "title", e.target.value)}
                            placeholder="Outage title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Severity *</Label>
                          <Select
                            value={outage.severity}
                            onValueChange={(value) => updateOutage(index, "severity", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low Impact</SelectItem>
                              <SelectItem value="Medium">Medium Impact</SelectItem>
                              <SelectItem value="High">High Impact</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Date and Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date & Time *</Label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={outage.startDate}
                              onChange={(e) => updateOutage(index, "startDate", e.target.value)}
                            />
                            <Input
                              type="time"
                              value={outage.startTime}
                              onChange={(e) => updateOutage(index, "startTime", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>End Date & Time *</Label>
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={outage.endDate}
                              onChange={(e) => updateOutage(index, "endDate", e.target.value)}
                            />
                            <Input
                              type="time"
                              value={outage.endTime}
                              onChange={(e) => updateOutage(index, "endTime", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select
                            value={outage.priority.toString()}
                            onValueChange={(value) => updateOutage(index, "priority", Number.parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Critical</SelectItem>
                              <SelectItem value="2">2 - High</SelectItem>
                              <SelectItem value="3">3 - Medium</SelectItem>
                              <SelectItem value="4">4 - Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={outage.category}
                            onValueChange={(value) => updateOutage(index, "category", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Estimated Users Affected</Label>
                          <Input
                            type="number"
                            min="0"
                            value={outage.estimatedUsers}
                            onChange={(e) =>
                              updateOutage(index, "estimatedUsers", Number.parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Team and Contact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Responsible Team</Label>
                          <Select
                            value={outage.assignee}
                            onValueChange={(value) => updateOutage(index, "assignee", value)}
                          >
                            <SelectTrigger>
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
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Email</Label>
                          <Input
                            type="email"
                            value={outage.contactEmail}
                            onChange={(e) => updateOutage(index, "contactEmail", e.target.value)}
                            placeholder="team@company.com"
                          />
                        </div>
                      </div>

                      {/* Environments */}
                      <div className="space-y-2">
                        <Label>Affected Environments</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {environments.map((env) => (
                            <div key={env} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}-${env}`}
                                checked={outage.environments.includes(env)}
                                onCheckedChange={(checked) => handleEnvironmentChange(index, env, checked as boolean)}
                              />
                              <Label htmlFor={`${index}-${env}`} className="text-sm cursor-pointer">
                                {env}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {outage.environments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {outage.environments.map((env) => (
                              <Badge key={env} variant="secondary">
                                {env}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Affected Models */}
                      <div className="space-y-2">
                        <Label>Affected Models</Label>
                        <Input
                          value={outage.affectedModels}
                          onChange={(e) => updateOutage(index, "affectedModels", e.target.value)}
                          placeholder="e.g., All models in POC environment"
                        />
                      </div>

                      {/* Reason */}
                      <div className="space-y-2">
                        <Label>Reason for Outage</Label>
                        <Textarea
                          value={outage.reason}
                          onChange={(e) => updateOutage(index, "reason", e.target.value)}
                          placeholder="Describe the reason for this planned outage..."
                          rows={3}
                        />
                      </div>

                      {/* Detailed Impact */}
                      <div className="space-y-2">
                        <Label>Detailed Impact</Label>
                        <div className="space-y-2">
                          {outage.detailedImpact.map((impact, impactIndex) => (
                            <div key={impactIndex} className="flex gap-2">
                              <Input
                                value={impact}
                                onChange={(e) => updateImpactItem(index, impactIndex, e.target.value)}
                                placeholder={`Impact detail ${impactIndex + 1}...`}
                              />
                              {outage.detailedImpact.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeImpactItem(index, impactIndex)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addImpactItem(index)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Impact Detail
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <Button onClick={handleSubmit} disabled={isPending} size="lg">
              {isPending ? "Creating Outages..." : `Create ${outages.length} Outage${outages.length > 1 ? "s" : ""}`}
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
              Send email notifications about the newly created outages with a comprehensive two-week schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Successfully created {createdOutages.length} outage{createdOutages.length > 1 ? "s" : ""}. Send
                notifications to stakeholders with detailed outage information and two-week schedule.
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
