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
import { CalendarIcon, Plus, X } from "lucide-react"
import { createOutage } from "../actions/outage-actions"
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
}

const environments = ["POC", "SBX DEV", "SBX UAT", "PROD"]
const teams = ["Infrastructure Team", "GCP L2 L3 Team", "Tableau Team", "EPAS Team", "EM Team", "Horizon Team"]

export function OutageForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.title || !formData.startDate || !formData.endDate || !formData.severity) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
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

      await createOutage(outageData)

      toast({
        title: "Success",
        description: "Outage has been created successfully",
      })

      // Reset form
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
      })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Schedule New Outage
        </CardTitle>
        <CardDescription>Create a new planned outage with detailed impact information</CardDescription>
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

          {/* Environments */}
          <div className="space-y-2">
            <Label>Affected Environments</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {environments.map((env) => (
                <div key={env} className="flex items-center space-x-2">
                  <Checkbox
                    id={env}
                    checked={formData.environments.includes(env)}
                    onCheckedChange={(checked) => handleEnvironmentChange(env, checked as boolean)}
                  />
                  <Label htmlFor={env} className="text-sm cursor-pointer">
                    {env}
                  </Label>
                </div>
              ))}
            </div>
            {formData.environments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.environments.map((env) => (
                  <Badge key={env} variant="secondary">
                    {env}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Team and Models */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="affectedModels">Affected Models</Label>
              <Input
                id="affectedModels"
                value={formData.affectedModels}
                onChange={(e) => setFormData((prev) => ({ ...prev, affectedModels: e.target.value }))}
                placeholder="e.g., All models in POC environment"
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Outage"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
