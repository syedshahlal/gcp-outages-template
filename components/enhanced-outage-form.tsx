"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import {
  CalendarIcon,
  Plus,
  X,
  Mail,
  Send,
  CheckCircle,
  Clock,
  Users,
  RotateCcw,
  ListChecks,
  AlertTriangle,
  ChevronDown,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// Import the new config data hook
import { useConfigData } from "@/hooks/use-config-data"
import { getUserTimezone, formatDetailedDate } from "@/lib/timezone-utils"

/* -------------------------------------------------------------------------- */
/*                         Client-side helpers (API fetch)                    */
/* -------------------------------------------------------------------------- */

async function createOutage(data: any) {
  const res = await fetch("/api/outages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(errorData.message || "Failed to create outage")
  }
  return (await res.json()) as {
    success: boolean
    outage: any
    message: string
  }
}

async function sendOutageNotifications(payload: {
  recipientEmails: string[]
  subject: string
  message: string
  dashboardUrl: string
  recentOutages: any[]
}) {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to send email")
  return (await res.json()) as { success: boolean; message: string }
}

interface OutageFormData {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignees: string[]
  severity: string
  category: string
  contactEmail: string
  estimatedUsers: number
  outageType: string
}

interface EnhancedOutageFormProps {
  onSuccess?: () => void
}

export default function EnhancedOutageForm({ onSuccess }: EnhancedOutageFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [createdOutage, setCreatedOutage] = useState<any>(null)
  const [emailRecipients, setEmailRecipients] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)

  // Use the new config data hook
  const { data: configData, loading: loadingConfig, error: configError } = useConfigData()

  // Extract data from config
  const environments = configData.environments || []
  const teams = configData.teams || []
  const categories = configData.categories || []
  const severities = configData.severities || []
  const outageTypes = configData.outageTypes || []
  const timezones = configData.timezones || []

  // Form data state
  const [formData, setFormData] = useState<OutageFormData>({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    timezone: getUserTimezone(),
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

  // Handle config loading error
  useEffect(() => {
    if (configError) {
      toast({
        title: "Configuration Error",
        description: configError,
        variant: "destructive",
      })
    }
  }, [configError, toast])

  const handleEnvironmentChange = (envId: string, checked: boolean) => {
    if (envId === "all") {
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          environments: environments.map((env) => env.id),
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          environments: [],
        }))
      }
    } else {
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          environments: [...prev.environments, envId],
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          environments: prev.environments.filter((e) => e !== envId),
        }))
      }
    }
  }

  const handleTeamToggle = (teamId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(teamId)
        ? prev.assignees.filter((id) => id !== teamId)
        : [...prev.assignees, teamId],
    }))
  }

  const addImpactItem = () => {
    setFormData((prev) => ({
      ...prev,
      detailedImpact: [...prev.detailedImpact, ""],
    }))
  }

  const removeImpactItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      detailedImpact: prev.detailedImpact.filter((_, i) => i !== index),
    }))
  }

  const updateImpactItem = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      detailedImpact: prev.detailedImpact.map((item, i) => (i === index ? value : item)),
    }))
  }

  const clearAllForm = () => {
    setFormData({
      title: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      timezone: getUserTimezone(),
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
    toast({
      title: "Form Cleared",
      description: "All form fields have been reset.",
    })
  }

  const formatDateTime = (date: string, time: string, timezone?: string) => {
    const dt = new Date(`${date}T${time || "00:00"}`)
    return formatDetailedDate(dt, timezone || formData.timezone)
  }

  const calculateDuration = (
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string,
    timezone?: string,
  ) => {
    const start = new Date(`${startDate}T${startTime || "00:00"}`)
    const end = new Date(`${endDate}T${endTime || "23:59"}`)
    const hours = Math.floor((end.getTime() - start.getTime()) / 3.6e6)
    const days = Math.floor(hours / 24)
    return days ? `${days} d ${hours % 24} h` : `${hours} h`
  }

  const getEnvironmentById = (id: string) => environments.find((env) => env.id === id)
  const getTeamById = (id: string) => teams.find((team) => team.id === id)
  const getSeverityById = (id: string) => severities.find((sev) => sev.id === id)
  const getOutageTypeById = (id: string) => outageTypes.find((type) => type.id === id)
  const getCategoryById = (id: string) => categories.find((cat) => cat.id === id)

  const isAllEnvironmentsSelected = environments.length > 0 && formData.environments.length === environments.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.title || !formData.startDate || !formData.endDate || !formData.severity || !formData.outageType) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (Title, Dates, Severity, Type)",
          variant: "destructive",
        })
        return
      }

      if (formData.environments.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one environment",
          variant: "destructive",
        })
        return
      }

      // Create the outage data
      const selectedEnvironmentNames = formData.environments.map((envId) => {
        const env = getEnvironmentById(envId)
        return env ? env.name : envId
      })

      const selectedTeamNames = formData.assignees.map((teamId) => {
        const team = getTeamById(teamId)
        return team ? team.name : teamId
      })

      // Map severity and outage type to their display names
      const severityObj = getSeverityById(formData.severity)
      const outageTypeObj = getOutageTypeById(formData.outageType)

      const outageData = {
        title: formData.title,
        startDate: new Date(`${formData.startDate}T${formData.startTime || "00:00"}`),
        endDate: new Date(`${formData.endDate}T${formData.endTime || "23:59"}`),
        timezone: formData.timezone,
        environments: selectedEnvironmentNames,
        affectedModels: formData.affectedModels,
        reason: formData.reason,
        detailedImpact: formData.detailedImpact.filter((item) => item.trim() !== ""),
        assignee: selectedTeamNames.join(", "),
        severity: severityObj?.name || formData.severity,
        category: formData.category,
        contactEmail: formData.contactEmail,
        estimatedUsers: formData.estimatedUsers,
        outageType: outageTypeObj?.name || formData.outageType,
      }

      console.log("Submitting outage data:", outageData)

      const result = await createOutage(outageData)

      if (result.success) {
        const newOutage = {
          ...result.outage,
          assignees: selectedTeamNames,
        }

        setCreatedOutage(newOutage)

        // Pre-populate email fields with team emails
        const teamEmails = formData.assignees
          .map((teamId) => getTeamById(teamId)?.email)
          .filter(Boolean)
          .join(", ")

        setEmailRecipients(teamEmails)
        setEmailSubject(`GCP Planned Outage Notification - ${formData.title}`)
        setEmailMessage(
          `A new planned outage has been scheduled:\n\n${formData.title}\n\nPlease review the details in the dashboard.`,
        )

        toast({
          title: "Success",
          description: "Outage has been created successfully!",
        })

        setShowEmailDialog(true)

        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (error) {
      console.error("Error creating outage:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create outage. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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

      const result = await sendOutageNotifications({
        recipientEmails: recipients,
        subject: emailSubject,
        message: emailMessage,
        dashboardUrl: `${window.location.origin}`,
        recentOutages: [createdOutage],
      })

      if (result.success) {
        toast({
          title: "Email Notification",
          description: result.message || "Email notification processed successfully",
        })
        setShowEmailDialog(false)
        resetForm()
      } else {
        toast({
          title: "Email Status",
          description: result.message || "Email notification completed with warnings",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Email error:", error)
      toast({
        title: "Email Error",
        description: error instanceof Error ? error.message : "Failed to send notification email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const resetForm = () => {
    clearAllForm()
    setCreatedOutage(null)
    setEmailRecipients("")
    setEmailSubject("")
    setEmailMessage("")
  }

  const skipEmail = () => {
    setShowEmailDialog(false)
    resetForm()
    toast({
      title: "Outage Created",
      description: "Outage created successfully. Email notification skipped.",
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
                <CalendarIcon className="w-5 h-5" />
                Schedule New Outage
              </CardTitle>
              <CardDescription>
                Create a new planned outage with detailed impact information and notification options
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllForm}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Enhanced Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-base font-semibold text-blue-900 dark:text-blue-100">
                    Outage Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Weekly EPAS Patching"
                    required
                    className="h-12 text-lg border-2 border-blue-200 focus:border-blue-500 dark:border-blue-700 dark:focus:border-blue-400"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-base font-semibold text-blue-900 dark:text-blue-100">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="h-12 text-lg border-2 border-blue-200 focus:border-blue-500 dark:border-blue-700 dark:focus:border-blue-400">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="py-3 px-4 text-base hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                            <div>
                              <div className="font-medium">{cat.name}</div>
                              <div className="text-xs text-muted-foreground">{cat.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Priority & Type Section */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Priority & Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="severity" className="text-base font-semibold text-orange-900 dark:text-orange-100">
                    Severity *
                  </Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger className="h-12 text-lg border-2 border-orange-200 focus:border-orange-500 dark:border-orange-700 dark:focus:border-orange-400">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severities.map((sev) => (
                        <SelectItem
                          key={sev.id}
                          value={sev.id}
                          className={`py-3 px-4 text-base hover:${sev.bgColor} dark:hover:${sev.bgColor}/20`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${sev.color} flex items-center justify-center`}>
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                            <div>
                              <div className="font-medium">{sev.name}</div>
                              <div className="text-xs text-muted-foreground">{sev.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="outageType" className="text-base font-semibold text-orange-900 dark:text-orange-100">
                    Outage Type *
                  </Label>
                  <Select
                    value={formData.outageType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, outageType: value }))}
                  >
                    <SelectTrigger className="h-12 text-lg border-2 border-orange-200 focus:border-orange-500 dark:border-orange-700 dark:focus:border-orange-400">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {outageTypes.map((type) => (
                        <SelectItem
                          key={type.id}
                          value={type.id}
                          className={`py-3 px-4 text-base hover:${type.bgColor} dark:hover:${type.bgColor}/20`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${type.color} flex items-center justify-center`}>
                              {type.icon === "users" ? (
                                <Users className="w-2 h-2 text-white" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Date, Time, and Timezone Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Schedule Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="startDate" className="text-base font-semibold text-green-900 dark:text-green-100">
                    Start Date & Time *
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                      required
                      className="h-12 text-lg border-2 border-green-200 focus:border-green-500 dark:border-green-700 dark:focus:border-green-400"
                    />
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="h-12 text-lg border-2 border-green-200 focus:border-green-500 dark:border-green-700 dark:focus:border-green-400"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="endDate" className="text-base font-semibold text-green-900 dark:text-green-100">
                    End Date & Time *
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                      required
                      className="h-12 text-lg border-2 border-green-200 focus:border-green-500 dark:border-green-700 dark:focus:border-green-400"
                    />
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="h-12 text-lg border-2 border-green-200 focus:border-green-500 dark:border-green-700 dark:focus:border-green-400"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="timezone" className="text-base font-semibold text-green-900 dark:text-green-100">
                    Timezone *
                  </Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="h-12 text-lg border-2 border-green-200 focus:border-green-500 dark:border-green-700 dark:focus:border-green-400">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timezones.map((tz) => (
                        <SelectItem
                          key={tz.id}
                          value={tz.value}
                          className="py-3 px-4 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col">
                              <span className="font-medium">{tz.label}</span>
                              <span className="text-xs text-muted-foreground">{tz.offset}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Duration Preview */}
            {formData.startDate && formData.endDate && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duration:</strong>{" "}
                  {calculateDuration(
                    formData.startDate,
                    formData.startTime,
                    formData.endDate,
                    formData.endTime,
                    formData.timezone,
                  )}
                  <br />
                  <strong>Start:</strong> {formatDateTime(formData.startDate, formData.startTime, formData.timezone)}
                  <br />
                  <strong>End:</strong> {formatDateTime(formData.endDate, formData.endTime, formData.timezone)}
                  <br />
                  <strong>Timezone:</strong>{" "}
                  {timezones.find((tz) => tz.value === formData.timezone)?.label || formData.timezone}
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced Environments Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded bg-white"></div>
                </div>
                Affected Environments *
              </h3>
              <div className="space-y-4">
                {/* Enhanced Select All Option */}
                <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-sm">
                  <Checkbox
                    id="all-environments"
                    checked={isAllEnvironmentsSelected}
                    onCheckedChange={(checked) => handleEnvironmentChange("all", checked as boolean)}
                    className="w-5 h-5"
                  />
                  <Label
                    htmlFor="all-environments"
                    className="text-base cursor-pointer flex items-center gap-3 font-semibold text-purple-900 dark:text-purple-100"
                  >
                    <ListChecks className="w-5 h-5" />
                    Select All Environments
                  </Label>
                </div>

                {/* Enhanced Individual Environments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-sm"
                    >
                      <Checkbox
                        id={env.id}
                        checked={formData.environments.includes(env.id)}
                        onCheckedChange={(checked) => handleEnvironmentChange(env.id, checked as boolean)}
                        className="w-5 h-5"
                      />
                      <Label htmlFor={env.id} className="text-base cursor-pointer flex items-center gap-3 flex-1">
                        <div className={`w-4 h-4 rounded-full ${env.color} shadow-sm`} />
                        <div>
                          <div className="font-semibold">{env.name}</div>
                          <div className="text-sm text-muted-foreground">{env.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.environments.length > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    Selected Environments:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.environments.map((envId) => {
                      const env = getEnvironmentById(envId)
                      return env ? (
                        <Badge key={envId} className={`${env.color} text-white text-sm px-3 py-1 shadow-sm`}>
                          {env.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Teams Section */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <h3 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Responsible Teams
              </h3>
              {teams.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border-2 border-dashed border-cyan-200 dark:border-cyan-700 rounded-lg">
                  <Users className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                  <p className="text-lg font-medium">No teams available</p>
                  <p className="text-sm">Please check the configuration.</p>
                </div>
              ) : (
                <Popover open={teamDropdownOpen} onOpenChange={setTeamDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={teamDropdownOpen}
                      className="w-full justify-between h-12 text-lg border-2 border-cyan-200 focus:border-cyan-500 dark:border-cyan-700 dark:focus:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                      onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {formData.assignees.length === 0
                          ? "Select teams..."
                          : `${formData.assignees.length} team${formData.assignees.length > 1 ? "s" : ""} selected`}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search teams..." className="h-12 text-base" />
                      <CommandList>
                        <CommandEmpty className="py-6 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No teams found.</p>
                        </CommandEmpty>
                        <CommandGroup>
                          {teams.map((team) => (
                            <CommandItem
                              key={team.id}
                              value={team.id}
                              onSelect={(value) => {
                                console.log("Team selected:", value, team.name)
                                handleTeamToggle(team.id)
                              }}
                              className="cursor-pointer py-4 px-4 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                            >
                              <Check
                                className={`mr-3 h-5 w-5 ${
                                  formData.assignees.includes(team.id) ? "opacity-100 text-cyan-600" : "opacity-0"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="font-semibold text-base">{team.name}</div>
                                <div className="text-sm text-muted-foreground">{team.description}</div>
                                <div className="text-sm text-cyan-600 dark:text-cyan-400">{team.email}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {formData.assignees.length > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <div className="text-sm font-medium text-cyan-900 dark:text-cyan-100 mb-2">Selected Teams:</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.assignees.map((teamId) => {
                      const team = getTeamById(teamId)
                      return team ? (
                        <Badge
                          key={teamId}
                          variant="secondary"
                          className="flex items-center gap-2 text-sm px-3 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                        >
                          <Users className="w-3 h-3" />
                          {team.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Removing team:", team.name)
                              handleTeamToggle(teamId)
                            }}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Contact and Users */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="contactEmail" className="text-base font-semibold">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                  className="h-12 text-lg border-2 focus:border-blue-500"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="estimatedUsers" className="text-base font-semibold">
                  Estimated Users Affected
                </Label>
                <Input
                  id="estimatedUsers"
                  type="number"
                  min="0"
                  value={formData.estimatedUsers}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estimatedUsers: Number.parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  className="h-12 text-lg border-2 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Affected Models */}
            <div className="space-y-3">
              <Label htmlFor="affectedModels" className="text-base font-semibold">
                Affected Models/Services
              </Label>
              <Input
                id="affectedModels"
                value={formData.affectedModels}
                onChange={(e) => setFormData((prev) => ({ ...prev, affectedModels: e.target.value }))}
                placeholder="e.g., All models in POC environment, User authentication service"
                className="h-12 text-lg border-2 focus:border-blue-500"
              />
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <Label htmlFor="reason" className="text-base font-semibold">
                Reason for Outage
              </Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the reason for this planned outage..."
                rows={3}
                className="resize-none h-24 text-lg border-2 focus:border-blue-500"
              />
            </div>

            {/* Critical Impact Assessment */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <Label className="text-lg font-semibold">Critical Impact Assessment</Label>
              </div>
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Important:</strong> Please provide detailed impact information to help stakeholders understand
                  the scope and severity of this outage.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Detailed Impact Items</Label>
                {formData.detailedImpact.map((impact, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-1">
                      <Textarea
                        value={impact}
                        onChange={(e) => updateImpactItem(index, e.target.value)}
                        placeholder={`Impact detail ${index + 1}: Describe specific systems, users, or processes affected...`}
                        rows={2}
                        className="resize-none h-20 text-lg border-2 focus:border-blue-500"
                      />
                    </div>
                    {formData.detailedImpact.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeImpactItem(index)}
                        className="shrink-0 mt-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImpactItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Impact Detail
                </Button>
              </div>
            </div>

            {/* Enhanced Submit Button */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={clearAllForm} size="lg" className="px-8">
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Outage
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email Notification Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Outage Notification
            </DialogTitle>
            <DialogDescription>
              Your outage has been created successfully. Send notification emails to stakeholders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Created Outage Preview */}
            {createdOutage && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Created Outage
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-lg">{createdOutage.title}</h4>
                      <p className="text-sm text-muted-foreground">ID: #{createdOutage.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {createdOutage.severity && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">{createdOutage.severity}</Badge>
                      )}
                      {createdOutage.outageType && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          {createdOutage.outageType}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Start:</strong>{" "}
                      {formatDateTime(formData.startDate, formData.startTime, formData.timezone)}
                    </div>
                    <div>
                      <strong>End:</strong> {formatDateTime(formData.endDate, formData.endTime, formData.timezone)}
                    </div>
                    <div>
                      <strong>Duration:</strong>{" "}
                      {calculateDuration(
                        formData.startDate,
                        formData.startTime,
                        formData.endDate,
                        formData.endTime,
                        formData.timezone,
                      )}
                    </div>
                    <div>
                      <strong>Teams:</strong> {createdOutage.assignees?.join(", ") || "Not assigned"}
                    </div>
                  </div>

                  <div>
                    <strong>Environments:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {createdOutage.environments.map((envName: string) => {
                        const env = environments.find((e) => e.name === envName)
                        return (
                          <Badge key={envName} className={`${env?.color || "bg-gray-500"} text-white text-xs`}>
                            {envName}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  {createdOutage.estimatedUsers > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        <strong>Estimated Users Affected:</strong> {createdOutage.estimatedUsers.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {createdOutage.reason && (
                    <div>
                      <strong>Reason:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{createdOutage.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Email Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailRecipients">Email Recipients *</Label>
                <Textarea
                  id="emailRecipients"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="Enter email addresses separated by commas (e.g., user1@company.com, user2@company.com)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple email addresses with commas. Team emails are pre-populated based on selected teams.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSubject">Subject</Label>
                <Input
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailMessage">Additional Message</Label>
                <Textarea
                  id="emailMessage"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Optional additional message to include in the email"
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
                      Send Notification
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
