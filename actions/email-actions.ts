"use server"

import nodemailer from "nodemailer"
import { createCanvas } from "canvas"
import { getOutages } from "./data-actions"

interface EmailNotificationData {
  recipientEmails: string[]
  outage: {
    id: number
    title: string
    startDate: Date
    endDate: Date
    environments: string[]
    affectedModels: string
    reason: string
    detailedImpact: string[]
    assignee: string
    severity: "High" | "Medium" | "Low"
    priority?: number
    category?: string
    contactEmail?: string
    estimatedUsers?: number
    status: string
    type: string
    createdAt: Date
  }
  dashboardUrl: string
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "ethereal.user@ethereal.email",
      pass: process.env.SMTP_PASS || "ethereal.pass",
    },
  })
}

// Generate Gantt chart visualization using canvas
async function generateGanttChartImage(outages: any[]): Promise<string> {
  try {
    const canvas = createCanvas(1200, 600)
    const ctx = canvas.getContext("2d")

    // Set background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 1200, 600)

    // Header
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 24px Arial"
    ctx.fillText("GCP Outages Timeline", 50, 40)

    // Subtitle
    ctx.font = "16px Arial"
    ctx.fillStyle = "#6b7280"
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 50, 65)
    ctx.fillText(`Total Outages: ${outages.length}`, 50, 85)

    if (outages.length === 0) {
      ctx.font = "18px Arial"
      ctx.fillStyle = "#9ca3af"
      ctx.fillText("No outages scheduled", 50, 300)
      return canvas.toDataURL()
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date(Math.min(now.getTime(), ...outages.map((o) => new Date(o.startDate).getTime())))
    const endDate = new Date(Math.max(now.getTime(), ...outages.map((o) => new Date(o.endDate).getTime())))
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Chart area
    const chartX = 250
    const chartY = 120
    const chartWidth = 900
    const chartHeight = 400
    const rowHeight = 35

    // Draw chart background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight)
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight)

    // Draw timeline header
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(chartX, chartY, chartWidth, 40)
    ctx.strokeStyle = "#d1d5db"
    ctx.strokeRect(chartX, chartY, chartWidth, 40)

    // Draw date labels
    ctx.fillStyle = "#374151"
    ctx.font = "12px Arial"
    const daysToShow = Math.min(totalDays, 30)
    for (let i = 0; i <= daysToShow; i += Math.max(1, Math.floor(daysToShow / 10))) {
      const currentDate = new Date(startDate)
      currentDate.setDate(currentDate.getDate() + i)
      const x = chartX + (i / daysToShow) * chartWidth

      // Draw vertical grid line
      ctx.strokeStyle = "#e5e7eb"
      ctx.beginPath()
      ctx.moveTo(x, chartY)
      ctx.lineTo(x, chartY + chartHeight)
      ctx.stroke()

      // Date label
      ctx.fillStyle = "#374151"
      ctx.fillText(`${currentDate.getMonth() + 1}/${currentDate.getDate()}`, x + 5, chartY + 25)
    }

    // Draw outages
    const maxOutagesToShow = Math.floor((chartHeight - 40) / rowHeight)
    const outagesSlice = outages.slice(0, maxOutagesToShow)

    outagesSlice.forEach((outage, index) => {
      const y = chartY + 40 + index * rowHeight
      const outageStart = new Date(outage.startDate)
      const outageEnd = new Date(outage.endDate)

      // Calculate position and width
      const startPercent = Math.max(
        0,
        (outageStart.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()),
      )
      const endPercent = Math.min(
        1,
        (outageEnd.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()),
      )
      const durationPercent = endPercent - startPercent

      const barX = chartX + startPercent * chartWidth
      const barWidth = Math.max(durationPercent * chartWidth, 20)

      // Draw outage label
      ctx.fillStyle = "#1f2937"
      ctx.font = "12px Arial"
      const labelText = `${outage.title.substring(0, 25)}${outage.title.length > 25 ? "..." : ""}`
      ctx.fillText(labelText, 20, y + 15)

      ctx.font = "10px Arial"
      ctx.fillStyle = "#6b7280"
      ctx.fillText(`#${outage.id} - ${outage.assignee}`, 20, y + 28)

      // Severity colors
      const severityColors = {
        High: "#ef4444",
        Medium: "#f59e0b",
        Low: "#10b981",
      }

      const color = severityColors[outage.severity as keyof typeof severityColors] || "#6b7280"

      // Draw outage bar
      ctx.fillStyle = color
      ctx.fillRect(barX, y + 2, barWidth, 25)

      // Draw border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.strokeRect(barX, y + 2, barWidth, 25)

      // Draw duration text if bar is wide enough
      if (barWidth > 60) {
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 10px Arial"
        const duration = Math.round((outageEnd.getTime() - outageStart.getTime()) / (1000 * 60 * 60))
        ctx.fillText(`${duration}h`, barX + 5, y + 17)
      }

      // Draw severity badge
      ctx.fillStyle = color
      ctx.fillRect(200, y + 5, 40, 18)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9px Arial"
      ctx.fillText(outage.severity.toUpperCase(), 205, y + 16)
    })

    // Legend
    const legendY = chartY + chartHeight + 30
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 16px Arial"
    ctx.fillText("Impact Levels:", 50, legendY)

    const legendItems = [
      { color: "#ef4444", label: "High Impact", count: outages.filter((o) => o.severity === "High").length },
      { color: "#f59e0b", label: "Medium Impact", count: outages.filter((o) => o.severity === "Medium").length },
      { color: "#10b981", label: "Low Impact", count: outages.filter((o) => o.severity === "Low").length },
    ]

    legendItems.forEach((item, index) => {
      const x = 50 + index * 150

      // Color box
      ctx.fillStyle = item.color
      ctx.fillRect(x, legendY + 15, 20, 15)

      // Label and count
      ctx.fillStyle = "#1f2937"
      ctx.font = "14px Arial"
      ctx.fillText(`${item.label} (${item.count})`, x + 30, legendY + 27)
    })

    // Summary stats
    const statsY = legendY + 60
    ctx.fillStyle = "#374151"
    ctx.font = "14px Arial"

    const totalHours = outages.reduce((acc, outage) => {
      const hours = (new Date(outage.endDate).getTime() - new Date(outage.startDate).getTime()) / (1000 * 60 * 60)
      return acc + Math.round(hours)
    }, 0)

    ctx.fillText(`Total Scheduled Downtime: ${totalHours} hours`, 50, statsY)
    ctx.fillText(`Timeline: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 50, statsY + 20)

    return canvas.toDataURL()
  } catch (error) {
    console.error("Error generating Gantt chart:", error)

    // Return simple fallback chart
    const canvas = createCanvas(800, 400)
    const ctx = canvas.getContext("2d")

    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, 800, 400)

    ctx.fillStyle = "#1f2937"
    ctx.font = "20px Arial"
    ctx.fillText("GCP Outages Dashboard", 50, 50)

    ctx.font = "16px Arial"
    ctx.fillStyle = "#6b7280"
    ctx.fillText("Chart generation temporarily unavailable", 50, 200)
    ctx.fillText("Please visit the dashboard for live updates", 50, 230)

    return canvas.toDataURL()
  }
}

// Create email HTML template
function createEmailTemplate(data: EmailNotificationData, allOutages: any[], ganttChartImage: string): string {
  const { outage, dashboardUrl } = data
  const duration = Math.round((outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60))

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GCP Outage Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🚨 GCP Outage Notification</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">New outage has been scheduled</p>
      </div>

      <!-- Alert Banner -->
      <div style="background-color: ${
        outage.severity === "High" ? "#fef2f2" : outage.severity === "Medium" ? "#fffbeb" : "#f0fdf4"
      }; 
                  border-left: 4px solid ${
                    outage.severity === "High" ? "#dc2626" : outage.severity === "Medium" ? "#d97706" : "#16a34a"
                  }; 
                  padding: 20px; margin-bottom: 25px; border-radius: 8px;">
        <h2 style="margin: 0 0 10px 0; color: ${
          outage.severity === "High" ? "#dc2626" : outage.severity === "Medium" ? "#d97706" : "#16a34a"
        }; font-size: 20px;">
          ${outage.severity.toUpperCase()} IMPACT OUTAGE
        </h2>
        <p style="margin: 0; font-weight: bold; font-size: 18px;">${outage.title}</p>
        <p style="margin: 5px 0 0 0; color: #6b7280;">Outage ID: #${outage.id}</p>
      </div>

      <!-- Quick Actions -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${dashboardUrl}" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
          📊 View Live Dashboard
        </a>
        <a href="${dashboardUrl}#outage-${outage.id}" 
           style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
          🔍 View This Outage
        </a>
      </div>

      <!-- Outage Details -->
      <div style="background-color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📋 Outage Details</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">📅 Start Date & Time</h3>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${outage.startDate.toLocaleString()}</p>
          </div>
          <div>
            <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🏁 End Date & Time</h3>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${outage.endDate.toLocaleString()}</p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Duration</h3>
          <p style="margin: 0; font-weight: bold; font-size: 18px; color: #dc2626;">${duration} hours</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🌐 Affected Environments</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${outage.environments
              .map(
                (env) => `
              <span style="background-color: #3b82f6; color: white; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: bold;">
                ${env}
              </span>
            `,
              )
              .join("")}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">👥 Responsible Team</h3>
          <p style="margin: 0; font-weight: bold;">${outage.assignee}</p>
        </div>

        ${
          outage.estimatedUsers && outage.estimatedUsers > 0
            ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">👤 Estimated Users Affected</h3>
          <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 18px;">${outage.estimatedUsers.toLocaleString()}</p>
        </div>
        `
            : ""
        }

        <div style="margin-bottom: 20px;">
          <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Reason for Outage</h3>
          <p style="margin: 0; background-color: #f8fafc; padding: 15px; border-radius: 5px; border-left: 3px solid #3b82f6;">
            ${outage.reason || "No reason provided"}
          </p>
        </div>

        ${
          outage.detailedImpact.length > 0
            ? `
        <div>
          <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">💥 Detailed Impact</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${outage.detailedImpact.map((impact) => `<li style="margin-bottom: 8px;">${impact}</li>`).join("")}
          </ul>
        </div>
        `
            : ""
        }
      </div>

      <!-- Gantt Chart -->
      <div style="background-color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📈 Updated Timeline</h2>
        <p style="color: #6b7280; margin-bottom: 20px;">Visual timeline of all scheduled outages including your new outage:</p>
        <div style="text-align: center; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
          <img src="${ganttChartImage}" alt="Outages Timeline Chart" style="max-width: 100%; height: auto; display: block;">
        </div>
        <div style="text-align: center; margin-top: 15px;">
          <a href="${dashboardUrl}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            🔗 Open Interactive Dashboard
          </a>
        </div>
      </div>

      <!-- Summary Stats -->
      <div style="background-color: #1f2937; color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
        <h2 style="margin-top: 0; color: white; border-bottom: 2px solid #374151; padding-bottom: 10px;">📊 Current Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; text-align: center;">
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">
              ${allOutages.filter((o) => o.severity === "High").length}
            </div>
            <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">High Impact</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">
              ${allOutages.filter((o) => o.severity === "Medium").length}
            </div>
            <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Medium Impact</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">
              ${allOutages.filter((o) => o.severity === "Low").length}
            </div>
            <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Low Impact</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">
              ${allOutages.length}
            </div>
            <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Total Outages</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p style="margin: 0; font-size: 14px;">This notification was generated automatically by the GCP Outages Management System</p>
        <p style="margin: 5px 0 0 0; font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
        <div style="margin-top: 15px;">
          <a href="${dashboardUrl}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">
            📊 Access Dashboard
          </a>
          <span style="margin: 0 10px; color: #d1d5db;">|</span>
          <a href="mailto:${process.env.FROM_EMAIL || "support@gcpoutages.com"}" style="color: #3b82f6; text-decoration: none;">
            📧 Contact Support
          </a>
        </div>
      </div>

    </body>
    </html>
  `
}

// Send email notification
export async function sendOutageNotification(
  data: EmailNotificationData,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get all outages for context
    const allOutages = await getOutages()

    // Generate Gantt chart image
    const ganttChartImage = await generateGanttChartImage(allOutages)

    // Create email template
    const emailHTML = createEmailTemplate(data, allOutages, ganttChartImage)

    // Create transporter
    const transporter = createTransporter()

    // Send emails to all recipients
    const emailPromises = data.recipientEmails.map(async (email) => {
      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@gcpoutages.com",
        to: email,
        subject: `🚨 GCP Outage Alert: ${data.outage.title} [${data.outage.severity} Impact] - ID #${data.outage.id}`,
        html: emailHTML,
      }

      return await transporter.sendMail(mailOptions)
    })

    const results = await Promise.all(emailPromises)

    return {
      success: true,
      messageId: results.map((r) => r.messageId).join(", "),
    }
  } catch (error) {
    console.error("Error sending email notification:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Validate email addresses
export async function validateEmails(emails: string[]): Promise<{ valid: string[]; invalid: string[] }> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valid: string[] = []
  const invalid: string[] = []

  emails.forEach((email) => {
    const trimmedEmail = email.trim()
    if (emailRegex.test(trimmedEmail)) {
      valid.push(trimmedEmail)
    } else {
      invalid.push(trimmedEmail)
    }
  })

  return { valid, invalid }
}
