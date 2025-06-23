"use server"

import { createTransporter, SENDER_EMAIL } from "@/lib/email-config"
import * as XLSX from "xlsx"
import type { Buffer } from "buffer"

export interface EmailNotificationData {
  recipientEmails: string[]
  subject?: string
  message?: string
  dashboardUrl?: string
  recentOutages?: any[]
  includeAttachment?: boolean
}

interface OutageEmailData {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  duration: string
  team: string
  environments: string[]
  priority: "Low" | "Medium" | "High"
  category: string
  contactEmail: string
  impact: string
  outageType?: "Internal" | "External"
  estimatedUsers?: number
  timezone?: string
  reason?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

function getPriorityStyles(priority: string): string {
  switch (priority) {
    case "High":
      return "background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;"
    case "Medium":
      return "background: #fef3c7; color: #d97706; border: 1px solid #fde047;"
    case "Low":
      return "background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;"
    default:
      return "background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;"
  }
}

function getTypeStyles(type: string): string {
  switch (type) {
    case "External":
      return "background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe;"
    case "Internal":
      return "background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe;"
    default:
      return "background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;"
  }
}

// Helper function to safely get values with fallbacks
function safeValue(value: any, fallback = "Not specified"): string {
  if (value === undefined || value === null || value === "") {
    return fallback
  }
  return String(value)
}

// Helper function to format duration
function formatDuration(startDate: string, endDate: string, providedDuration?: string): string {
  if (providedDuration && providedDuration !== "undefined") {
    return providedDuration
  }

  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`
    } else {
      const diffDays = Math.round(diffHours / 24)
      return `${diffDays} day${diffDays !== 1 ? "s" : ""}`
    }
  } catch {
    return "Duration not calculated"
  }
}

// Generate Excel attachment with outage details
function generateExcelAttachment(outages: OutageEmailData[]): Buffer {
  const worksheetData = outages.map((outage, index) => ({
    "Outage #": index + 1,
    ID: safeValue(outage.id, "N/A"),
    Title: safeValue(outage.title, "Untitled Outage"),
    Description: safeValue(outage.description, "No description provided"),
    Priority: safeValue(outage.priority, "Medium"),
    Type: safeValue(outage.outageType, "Internal"),
    Status: safeValue(outage.status, "Scheduled"),
    Category: safeValue(outage.category, "Maintenance"),
    "Start Date": new Date(outage.startDate).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    "End Date": new Date(outage.endDate).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    Duration: formatDuration(outage.startDate, outage.endDate, outage.duration),
    Environments:
      outage.environments && outage.environments.length > 0
        ? outage.environments.join(", ")
        : "No environments specified",
    "Assigned Team": safeValue(outage.team, "Not assigned"),
    "Contact Email": safeValue(outage.contactEmail, "No contact provided"),
    Reason: safeValue(outage.reason, "No reason provided"),
    "Impact Details": safeValue(outage.impact, "Impact details not specified"),
    "Estimated Users Affected": outage.estimatedUsers || 0,
    "Created At": outage.createdAt ? new Date(outage.createdAt).toLocaleString() : "N/A",
    "Last Updated": outage.updatedAt ? new Date(outage.updatedAt).toLocaleString() : "N/A",
  }))

  // Create workbook with multiple sheets
  const workbook = XLSX.utils.book_new()

  // Main outages sheet
  const mainWorksheet = XLSX.utils.json_to_sheet(worksheetData)

  // Set column widths for better readability
  const columnWidths = [
    { wch: 10 }, // Outage #
    { wch: 20 }, // ID
    { wch: 25 }, // Title
    { wch: 40 }, // Description
    { wch: 12 }, // Priority
    { wch: 12 }, // Type
    { wch: 12 }, // Status
    { wch: 15 }, // Category
    { wch: 25 }, // Start Date
    { wch: 25 }, // End Date
    { wch: 12 }, // Duration
    { wch: 30 }, // Environments
    { wch: 20 }, // Assigned Team
    { wch: 25 }, // Contact Email
    { wch: 30 }, // Reason
    { wch: 40 }, // Impact Details
    { wch: 15 }, // Estimated Users
    { wch: 20 }, // Created At
    { wch: 20 }, // Last Updated
  ]

  mainWorksheet["!cols"] = columnWidths
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, "Outage Details")

  // Summary sheet
  const summaryData = [
    { Metric: "Total Outages", Value: outages.length },
    { Metric: "High Priority", Value: outages.filter((o) => (o.priority || "Medium") === "High").length },
    { Metric: "Medium Priority", Value: outages.filter((o) => (o.priority || "Medium") === "Medium").length },
    { Metric: "Low Priority", Value: outages.filter((o) => (o.priority || "Medium") === "Low").length },
    { Metric: "External Outages", Value: outages.filter((o) => (o.outageType || "Internal") === "External").length },
    { Metric: "Internal Outages", Value: outages.filter((o) => (o.outageType || "Internal") === "Internal").length },
    { Metric: "Total Users Affected", Value: outages.reduce((sum, o) => sum + (o.estimatedUsers || 0), 0) },
    { Metric: "Report Generated", Value: new Date().toLocaleString() },
  ]

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
  summaryWorksheet["!cols"] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary")

  // Environment breakdown sheet
  const envBreakdown = new Map<string, number>()
  outages.forEach((outage) => {
    if (outage.environments && outage.environments.length > 0) {
      outage.environments.forEach((env) => {
        envBreakdown.set(env, (envBreakdown.get(env) || 0) + 1)
      })
    }
  })

  const envData = Array.from(envBreakdown.entries()).map(([env, count]) => ({
    Environment: env,
    "Outage Count": count,
    Percentage: `${((count / outages.length) * 100).toFixed(1)}%`,
  }))

  if (envData.length > 0) {
    const envWorksheet = XLSX.utils.json_to_sheet(envData)
    envWorksheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, envWorksheet, "Environment Impact")
  }

  // Generate buffer
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

// Generate enhanced full-width HTML email template
function generateEmailHTML(outages: OutageEmailData[]): string {
  const outageCards = outages
    .map((outage) => {
      const safePriority = safeValue(outage.priority, "Medium")
      const safeType = safeValue(outage.outageType, "Internal")
      const safeTeam = safeValue(outage.team, "Not assigned")
      const safeCategory = safeValue(outage.category, "Maintenance")
      const safeImpact = safeValue(outage.impact, "Service may be temporarily unavailable")
      const safeDescription = safeValue(outage.description, "Planned maintenance activity")
      const safeContactEmail = safeValue(outage.contactEmail, "support@company.com")
      const safeReason = safeValue(outage.reason, "Maintenance required")
      const safeDuration = formatDuration(outage.startDate, outage.endDate, outage.duration)

      return `
        <tr>
          <td style="padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; margin: 20px 0; overflow: hidden;">
              <!-- Header Section -->
              <tr>
                <td style="padding: 24px 32px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align: top;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                          <span style="color: #16a34a; font-size: 18px; margin-right: 8px;">✅</span>
                          <span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">Created Outage</span>
                        </div>
                        <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 22px; font-weight: 700; line-height: 1.3;">${safeValue(outage.title, "Scheduled Maintenance")}</h2>
                        <div style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">
                          <strong>ID:</strong> ${safeValue(outage.id, "N/A")} • 
                          <strong>Duration:</strong> ${safeDuration}
                        </div>
                      </td>
                      <td style="text-align: right; vertical-align: top; white-space: nowrap;">
                        <div style="margin-bottom: 8px;">
                          <span style="padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; ${getPriorityStyles(safePriority)}">${safePriority}</span>
                        </div>
                        <div>
                          <span style="padding: 6px 14px; border-radius: 16px; font-size: 12px; font-weight: 500; ${getTypeStyles(safeType)}">${safeType}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Description Section -->
              <tr>
                <td style="padding: 24px 32px;">
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Description</h3>
                    <p style="color: #374151; margin: 0; font-size: 15px; line-height: 1.6;">${safeDescription}</p>
                  </div>
                  
                  <!-- Schedule and Responsibility Grid -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                      <td width="48%" style="vertical-align: top; padding-right: 16px;">
                        <div style="background: #fef7f0; padding: 20px; border-radius: 10px; border-left: 4px solid #f97316; height: 100%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 20px; margin-right: 8px;">⏰</span>
                            <strong style="color: #ea580c; font-size: 15px; font-weight: 700;">SCHEDULE</strong>
                          </div>
                          <div style="color: #9a3412; font-size: 14px; line-height: 1.5;">
                            <div style="margin-bottom: 8px;">
                              <strong>Start:</strong><br>
                              ${new Date(outage.startDate).toLocaleString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZoneName: "short",
                              })}
                            </div>
                            <div>
                              <strong>End:</strong><br>
                              ${new Date(outage.endDate).toLocaleString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZoneName: "short",
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="vertical-align: top; padding-left: 16px;">
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border-left: 4px solid #0284c7; height: 100%;">
                          <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 20px; margin-right: 8px;">👥</span>
                            <strong style="color: #0369a1; font-size: 15px; font-weight: 700;">RESPONSIBILITY</strong>
                          </div>
                          <div style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">
                            <div style="margin-bottom: 8px;">
                              <strong>Teams:</strong><br>
                              ${safeTeam}
                            </div>
                            <div>
                              <strong>Contact:</strong><br>
                              <a href="mailto:${safeContactEmail}" style="color: #0284c7; text-decoration: none; font-weight: 500;">${safeContactEmail}</a>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Environments Section -->
                  <div style="margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 15px; font-weight: 600;">Environments:</h4>
                    <div>
                      ${
                        outage.environments && outage.environments.length > 0
                          ? outage.environments
                              .map((env) => {
                                // Color coding for different environments
                                let envColor = "#e0e7ff; color: #3730a3" // default blue
                                if (env.toLowerCase().includes("prod"))
                                  envColor = "#fee2e2; color: #dc2626" // red for prod
                                else if (env.toLowerCase().includes("dev"))
                                  envColor = "#dcfce7; color: #16a34a" // green for dev
                                else if (env.toLowerCase().includes("uat"))
                                  envColor = "#fef3c7; color: #d97706" // yellow for uat
                                else if (env.toLowerCase().includes("beta")) envColor = "#f3e8ff; color: #7c3aed" // purple for beta

                                return `<span style="background: ${envColor}; padding: 6px 12px; border-radius: 16px; margin: 0 8px 6px 0; font-size: 13px; font-weight: 500; display: inline-block;">${env}</span>`
                              })
                              .join("")
                          : '<span style="color: #6b7280; font-style: italic;">No specific environments listed</span>'
                      }
                    </div>
                  </div>
                  
                  <!-- Reason Section -->
                  <div style="margin-bottom: 20px; padding: 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                    <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 15px; font-weight: 600;">Reason:</h4>
                    <p style="color: #1e3a8a; margin: 0; font-size: 14px; line-height: 1.5;">${safeReason}</p>
                  </div>
                  
                  <!-- Impact Section -->
                  <div style="margin-bottom: 20px; padding: 16px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde047;">
                    <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 15px; font-weight: 600;">Impact Details</h4>
                    <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">${safeImpact}</p>
                  </div>
                  
                  <!-- Category -->
                  <div style="margin-bottom: 16px;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">Category: </span>
                    <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">${safeCategory}</span>
                  </div>
                  
                  ${
                    outage.estimatedUsers && outage.estimatedUsers > 0
                      ? `
                  <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 10px; padding: 16px; margin-top: 20px;">
                    <div style="display: flex; align-items: center;">
                      <span style="font-size: 18px; margin-right: 10px;">⚠️</span>
                      <strong style="color: #92400e; font-size: 16px;">Estimated Users Affected: ${outage.estimatedUsers.toLocaleString()}</strong>
                    </div>
                  </div>
                  `
                      : ""
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    })
    .join("")

  // Calculate summary statistics with safe fallbacks
  const totalUsers = outages.reduce((sum, o) => sum + (o.estimatedUsers || 0), 0)
  const criticalCount = outages.filter((o) => (o.priority || "Medium") === "High").length
  const mediumCount = outages.filter((o) => (o.priority || "Medium") === "Medium").length
  const lowCount = outages.filter((o) => (o.priority || "Medium") === "Low").length
  const externalCount = outages.filter((o) => (o.outageType || "Internal") === "External").length
  const internalCount = outages.filter((o) => (o.outageType || "Internal") === "Internal").length

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>GCP Planned Outage Notification</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; min-height: 100vh;">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <!-- Main Container -->
            <table width="100%" style="max-width: 800px;" cellpadding="0" cellspacing="0">
              
              <!-- Header -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; overflow: hidden;">
                    <tr>
                      <td style="padding: 40px 32px; text-align: center; color: white;">
                        <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; line-height: 1.2;">🚨 GCP Planned Outage Notification</h1>
                        <p style="margin: 0; font-size: 18px; opacity: 0.95; font-weight: 400;">New outage(s) have been created and require your attention</p>
                        <div style="margin-top: 16px; padding: 12px 24px; background: rgba(255,255,255,0.2); border-radius: 20px; display: inline-block;">
                          <span style="font-size: 16px; font-weight: 600;">📎 Detailed report attached</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Executive Summary -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: white;">
                    <tr>
                      <td style="padding: 32px;">
                        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); padding: 28px; border-radius: 12px; border: 2px solid #c7d2fe;">
                          <h2 style="color: #1e40af; margin: 0 0 24px 0; font-size: 22px; font-weight: 700;">
                            <span style="font-size: 24px; margin-right: 8px;">📊</span>
                            Executive Summary
                          </h2>
                          
                          <!-- Summary Grid -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="20%" style="text-align: center; padding: 20px 10px; background: white; border-radius: 10px; border: 1px solid #e0e7ff; vertical-align: top;">
                                <div style="font-size: 28px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">${outages.length}</div>
                                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">New Outages</div>
                              </td>
                              <td width="4%"></td>
                              ${
                                criticalCount > 0
                                  ? `
                              <td width="20%" style="text-align: center; padding: 20px 10px; background: #fef2f2; border-radius: 10px; border: 1px solid #fecaca; vertical-align: top;">
                                <div style="font-size: 28px; font-weight: 700; color: #dc2626; margin-bottom: 6px;">${criticalCount}</div>
                                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">High Priority</div>
                              </td>
                              <td width="4%"></td>
                              `
                                  : `
                              <td width="20%" style="text-align: center; padding: 20px 10px; background: #fef3c7; border-radius: 10px; border: 1px solid #fde047; vertical-align: top;">
                                <div style="font-size: 28px; font-weight: 700; color: #d97706; margin-bottom: 6px;">${mediumCount}</div>
                                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Medium Priority</div>
                              </td>
                              <td width="4%"></td>
                              `
                              }
                              <td width="20%" style="text-align: center; padding: 20px 10px; background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe; vertical-align: top;">
                                <div style="font-size: 28px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px;">${externalCount}</div>
                                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">External</div>
                              </td>
                              <td width="4%"></td>
                              <td width="20%" style="text-align: center; padding: 20px 10px; background: #f3e8ff; border-radius: 10px; border: 1px solid #d8b4fe; vertical-align: top;">
                                <div style="font-size: 28px; font-weight: 700; color: #7c3aed; margin-bottom: 6px;">${internalCount}</div>
                                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Internal</div>
                              </td>
                            </tr>
                          </table>
                          
                          ${
                            totalUsers > 0
                              ? `
                          <div style="margin-top: 20px; text-align: center; padding: 16px; background: #fefce8; border-radius: 10px; border: 1px solid #fde047;">
                            <div style="font-size: 24px; font-weight: 700; color: #ca8a04; margin-bottom: 4px;">${totalUsers.toLocaleString()}</div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Total Users Affected</div>
                          </div>
                          `
                              : ""
                          }
                          
                          ${
                            criticalCount > 0
                              ? `
                          <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 10px; padding: 20px; margin-top: 24px; text-align: center;">
                            <div style="color: #dc2626; font-size: 16px; font-weight: 700;">
                              <span style="font-size: 20px; margin-right: 8px;">🚨</span>
                              Critical Alert: ${criticalCount} high-priority outage(s) created
                            </div>
                          </div>
                          `
                              : ""
                          }
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Attachment Notice -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: white;">
                    <tr>
                      <td style="padding: 0 32px 24px 32px;">
                        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 10px; border: 2px solid #10b981; text-align: center;">
                          <div style="color: #065f46; font-size: 18px; font-weight: 700; margin-bottom: 8px;">
                            <span style="font-size: 24px; margin-right: 8px;">📎</span>
                            Detailed Excel Report Attached
                          </div>
                          <p style="color: #047857; margin: 0; font-size: 14px;">
                            A comprehensive Excel file with all outage details, summary statistics, and environment breakdown is attached to this email for your records and analysis.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Detailed Outage Information -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: white;">
                    <tr>
                      <td style="padding: 0 32px 32px 32px;">
                        <h2 style="color: #1f2937; margin: 0 0 24px 0; font-size: 24px; font-weight: 700;">
                          <span style="font-size: 26px; margin-right: 8px;">📋</span>
                          Created Outage Details
                        </h2>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${outageCards}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Call to Action -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: white;">
                    <tr>
                      <td style="padding: 0 32px 32px 32px;">
                        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 32px; border-radius: 12px; text-align: center; border: 2px solid #cbd5e1;">
                          <h3 style="color: #475569; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Need More Information?</h3>
                          <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">Access the full dashboard for real-time updates, detailed timeline views, and additional management tools.</p>
                          <a href="${process.env.NEXT_PUBLIC_APP_URL || "#"}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                            🔗 Open Dashboard
                          </a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border-radius: 0 0 16px 16px;">
                    <tr>
                      <td style="padding: 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                          This is an automated notification from the GCP Planned Outages Management System
                        </p>
                        <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">
                          Generated on ${new Date().toLocaleString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })}
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                          Sent from: ${SENDER_EMAIL}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// Check if we're in a preview/development environment
function isPreviewEnvironment(): boolean {
  return !process.env.SMTP_HOST || typeof window !== "undefined" || process.env.NODE_ENV === "development"
}

export async function sendOutageNotifications(
  emailsOrPayload: string[] | EmailNotificationData,
  outages?: OutageEmailData[],
) {
  // Normalize inputs
  let emailList: string[] = []
  let outageList: OutageEmailData[] = Array.isArray(outages) ? outages : []

  let subject = "🚨 GCP Planned Outage Notification - New Outages Created"
  let message = ""
  let dashboardUrl = ""
  let includeAttachment = true

  if (Array.isArray(emailsOrPayload)) {
    emailList = emailsOrPayload
  } else if (emailsOrPayload && typeof emailsOrPayload === "object") {
    emailList = Array.isArray(emailsOrPayload.recipientEmails)
      ? emailsOrPayload.recipientEmails
      : typeof emailsOrPayload.recipientEmails === "string"
        ? emailsOrPayload.recipientEmails.split(",").map((e) => e.trim())
        : []

    subject = emailsOrPayload.subject || subject
    message = emailsOrPayload.message || message
    dashboardUrl = emailsOrPayload.dashboardUrl || dashboardUrl
    includeAttachment = emailsOrPayload.includeAttachment !== false
    outageList =
      Array.isArray(emailsOrPayload.recentOutages) && emailsOrPayload.recentOutages.length
        ? (emailsOrPayload.recentOutages as OutageEmailData[])
        : outageList
  }

  if (!emailList.length) {
    return { success: false, message: "No valid recipient emails supplied." }
  }

  const isPreview = isPreviewEnvironment()

  try {
    const transporter = createTransporter()
    const htmlContent = generateEmailHTML(outageList)

    // Generate Excel attachment if requested and outages exist
    const attachments: any[] = []
    if (includeAttachment && outageList.length > 0) {
      const excelBuffer = generateExcelAttachment(outageList)
      const timestamp = new Date().toISOString().split("T")[0]

      attachments.push({
        filename: `GCP_Outages_Report_${timestamp}.xlsx`,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    }

    if (isPreview) {
      // In preview mode, just return the email content for inspection
      return {
        success: true,
        isPreview: true,
        message: `📧 PREVIEW MODE: Email content generated for ${emailList.length} recipient(s). ${attachments.length > 0 ? "Excel attachment prepared." : "No attachment."} No actual emails sent in v0 preview environment.`,
        emailPreview: {
          from: SENDER_EMAIL,
          to: emailList,
          subject,
          html: htmlContent,
          attachments: attachments.map((att) => ({
            filename: att.filename,
            size: `${Math.round(att.content.length / 1024)}KB`,
            type: att.contentType,
          })),
        },
      }
    }

    // Real SMTP sending (production environment)
    const emailPromises = emailList.map(async (email) => {
      await transporter.sendMail({
        from: SENDER_EMAIL,
        to: email,
        subject,
        html: htmlContent,
        attachments: attachments,
      })
    })

    await Promise.all(emailPromises)
    return {
      success: true,
      isPreview: false,
      message: `✅ REAL EMAILS SENT: ${emailList.length} notification(s) sent successfully from ${SENDER_EMAIL}${attachments.length > 0 ? " with Excel attachment" : ""}`,
    }
  } catch (error) {
    console.error("Email sending failed:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send notifications",
    }
  }
}

export async function validateEmails(emails: string[]): Promise<{ valid: string[]; invalid: string[] }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valid: string[] = []
  const invalid: string[] = []

  emails.forEach((email) => {
    const trimmed = email.trim()
    if (emailRegex.test(trimmed)) {
      valid.push(trimmed)
    } else {
      invalid.push(trimmed)
    }
  })

  return { valid, invalid }
}

export const sendOutageNotification = sendOutageNotifications
