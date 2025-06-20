"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Plus, Trash2, CalendarIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { createOutage } from "@/actions/data-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { sendOutageNotification, validateEmails } from "@/actions/email-actions"
import { Badge } from "@/components/ui/badge"

const environments = ["POC", "SBX DEV", "SBX UAT", "SBX Beta", "PROD"]
const teams = ["Infrastructure Team", "GCP L2 L3 Team", "Tableau Team", "EPAS Team", "EM Team", "Horizon Team"]
const categories = ["Maintenance", "Security Update", "Infrastructure Upgrade", "Emergency Fix", "Planned Migration"]

const environmentColors = {
  POC: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
  "SBX DEV": "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
  "SBX UAT": "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
  "SBX Beta": "bg-orange-600 hover:bg-orange-700 text-white border-orange-600",
  PROD: "bg-red-600 hover:bg-red-700 text-white border-red-600",
}

const severityColors = {
  High: "bg-red-50 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300",
  Medium:
    "bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300",
  Low: "bg-green-50 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300",
}

interface EnhancedOutageFormProps {
  onSuccess?: () => void
}

const EnhancedOutageForm = ({ onSuccess }: EnhancedOutageFormProps) => {
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [affectedModels, setAffectedModels] = useState("")
  const [reason, setReason] = useState("")
  const [detailedImpact, setDetailedImpact] = useState([""])
  const [assignee, setAssignee] = useState("")
  const [severity, setSeverity] = useState<"High" | "Medium" | "Low" | "">("")
  const [priority, setPriority] = useState(1)
  const [category, setCategory] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [estimatedUsers, setEstimatedUsers] = useState(0)
  const [outageType, setOutageType] = useState<"Internal" | "External">("Internal") // New field
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddresses, setEmailAddresses] = useState("")
  const [emailSubject, setEmailSubject] = useState("GCP Planned Outage Notification - New Outage Scheduled")
  const [emailMessage, setEmailMessage] = useState("")
  const [createdOutage, setCreatedOutage] = useState<any>(null)
  const [emailPreview, setEmailPreview] = useState("")

  const allEnvironmentsSelected = environments.every((env) => selectedEnvironments.includes(env))

  const handleEnvironmentChange = (env: string, checked: boolean) => {
    if (env === "ALL") {
      if (checked) {
        setSelectedEnvironments([...environments])
      } else {
        setSelectedEnvironments([])
      }
    } else {
      if (checked) {
        setSelectedEnvironments([...selectedEnvironments, env])
      } else {
        setSelectedEnvironments(selectedEnvironments.filter((e) => e !== env))
      }
    }
  }

  const addImpactItem = () => {
    setDetailedImpact([...detailedImpact, ""])
  }

  const removeImpactItem = (index: number) => {
    if (detailedImpact.length > 1) {
      setDetailedImpact(detailedImpact.filter((_, i) => i !== index))
    }
  }

  const updateImpactItem = (index: number, value: string) => {
    const newDetailedImpact = [...detailedImpact]
    newDetailedImpact[index] = value
    setDetailedImpact(newDetailedImpact)
  }

  const validateForm = () => {
    if (!title || !startDate || !endDate || !severity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Start Date, End Date, Severity).",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    startTransition(async () => {
      try {
        const outageData = {
          title,
          startDate: new Date(`${startDate}T${startTime || "00:00"}`),
          endDate: new Date(`${endDate}T${endTime || "23:59"}`),
          environments: selectedEnvironments,
          affectedModels,
          reason,
          detailedImpact: detailedImpact.filter((item) => item.trim() !== ""),
          assignee,
          severity: severity as "High" | "Medium" | "Low",
          priority,
          category,
          contactEmail,
          estimatedUsers,
          outageType, // Include the new field
        }

        const result = await createOutage(outageData)
        setCreatedOutage(result.outage)

        toast({
          title: "Success",
          description: result.message,
        })

        setShowEmailDialog(true)
      } catch (error) {
        console.error("Error creating outage:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create outage",
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
        recentOutages: [createdOutage],
      })

      setEmailPreview(result.preview || "")

      toast({
        title: "Notifications Sent",
        description: result.message,
      })

      setShowEmailDialog(false)
      resetForm()
      setEmailAddresses("")
      setEmailMessage("")

      if (onSuccess) onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setTitle("")
    setStartDate("")
    setStartTime("")
    setEndDate("")
    setEndTime("")
    setSelectedEnvironments([])
    setAffectedModels("")
    setReason("")
    setDetailedImpact([""])
    setAssignee("")
    setSeverity("")
    setPriority(1)
    setCategory("")
    setContactEmail("")
    setEstimatedUsers(0)
    setOutageType("Internal")
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarIcon className="w-6 h-6" />
          Schedule New Planned Outage
        </CardTitle>
        <CardDescription>
          Create a new planned outage with detailed impact information. All fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title and Severity Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Outage Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Outage title"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="severity" className="text-sm font-semibold">
              Severity *
            </Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as "High" | "Medium" | "Low")}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    High Impact
                  </div>
                </SelectItem>
                <SelectItem value="Medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Medium Impact
                  </div>
                </SelectItem>
                <SelectItem value="Low">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Low Impact
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date and Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Start Date & Time *</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11"
                required
              />
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">End Date & Time *</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11"
                required
              />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11" />
            </div>
          </div>
        </div>

        {/* Priority, Category, Users, Type Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Priority</Label>
            <Select value={priority.toString()} onValueChange={(value) => setPriority(Number.parseInt(value))}>
              <SelectTrigger className="h-11">
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
            <Label className="text-sm font-semibold">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Outage Type *</Label>
            <Select value={outageType} onValueChange={(value) => setOutageType(value as "Internal" | "External")}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Internal">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Internal
                  </div>
                </SelectItem>
                <SelectItem value="External">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    External
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Estimated Users Affected</Label>
            <Input
              type="number"
              min="0"
              value={estimatedUsers}
              onChange={(e) => setEstimatedUsers(Number.parseInt(e.target.value) || 0)}
              placeholder="0"
              className="h-11"
            />
          </div>
        </div>

        {/* Team and Contact Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Responsible Team</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-11">
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
            <Label className="text-sm font-semibold">Contact Email</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="team@company.com"
              className="h-11"
            />
          </div>
        </div>

        {/* Affected Environments */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Affected Environments</Label>
          <div className="space-y-3">
            {/* ALL Option */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-900">
              <Checkbox
                id="env-all"
                checked={allEnvironmentsSelected}
                onCheckedChange={(checked) => handleEnvironmentChange("ALL", checked as boolean)}
                className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <Label htmlFor="env-all" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600">ALL</Badge>
                Select all environments
              </Label>
            </div>

            {/* Individual Environments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {environments.map((env) => (
                <div
                  key={env}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <Checkbox
                    id={`env-${env}`}
                    checked={selectedEnvironments.includes(env)}
                    onCheckedChange={(checked) => handleEnvironmentChange(env, checked as boolean)}
                  />
                  <Label htmlFor={`env-${env}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Badge className={environmentColors[env as keyof typeof environmentColors]}>{env}</Badge>
                  </Label>
                </div>
              ))}
            </div>

            {/* Selected Environments Display */}
            {selectedEnvironments.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Selected Environments ({selectedEnvironments.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEnvironments.map((env) => (
                    <Badge key={env} className={environmentColors[env as keyof typeof environmentColors]}>
                      {env}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Affected Models */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Affected Models</Label>
          <Input
            value={affectedModels}
            onChange={(e) => setAffectedModels(e.target.value)}
            placeholder="e.g., All models in POC environment"
            className="h-11"
          />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Reason for Outage</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the reason for this planned outage..."
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Detailed Impact */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Detailed Impact</Label>
          <div className="space-y-3">
            {detailedImpact.map((impact, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={impact}
                    onChange={(e) => updateImpactItem(index, e.target.value)}
                    placeholder={`Impact detail ${index + 1}...`}
                    className="h-11"
                  />
                </div>
                {detailedImpact.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeImpactItem(index)}
                    className="h-11 w-11 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addImpactItem} className="flex items-center gap-2 h-11">
              <Plus className="w-4 h-4" />
              Add Impact Detail
            </Button>
          </div>
        </div>

        {/* Severity and Type Preview */}
        {(severity || outageType) && (
          <div className={`p-4 rounded-lg border-2 ${severityColors[severity] || "bg-gray-50 border-gray-300"}`}>
            <div className="flex items-center gap-2 font-medium">
              <div
                className={`w-3 h-3 rounded-full ${
                  severity === "High" ? "bg-red-500" : severity === "Medium" ? "bg-yellow-500" : "bg-green-500"
                }`}
              ></div>
              {severity} Impact {outageType} Outage Preview
            </div>
            <div className="text-sm mt-1 opacity-90">
              This {outageType.toLowerCase()} outage will be classified as {severity.toLowerCase()} impact affecting{" "}
              {selectedEnvironments.length} environment{selectedEnvironments.length !== 1 ? "s" : ""}.
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetForm} disabled={isPending}>
          Reset Form
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="min-w-32">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Outage"
          )}
        </Button>
      </CardFooter>

      {/* Email Notification Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Outage Notification
            </DialogTitle>
            <DialogDescription>
              Send email notification about the newly created outage. Emails will be sent from sr.shahlal@gmail.com.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Successfully created outage "{createdOutage?.title}". Send notifications to stakeholders with detailed
                outage information.
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
    </Card>
  )
}

export default EnhancedOutageForm
