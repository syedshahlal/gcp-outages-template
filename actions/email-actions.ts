"use server"

import { createTransporter, SENDER_EMAIL } from "@/lib/email-config"

export interface EmailNotificationData {
  recipientEmails: string[]
  subject?: string
  message?: string
  dashboardUrl?: string
  recentOutages?: any[]
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
}

function getPriorityStyles(priority: string): string {
  switch (priority) {
    case "High":
      return "background: #fee2e2; color: #dc2626;"
    case "Medium":
      return "background: #fef3c7; color: #d97706;"
    case "Low":
      return "background: #dcfce7; color: #16a34a;"
    default:
      return "background: #f3f4f6; color: #374151;"
  }
}

function getTypeStyles(type: string): string {
  switch (type) {
    case "External":
      return "background: #dbeafe; color: #1d4ed8;"
    case "Internal":
      return "background: #f3e8ff; color: #7c3aed;"
    default:
      return "background: #f3f4f6; color: #374151;"
  }
}

// Generate HTML email template with enhanced styling
function generateEmailHTML(outages: OutageEmailData[]): string {
  const outageCards = outages
    .map(
      (outage) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 16px 0; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${outage.title}</h3>
        <div style="display: flex; gap: 8px;">
          <span style="padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; ${getPriorityStyles(outage.priority)}">${outage.priority}</span>
          ${outage.outageType ? `<span style="padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; ${getTypeStyles(outage.outageType)}">${outage.outageType}</span>` : ""}
        </div>
      </div>
      
      <p style="color: #6b7280; margin: 8px 0;">${outage.description || outage.impact}</p>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0;">
        <div>
          <strong style="color: #374151;">Start:</strong> ${new Date(outage.startDate).toLocaleString()}
        </div>
        <div>
          <strong style="color: #374151;">End:</strong> ${new Date(outage.endDate).toLocaleString()}
        </div>
        <div>
          <strong style="color: #374151;">Duration:</strong> ${outage.duration}
        </div>
        <div>
          <strong style="color: #374151;">Team:</strong> ${outage.team}
        </div>
      </div>
      
      <div style="margin: 12px 0;">
        <strong style="color: #374151;">Environments:</strong>
        ${outage.environments.map((env) => `<span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin: 0 4px; font-size: 12px;">${env}</span>`).join("")}
      </div>
      
      <div style="margin: 12px 0;">
        <strong style="color: #374151;">Impact:</strong> ${outage.impact}
      </div>
      
      <div style="margin: 12px 0;">
        <strong style="color: #374151;">Contact:</strong> ${outage.contactEmail}
      </div>
    </div>
  `,
    )
    .join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GCP Planned Outage Notification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin-bottom: 8px;">GCP Planned Outage Notification</h1>
        <p style="color: #6b7280; margin: 0;">New planned outage(s) have been scheduled</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <h2 style="color: #1f2937; margin-top: 0;">Summary</h2>
        <p><strong>${outages.length}</strong> new outage(s) scheduled</p>
        <p><strong>High Priority:</strong> ${outages.filter((o) => o.priority === "High").length}</p>
        <p><strong>Medium Priority:</strong> ${outages.filter((o) => o.priority === "Medium").length}</p>
        <p><strong>Low Priority:</strong> ${outages.filter((o) => o.priority === "Low").length}</p>
        <p><strong>External Outages:</strong> ${outages.filter((o) => o.outageType === "External").length}</p>
        <p><strong>Internal Outages:</strong> ${outages.filter((o) => o.outageType === "Internal").length}</p>
      </div>
      
      <h2 style="color: #1f2937;">Outage Details</h2>
      ${outageCards}
      
      <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #6b7280;">This is an automated notification from the GCP Planned Outages Management System</p>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">Sent from: ${SENDER_EMAIL}</p>
      </div>
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

  let subject = "GCP Planned Outage Notification - New Outage Scheduled"
  let message = ""
  let dashboardUrl = ""

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

    const htmlContent =
      (message ? `<p style="margin-bottom:20px;">${message}</p>` : "") +
      generateEmailHTML(outageList) +
      (dashboardUrl
        ? `<p style="margin-top:30px;"><a href="${dashboardUrl}" style="color:#3b82f6;">View in Dashboard</a></p>`
        : "")

    if (isPreview) {
      // In preview mode, just return the email content for inspection
      return {
        success: true,
        isPreview: true,
        message: `📧 PREVIEW MODE: Email content generated for ${emailList.length} recipient(s). No actual emails sent in v0 preview environment.`,
        emailPreview: {
          from: SENDER_EMAIL,
          to: emailList,
          subject,
          html: htmlContent,
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
      })
    })

    await Promise.all(emailPromises)
    return {
      success: true,
      isPreview: false,
      message: `✅ REAL EMAILS SENT: ${emailList.length} notification(s) sent successfully from ${SENDER_EMAIL}`,
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
