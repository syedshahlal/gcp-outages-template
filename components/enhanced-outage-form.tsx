"use client"

import type React from "react"

import { useState } from "react"
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
import { CalendarIcon, Plus, X, Mail, Send, CheckCircle, Clock, Users } from "lucide-react"
import { createOutage } from "../actions/outage-actions"
import { sendOutageNotifications } from "../actions/email-actions"
import { useToast } from "@/hooks/use-toast"

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
  category: string
  contactEmail: string
  estimatedUsers: number
  outageType: "Internal" | "External" | ""
}

interface EnhancedOutageFormProps {
  onSuccess?: () => void
}

const environments = ["POC", "SBX DEV", "SBX UAT", "SBX Beta", "PROD"]
const teams = ["Infrastructure Team", "GCP L2 L3 Team", "Tableau Team", "EPAS Team", "EM Team", "Horizon Team"]
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

const environmentColors: Record<string, string> = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  "SBX Beta": "bg-orange-500",
  PROD: "bg-red-500",
}

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
    assignee: "",
    severity: "",
    category: "",
    contactEmail: "",
    estimatedUsers: 0,
    outageType: "",
  })

  const handleEnvironmentChange = (env: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        environments: [...prev.environments, env],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        environments: prev.environments.filter((e) => e !== env),
      }))
    }
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
      const outageData = {
        title: formData.title,
        startDate: new Date(`${formData.startDate}T${formData.startTime || "00:00"}`),
        endDate: new Date(`${formData.endDate}T${formData.endTime || "23:59"}`),
        environments: formData.environments,
        affectedModels: formData.affectedModels,
        reason: formData.reason,
        detailedImpact: formData.detailedImpact.filter((item) => item.trim() !== ""),
        assignee: formData.assignee,
        severity: formData.severity as "High" | "Medium" | "Low",
      }

      const result = await createOutage(outageData)

      if (result.success) {
        const newOutage = {
          ...result.outage,
          category: formData.category,
          contactEmail: formData.contactEmail,
          estimatedUsers: formData.estimatedUsers,
          outageType: formData.outageType,
        }

        setCreatedOutage(newOutage)

        // Pre-populate email fields
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
      toast({
        title: "Error",
        description: "Failed to create outage. Please try again.",
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
          title: "Email Sent",
          description: result.message,
        })
        setShowEmailDialog(false)
        resetForm()
      } else {
        toast({
          title: "Email Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Email Error",
        description: "Failed to send notification email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const resetForm = () => {
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
      assignee: "",
      severity: "",
      category: "",
      contactEmail: "",
      estimatedUsers: 0,
      outageType: "",
    })
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Schedule New Outage
          </CardTitle>
          <CardDescription>
            Create a new planned outage with detailed impact information and notification options
          </CardDescription>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {environments.map((env) => (
                  <div key={env} className="flex items-center space-x-2">
                    <Checkbox
                      id={env}
                      checked={formData.environments.includes(env)}
                      onCheckedChange={(checked) => handleEnvironmentChange(env, checked as boolean)}
                    />
                    <Label htmlFor={env} className="text-sm cursor-pointer flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${environmentColors[env]}`} />
                      {env}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.environments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.environments.map((env) => (
                    <Badge key={env} className={`${environmentColors[env]} text-white`}>
                      {env}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Team, Models, and Contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsible Team</Label>
                <Select
                  value={formData.assignee}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, assignee: value }))}
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

            {/* Detailed Impact */}
            <div className="space-y-2">
              <Label>Detailed Impact</Label>
              <div className="space-y-2">
                {formData.detailedImpact.map((impact, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={impact}
                      onChange={(e) => updateImpactItem(index, e.target.value)}
                      placeholder={`Impact detail ${index + 1}...`}
                    />
                    {formData.detailedImpact.length > 1 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => removeImpactItem(index)}>
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
            <div className="flex justify-end">
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
                      <strong>Team:</strong> {createdOutage.assignee || "Not assigned"}
                    </div>
                  </div>

                  <div>
                    <strong>Environments:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {createdOutage.environments.map((env: string) => (
                        <Badge key={env} className={`${environmentColors[env]} text-white text-xs`}>
                          {env}
                        </Badge>
                      ))}
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
                <p className="text-xs text-muted-foreground">Separate multiple email addresses with commas</p>
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
