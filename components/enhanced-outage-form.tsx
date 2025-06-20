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

async function fetchConfig(type: "environments" | "teams") {
  const res = await fetch(`/api/config?type=${type}`)
  if (!res.ok) throw new Error(`Failed to fetch ${type} config`)
  return await res.json()
}

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
  assignees: string[] // Changed from assignee to assignees (multiple)
  severity: "High" | "Medium" | "Low" | ""
  category: string
  contactEmail: string
  estimatedUsers: number
  outageType: "Internal" | "External" | ""
}

interface EnhancedOutageFormProps {
  onSuccess?: () => void
}

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
  High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  Medium:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
}

const typeColors: Record<string, string> = {
  Internal:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  External: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
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

  // Configuration data
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)

  const [formData, setFormData] = useState<OutageFormData>({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    environments: [],
    affectedModels: "",
    reason: "",
    detailedImpact: [""],
    assignees: [], // Changed to array
    severity: "",
    category: "",
    contactEmail: "",
    estimatedUsers: 0,
    outageType: "",
  })

  // Load configuration data on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [envConfig, teamConfig] = await Promise.all([fetchConfig("environments"), fetchConfig("teams")])

        console.log("Loaded environment config:", envConfig)
        console.log("Loaded team config:", teamConfig)

        setEnvironments(Array.isArray(envConfig.environments) ? envConfig.environments : envConfig)
        setTeams(Array.isArray(teamConfig.teams) ? teamConfig.teams : teamConfig)
      } catch (error) {
        console.error("Failed to load configuration:", error)
        toast({
          title: "Configuration Error",
          description: "Failed to load environments and teams from configuration files.",
          variant: "destructive",
        })

        // Only set empty arrays as fallback - let user know data failed to load
        setEnvironments([])
        setTeams([])
      } finally {
        setLoadingConfig(false)
      }
    }

    loadConfig()
  }, [toast])

  const handleEnvironmentChange = (envId: string, checked: boolean) => {
    if (envId === "all") {
      if (checked) {
        // Select all environments
        setFormData((prev) => ({
          ...prev,
          environments: environments.map((env) => env.id),
        }))
      } else {
        // Deselect all environments
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

  const formatDateTime = (date: string, time: string) => {
    return new Date(`${date}T${time || "00:00"}`).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateDuration = (startDate: string, startTime: string, endDate: string, endTime: string) => {
    const start = new Date(`${startDate}T${startTime || "00:00"}`)
    const end = new Date(`${endDate}T${endTime || "23:59"}`)
    const hours = Math.floor((end.getTime() - start.getTime()) / 3.6e6)
    const days = Math.floor(hours / 24)
    return days ? `${days} d ${hours % 24} h` : `${hours} h`
  }

  const getEnvironmentById = (id: string) => environments.find((env) => env.id === id)
  const getTeamById = (id: string) => teams.find((team) => team.id === id)

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

      const outageData = {
        title: formData.title,
        startDate: new Date(`${formData.startDate}T${formData.startTime || "00:00"}`),
        endDate: new Date(`${formData.endDate}T${formData.endTime || "23:59"}`),
        environments: selectedEnvironmentNames,
        affectedModels: formData.affectedModels,
        reason: formData.reason,
        detailedImpact: formData.detailedImpact.filter((item) => item.trim() !== ""),
        assignee: selectedTeamNames.join(", "), // Convert array to string for backend compatibility
        severity: formData.severity as "High" | "Medium" | "Low",
      }

      console.log("Submitting outage data:", outageData)

      const result = await createOutage(outageData)

      if (result.success) {
        const newOutage = {
          ...result.outage,
          category: formData.category,
          contactEmail: formData.contactEmail,
          estimatedUsers: formData.estimatedUsers,
          outageType: formData.outageType,
          assignees: selectedTeamNames, // Keep array for display
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

        // Show email notification dialog
        setShowEmailDialog(true)

        // Call onSuccess callback
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

      console.log("Sending email to:", recipients)

      const result = await sendOutageNotifications({
        recipientEmails: recipients,
        subject: emailSubject,
        message: emailMessage,
        dashboardUrl: `${window.location.origin}`,
        recentOutages: [createdOutage],
      })

      console.log("Email result:", result)

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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Outage Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Weekly EPAS Patching"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Severity and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value as any }))}
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
              <div className="space-y-2">
                <Label htmlFor="outageType">Outage Type *</Label>
                <Select
                  value={formData.outageType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, outageType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="External">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time *</Label>
                <div className="flex gap-2">
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time *</Label>
                <div className="flex gap-2">
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Duration Preview */}
            {formData.startDate && formData.endDate && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duration:</strong>{" "}
                  {calculateDuration(formData.startDate, formData.startTime, formData.endDate, formData.endTime)}
                  <br />
                  <strong>Start:</strong> {formatDateTime(formData.startDate, formData.startTime)}
                  <br />
                  <strong>End:</strong> {formatDateTime(formData.endDate, formData.endTime)}
                </AlertDescription>
              </Alert>
            )}

            {/* Environments */}
            <div className="space-y-2">
              <Label>Affected Environments *</Label>
              <div className="space-y-3">
                {/* Select All Option */}
                <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                  <Checkbox
                    id="all-environments"
                    checked={isAllEnvironmentsSelected}
                    onCheckedChange={(checked) => handleEnvironmentChange("all", checked as boolean)}
                  />
                  <Label
                    htmlFor="all-environments"
                    className="text-sm cursor-pointer flex items-center gap-2 font-medium"
                  >
                    <ListChecks className="w-4 h-4" />
                    Select All Environments
                  </Label>
                </div>

                {/* Individual Environments */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {environments.map((env) => (
                    <div key={env.id} className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox
                        id={env.id}
                        checked={formData.environments.includes(env.id)}
                        onCheckedChange={(checked) => handleEnvironmentChange(env.id, checked as boolean)}
                      />
                      <Label htmlFor={env.id} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                        <div className={`w-3 h-3 rounded-full ${env.color}`} />
                        <div>
                          <div className="font-medium">{env.name}</div>
                          <div className="text-xs text-muted-foreground">{env.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.environments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.environments.map((envId) => {
                    const env = getEnvironmentById(envId)
                    return env ? (
                      <Badge key={envId} className={`${env.color} text-white`}>
                        {env.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* Responsible Teams - Multi-select Dropdown */}
            <div className="space-y-2">
              <Label>Responsible Teams</Label>
              {teams.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground border rounded-md">
                  <p>No teams available. Please check the configuration.</p>
                </div>
              ) : (
                <Popover open={teamDropdownOpen} onOpenChange={setTeamDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={teamDropdownOpen}
                      className="w-full justify-between"
                      onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    >
                      {formData.assignees.length === 0
                        ? "Select teams..."
                        : `${formData.assignees.length} team${formData.assignees.length > 1 ? "s" : ""} selected`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search teams..." />
                      <CommandList>
                        <CommandEmpty>No teams found.</CommandEmpty>
                        <CommandGroup>
                          {teams.map((team) => (
                            <CommandItem
                              key={team.id}
                              value={team.id}
                              onSelect={(value) => {
                                console.log("Team selected:", value, team.name)
                                handleTeamToggle(team.id)
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.assignees.includes(team.id) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{team.name}</div>
                                <div className="text-xs text-muted-foreground">{team.description}</div>
                                <div className="text-xs text-blue-600">{team.email}</div>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.assignees.map((teamId) => {
                    const team = getTeamById(teamId)
                    return team ? (
                      <Badge key={teamId} variant="secondary" className="flex items-center gap-1">
                        {team.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log("Removing team:", team.name)
                            handleTeamToggle(teamId)
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* Contact and Users */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedUsers">Estimated Users Affected</Label>
                <Input
                  id="estimatedUsers"
                  type="number"
                  min="0"
                  value={formData.estimatedUsers}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estimatedUsers: Number.parseInt(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* Affected Models */}
            <div className="space-y-2">
              <Label htmlFor="affectedModels">Affected Models/Services</Label>
              <Input
                id="affectedModels"
                value={formData.affectedModels}
                onChange={(e) => setFormData((prev) => ({ ...prev, affectedModels: e.target.value }))}
                placeholder="e.g., All models in POC environment, User authentication service"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Outage</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the reason for this planned outage..."
                rows={3}
              />
            </div>

            {/* Critical Impact Assessment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <Label className="text-base font-semibold">Critical Impact Assessment</Label>
              </div>
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Important:</strong> Please provide detailed impact information to help stakeholders understand
                  the scope and severity of this outage.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Detailed Impact Items</Label>
                {formData.detailedImpact.map((impact, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={impact}
                        onChange={(e) => updateImpactItem(index, e.target.value)}
                        placeholder={`Impact detail ${index + 1}: Describe specific systems, users, or processes affected...`}
                        rows={2}
                        className="resize-none"
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

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={clearAllForm}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? "Creating..." : "Create Outage"}
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
                        <Badge className={severityColors[createdOutage.severity]}>{createdOutage.severity}</Badge>
                      )}
                      {createdOutage.outageType && (
                        <Badge className={typeColors[createdOutage.outageType]}>{createdOutage.outageType}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Start:</strong> {formatDateTime(formData.startDate, formData.startTime)}
                    </div>
                    <div>
                      <strong>End:</strong> {formatDateTime(formData.endDate, formData.endTime)}
                    </div>
                    <div>
                      <strong>Duration:</strong>{" "}
                      {calculateDuration(formData.startDate, formData.startTime, formData.endDate, formData.endTime)}
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
