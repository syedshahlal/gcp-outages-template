"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Clock, Plus } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const ENVIRONMENTS = ["POC", "SBX DEV", "SBX UAT", "SBX Beta", "PROD"] as const
const SEVERITIES = ["Low", "Medium", "High"] as const
const OUTAGE_TYPES = ["Internal", "External"] as const

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  environments: z.array(z.string()).min(1, "Select at least one environment"),
  affectedModels: z.string().min(3, "Affected models must be at least 3 characters"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  detailedImpact: z.string().min(10, "Impact description must be at least 10 characters"),
  assignee: z.string().min(2, "Assignee name must be at least 2 characters"),
  severity: z.enum(SEVERITIES),
  outageType: z.enum(OUTAGE_TYPES),
  contactEmail: z.string().email("Valid email is required"),
  estimatedUsers: z.number().min(0, "Must be 0 or greater").optional(),
  category: z.string().optional(),
  notificationEmails: z.string().optional(),
  sendNotification: z.boolean().default(false),
})

type FormData = z.infer<typeof formSchema>

interface EnhancedOutageFormProps {
  onSuccess?: () => void
}

export default function EnhancedOutageForm({ onSuccess }: EnhancedOutageFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      environments: [],
      affectedModels: "",
      reason: "",
      detailedImpact: "",
      assignee: "",
      severity: "Medium",
      outageType: "Internal",
      contactEmail: "",
      estimatedUsers: 0,
      category: "",
      notificationEmails: "",
      sendNotification: false,
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)

      // Validate date range
      if (data.endDate <= data.startDate) {
        toast({
          title: "Invalid Date Range",
          description: "End date must be after start date",
          variant: "destructive",
        })
        return
      }

      // Prepare outage data
      const outageData = {
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        environments: data.environments,
        affectedModels: data.affectedModels,
        reason: data.reason,
        detailedImpact: data.detailedImpact.split('\n').filter(line => line.trim()),
        assignee: data.assignee,
        severity: data.severity,
        outageType: data.outageType,
        contactEmail: data.contactEmail,
        estimatedUsers: data.estimatedUsers || 0,
        category: data.category || "General",
      }

      // Create outage via API
      const response = await fetch('/api/outages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outageData),
      })

      if (!response.ok) {
        throw new Error('Failed to create outage')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to create outage')
      }

      toast({
        title: "Outage Created",
        description: `Successfully created outage: ${data.title}`,
      })

      // Send notification if requested
      if (data.sendNotification && data.notificationEmails) {
        try {
          setIsSendingNotification(true)
          
          const emailList = data.notificationEmails
            .split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0)

          if (emailList.length > 0) {
            const notificationResponse = await fetch('/api/notify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipientEmails: emailList,
                subject: `New Planned Outage: ${data.title}`,
                message: `A new planned outage has been scheduled. Please review the details in the dashboard.`,
                recentOutages: [result.outage],
              }),
            })

            const notificationResult = await notificationResponse.json()

            if (notificationResult.success) {
              toast({
                title: "Notification Sent",
                description: notificationResult.message,
              })
            } else {
              toast({
                title: "Notification Failed",
                description: notificationResult.message,
                variant: "destructive",
              })
            }
          }
        } catch (notificationError) {
          console.error('Notification error:', notificationError)
          toast({
            title: "Notification Error",
            description: "Outage created but notification failed to send",
            variant: "destructive",
          })
        } finally {
          setIsSendingNotification(false)
        }
      }

      // Reset form
      form.reset()
      
      // Call success callback
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('Error creating outage:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create outage",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const watchedEnvironments = form.watch("environments")
  const watchedSeverity = form.watch("severity")
  const watchedOutageType = form.watch("outageType")
  const watchedSendNotification = form.watch("sendNotification")

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High": return "bg-red-100 text-red-800 border-red-200"
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "External": return "bg-blue-100 text-blue-800 border-blue-200"
      case "Internal": return "bg-purple-100 text-purple-800 border-purple-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Schedule New Outage
        </CardTitle>
        <CardDescription>
          Create a new planned outage with detailed information and optional notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outage Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Database Maintenance - User Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEVERITIES.map((severity) => (
                            <SelectItem key={severity} value={severity}>
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(severity)}>{severity}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outage Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OUTAGE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <Badge className={getTypeColor(type)}>{type}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Date and Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date & Time *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick start date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date & Time *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick end date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Environments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Affected Environments</h3>
              
              <FormField
                control={form.control}
                name="environments"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Environments *</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ENVIRONMENTS.map((env) => (
                        <FormField
                          key={env}
                          control={form.control}
                          name="environments"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={env}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(env)}
                                    onCheckedChange={(\
