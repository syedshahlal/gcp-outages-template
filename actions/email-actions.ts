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
  estimatedUsers?: number
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

// Generate enhanced HTML email template with comprehensive outage information
function generateEmailHTML(outages: OutageEmailData[]): string {
  const outageCards = outages
    .map(
      (outage) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 20px 0; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 600;">${outage.title}</h3>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 14px; color: #6b7280;">ID: ${outage.id}</span>
            <span style="color: #d1d5db;">•</span>
            <span style="font-size: 14px; color: #6b7280;">Duration: ${outage.duration}</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
          <div style="display: flex; gap: 8px;">
            <span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${getPriorityStyles(outage.priority)}">${outage.priority} Priority</span>
            ${outage.outageType ? `<span style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${getTypeStyles(outage.outageType)}">${outage.outageType}</span>` : ""}
          </div>
        </div>
      </div>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #374151; margin: 0; font-size: 15px; line-height: 1.5;">${outage.description || outage.impact}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
        <div style="background: #fef7f0; padding: 16px; border-radius: 8px; border-left: 4px solid #f97316;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 18px;">⏰</span>
            <strong style="color: #ea580c; font-size: 14px;">SCHEDULE</strong>
          </div>
          <div style="color: #9a3412; font-size: 14px; line-height: 1.4;">
            <div><strong>Start:</strong> ${new Date(outage.startDate).toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}</div>
            <div style="margin-top: 4px;"><strong>End:</strong> ${new Date(outage.endDate).toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}</div>
          </div>
        </div>
        
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #0284c7;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 18px;">👥</span>
            <strong style="color: #0369a1; font-size: 14px;">RESPONSIBILITY</strong>
          </div>
          <div style="color: #0c4a6e; font-size: 14px;">
            <div><strong>Team:</strong> ${outage.team}</div>
            <div style="margin-top: 4px;"><strong>Contact:</strong> <a href="mailto:${outage.contactEmail}" style="color: #0284c7; text-decoration: none;">${outage.contactEmail}</a></div>
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151; font-size: 14px;">Affected Environments:</strong>
          <div style="margin-top: 6px;">
            ${outage.environments.map((env) => `<span style="background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 16px; margin: 0 6px 4px 0; font-size: 12px; font-weight: 500; display: inline-block;">${env}</span>`).join("")}
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151; font-size: 14px;">Impact Details:</strong>
          <div style="color: #6b7280; font-size: 14px; margin-top: 4px; background: #f9fafb; padding: 12px; border-radius: 6px;">
            ${outage.impact}
          </div>
        </div>
        
        ${
          outage.category
            ? `
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151; font-size: 14px;">Category:</strong>
          <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-size: 12px;">${outage.category}</span>
        </div>
        `
            : ""
        }
      </div>
      
      ${
        outage.estimatedUsers
          ? `
      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">⚠️</span>
          <strong style="color: #92400e;">Estimated Users Affected: ${outage.estimatedUsers.toLocaleString()}</strong>
        </div>
      </div>
      `
          : ""
      }
    </div>
  `,
    )
    .join("")

  // Enhanced summary section with actionable insights
  const totalUsers = outages.reduce((sum, o) => sum + (o.estimatedUsers || 0), 0)
  const criticalCount = outages.filter((o) => o.priority === "High").length
  const externalCount = outages.filter((o) => o.outageType === "External").length

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GCP Planned Outage Notification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">GCP Planned Outage Notification</h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">New scheduled outage(s) require your attention</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); padding: 24px; border-radius: 12px; margin-bottom: 32px; border: 1px solid #c7d2fe;">
            <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">📊</span>
              Executive Summary
            </h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px;">
              <div style="text-align: center; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e0e7ff;">
                <div style="font-size: 24px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">${outages.length}</div>
                <div style="font-size: 12px; color: #6b7280; font-weight: 500;">TOTAL OUTAGES</div>
              </div>
              ${
                criticalCount > 0
                  ? `
              <div style="text-align: center; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <div style="font-size: 24px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">${criticalCount}</div>
                <div style="font-size: 12px; color: #6b7280; font-weight: 500;">HIGH PRIORITY</div>
              </div>
              `
                  : ""
              }
              ${
                externalCount > 0
                  ? `
              <div style="text-align: center; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="font-size: 24px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px;">${externalCount}</div>
                <div style="font-size: 12px; color: #6b7280; font-weight: 500;">EXTERNAL</div>
              </div>
              `
                  : ""
              }
              ${
                totalUsers > 0
                  ? `
              <div style="text-align: center; padding: 16px; background: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
                <div style="font-size: 20px; font-weight: 700; color: #ca8a04; margin-bottom: 4px;">${totalUsers.toLocaleString()}</div>
                <div style="font-size: 12px; color: #6b7280; font-weight: 500;">USERS AFFECTED</div>
              </div>
              `
                  : ""
              }
            </div>
            
            ${
              criticalCount > 0
                ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 20px;">
              <div style="display: flex; align-items: center; gap: 8px; color: #dc2626;">
                <span style="font-size: 20px;">🚨</span>
                <strong>Critical Alert: ${criticalCount} high-priority outage(s) scheduled</strong>
              </div>
            </div>
            `
                : ""
            }
          </div>
          
          <h2 style="color: #1f2937; margin: 0 0 24px 0; font-size: 22px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">📋</span>
            Detailed Outage Information
          </h2>
          ${outageCards}
          
          <div style="margin-top: 40px; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; text-align: center; border: 1px solid #cbd5e1;">
            <h3 style="color: #475569; margin: 0 0 12px 0; font-size: 16px;">Need More Information?</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">Access the full dashboard for real-time updates, detailed timeline views, and additional management tools.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
              🔗 Open Dashboard
            </a>
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
              This is an automated notification from the GCP Planned Outages Management System<br>
              Generated on ${new Date().toLocaleString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
              })}<br>
              Sent from: ${SENDER_EMAIL}
            </p>
          </div>
        </div>
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
