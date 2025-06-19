"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Mail, Plus, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { createOutage } from "@/actions/outage-actions"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { sendOutageNotification, validateEmails } from "@/actions/email-actions"

type OutageFormValues = {
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  severity: "High" | "Medium" | "Low"
  priority: number
  category: string
  contactEmail: string
  estimatedUsers: number
}

const EnhancedOutageForm = () => {
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
  const [severity, setSeverity] = useState<"High" | "Medium" | "Low">("")
  const [priority, setPriority] = useState(1)
  const [category, setCategory] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [estimatedUsers, setEstimatedUsers] = useState(0)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAddresses, setEmailAddresses] = useState("")
  const [emailSubject, setEmailSubject] = useState("GCP Outage Notification - New Outage Scheduled")
  const [emailMessage, setEmailMessage] = useState("")
  const [createdOutage, setCreatedOutage] = useState<any>(null)
  const [emailPreview, setEmailPreview] = useState("")

  const validateForm = () => {
    if (
      !title ||
      !startDate ||
      !endDate ||
      selectedEnvironments.length === 0 ||
      !affectedModels ||
      !reason ||
      !assignee ||
      !severity ||
      !category ||
      !contactEmail
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
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
        }

        const result = await createOutage(outageData)
        setCreatedOutage(result.outage)

        toast({
          title: "Success",
          description: result.message,
        })

        // Show email notification dialog
        setShowEmailDialog(true)
      } catch (error) {
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

      setEmailPreview(result.preview)

      toast({
        title: "Notifications Sent",
        description: `Email notifications sent to ${valid.length} recipients`,
      })

      setShowEmailDialog(false)
      resetForm()
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
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Outage</CardTitle>
        <CardDescription>Fill out the form below to create a new outage.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="assignee">Assignee *</Label>
            <Input type="text" id="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Start Date *</Label>
            <Input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Start Time</Label>
            <Input type="time" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>End Date *</Label>
            <Input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>End Time</Label>
            <Input type="time" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Environments *</Label>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="env-dev"
                checked={selectedEnvironments.includes("Development")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedEnvironments([...selectedEnvironments, "Development"])
                  } else {
                    setSelectedEnvironments(selectedEnvironments.filter((env) => env !== "Development"))
                  }
                }}
              />
              <Label htmlFor="env-dev">Development</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="env-staging"
                checked={selectedEnvironments.includes("Staging")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedEnvironments([...selectedEnvironments, "Staging"])
                  } else {
                    setSelectedEnvironments(selectedEnvironments.filter((env) => env !== "Staging"))
                  }
                }}
              />
              <Label htmlFor="env-staging">Staging</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="env-production"
                checked={selectedEnvironments.includes("Production")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedEnvironments([...selectedEnvironments, "Production"])
                  } else {
                    setSelectedEnvironments(selectedEnvironments.filter((env) => env !== "Production"))
                  }
                }}
              />
              <Label htmlFor="env-production">Production</Label>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="affectedModels">Affected Models *</Label>
          <Input
            type="text"
            id="affectedModels"
            value={affectedModels}
            onChange={(e) => setAffectedModels(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="reason">Reason *</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="detailedImpact">Detailed Impact</Label>
          {detailedImpact.map((impact, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Textarea
                value={impact}
                onChange={(e) => {
                  const newDetailedImpact = [...detailedImpact]
                  newDetailedImpact[index] = e.target.value
                  setDetailedImpact(newDetailedImpact)
                }}
                className="flex-grow"
              />
              {index > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newDetailedImpact = [...detailedImpact]
                    newDetailedImpact.splice(index, 1)
                    setDetailedImpact(newDetailedImpact)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={() => setDetailedImpact([...detailedImpact, ""])}>
            <Plus className="h-4 w-4 mr-2" />
            Add Impact
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="severity">Severity *</Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as "High" | "Medium" | "Low")}>
              <SelectTrigger>
                <SelectValue placeholder="Select Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Input
              type="number"
              id="priority"
              value={priority}
              onChange={(e) => setPriority(Number.parseInt(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              type="email"
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="estimatedUsers">Estimated Users</Label>
            <Input
              type="number"
              id="estimatedUsers"
              value={estimatedUsers}
              onChange={(e) => setEstimatedUsers(Number.parseInt(e.target.value))}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button disabled={isPending} onClick={handleSubmit}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Outage
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
              Send email notification about the newly created outage with detailed information and updated schedule.
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
