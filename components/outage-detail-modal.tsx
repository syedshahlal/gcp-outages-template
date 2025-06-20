"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Users, AlertTriangle, Server, Mail, Hash, Tag } from "lucide-react"

interface OutageData {
  id: number
  title: string
  startDate: Date
  endDate: Date
  environments: string[]
  affectedModels: string
  reason: string
  detailedImpact: string[]
  assignee: string
  status: string
  type: string
  severity: "High" | "Medium" | "Low"
  priority?: number
  category?: string
  contactEmail?: string
  estimatedUsers?: number
  createdAt?: Date
  updatedAt?: Date
}

interface OutageDetailModalProps {
  outage: OutageData | null
  isOpen: boolean
  onClose: () => void
}

const environmentColors = {
  POC: "bg-blue-500",
  "SBX DEV": "bg-green-500",
  "SBX UAT": "bg-yellow-500",
  "SBX Beta": "bg-orange-500",
  PROD: "bg-red-500",
}

const severityColors = {
  High: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  Medium:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  Low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
}

export function OutageDetailModal({ outage, isOpen, onClose }: OutageDetailModalProps) {
  if (!outage) return null

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      const remainingHours = diffHours % 24
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ${remainingHours > 0 ? `${remainingHours} hour${remainingHours > 1 ? "s" : ""}` : ""}`
    }
    return `${diffHours} hour${diffHours > 1 ? "s" : ""}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">{outage.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={severityColors[outage.severity]} variant="outline">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {outage.severity} Impact
                </Badge>
                <Badge variant="secondary">
                  <Hash className="w-3 h-3 mr-1" />
                  {outage.id}
                </Badge>
                {outage.priority && (
                  <Badge variant="outline">
                    <Tag className="w-3 h-3 mr-1" />
                    Priority {outage.priority}
                  </Badge>
                )}
                {outage.category && (
                  <Badge variant="outline">
                    <Tag className="w-3 h-3 mr-1" />
                    {outage.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timeline Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Timeline Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Start Time
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{formatDateTime(outage.startDate)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    End Time
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{formatDateTime(outage.endDate)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Total Duration
                </div>
                <Badge variant="secondary" className="text-sm">
                  {getDuration(outage.startDate, outage.endDate)}
                </Badge>
              </div>
              {outage.createdAt && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="w-4 h-4" />
                      Created
                    </div>
                    <span className="text-sm text-muted-foreground">{outage.createdAt.toLocaleString()}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Affected Environments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5" />
                Affected Environments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outage.environments.map((env) => (
                  <div
                    key={env}
                    className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`${environmentColors[env as keyof typeof environmentColors]} text-white text-sm`}
                      >
                        {env}
                      </Badge>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">AFFECTED</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {env} environment will be impacted during this outage
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Impact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5" />
                Detailed Impact Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {outage.detailedImpact.map((impact, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{impact}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Technical Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Affected Models/Services</div>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{outage.affectedModels}</p>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Outage Reason</div>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{outage.reason}</p>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Outage Type</div>
                  <Badge variant="outline">{outage.type}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Status</div>
                  <Badge variant="secondary">{outage.status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team & Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Users className="w-4 h-4" />
                    Responsible Team
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {outage.assignee}
                  </Badge>
                </div>
                {outage.contactEmail && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Mail className="w-4 h-4" />
                      Contact Email
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{outage.contactEmail}</p>
                  </div>
                )}
                {outage.estimatedUsers && outage.estimatedUsers > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Users className="w-4 h-4" />
                      Estimated Users Affected
                    </div>
                    <Badge variant="destructive" className="text-sm">
                      {outage.estimatedUsers.toLocaleString()} users
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Impact Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{outage.environments.length}</div>
                  <div className="text-xs text-muted-foreground">
                    Environment{outage.environments.length > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {getDuration(outage.startDate, outage.endDate).split(" ")[0]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getDuration(outage.startDate, outage.endDate).includes("day") ? "Days" : "Hours"}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{outage.detailedImpact.length}</div>
                  <div className="text-xs text-muted-foreground">Impact Areas</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{outage.severity}</div>
                  <div className="text-xs text-muted-foreground">Severity Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
