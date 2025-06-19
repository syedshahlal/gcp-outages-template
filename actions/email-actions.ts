"use server"

import { getOutages } from "./excel-actions"

export interface EmailNotificationData {
  recipientEmails: string[]
  subject?: string
  message?: string
  dashboardUrl?: string
  recentOutages?: any[]
}

// Generate comprehensive two-week outage plan
async function generateTwoWeekPlan() {
  const allOutages = await getOutages()
  const now = new Date()
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  // Filter outages for the next two weeks
  const upcomingOutages = allOutages.filter((outage) => {
    return outage.startDate >= now && outage.startDate <= twoWeeksFromNow
  })

  // Sort by start date (chronological)
  upcomingOutages.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  return upcomingOutages.map((outage) => {
    const duration = (outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)
    const isLongDuration = duration >= 8
    const isWeekday = outage.startDate.getDay() >= 1 && outage.startDate.getDay() <= 5
    const isWorkingHours = outage.startDate.getHours() >= 9 && outage.startDate.getHours() <= 17

    return {
      ...outage,
      duration: Math.round(duration * 10) / 10,
      isLongDuration,
      isWeekday,
      isWorkingHours,
      isHighImpact: isLongDuration || (isWeekday && isWorkingHours),
    }
  })
}

// Generate simple Gantt chart SVG
function generateGanttChartSVG(outages: any[]) {
  if (outages.length === 0) return ""

  const width = 800
  const height = Math.max(400, outages.length * 60 + 100)
  const margin = { top: 50, right: 50, bottom: 50, left: 200 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Calculate date range
  const startDate = new Date(Math.min(...outages.map((o) => o.startDate.getTime())))
  const endDate = new Date(Math.max(...outages.map((o) => o.endDate.getTime())))
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Generate time scale
  const timeScale = (date: Date) => {
    const daysDiff = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    return (daysDiff / totalDays) * chartWidth
  }

  const severityColors = {
    High: "#dc2626",
    Medium: "#d97706",
    Low: "#16a34a",
  }

  let svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .chart-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #1f2937; }
          .axis-label { font-family: Arial, sans-serif; font-size: 12px; fill: #6b7280; }
          .task-label { font-family: Arial, sans-serif; font-size: 11px; fill: #374151; }
          .task-bar { stroke: #ffffff; stroke-width: 1; }
          .grid-line { stroke: #e5e7eb; stroke-width: 1; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="30" text-anchor="middle" class="chart-title">GCP Outages - Two Week Schedule</text>
      
      <!-- Grid lines -->
  `

  // Add vertical grid lines for days
  for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 10))) {
    const x = margin.left + (i / totalDays) * chartWidth
    svg += `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" class="grid-line"/>`

    const gridDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle" class="axis-label">${gridDate.getMonth() + 1}/${gridDate.getDate()}</text>`
  }

  // Add outage bars
  outages.forEach((outage, index) => {
    const y = margin.top + index * 50
    const startX = margin.left + timeScale(outage.startDate)
    const endX = margin.left + timeScale(outage.endDate)
    const barWidth = Math.max(2, endX - startX)

    // Task label
    svg += `<text x="${margin.left - 10}" y="${y + 20}" text-anchor="end" class="task-label">${outage.title.substring(0, 25)}${outage.title.length > 25 ? "..." : ""}</text>`

    // Task bar
    svg += `<rect x="${startX}" y="${y + 5}" width="${barWidth}" height="30" fill="${severityColors[outage.severity as keyof typeof severityColors]}" class="task-bar"/>`

    // Duration label
    svg += `<text x="${startX + barWidth / 2}" y="${y + 22}" text-anchor="middle" fill="white" class="task-label">${outage.duration}h</text>`
  })

  svg += `</svg>`
  return svg
}

// Generate HTML email template with enhanced Gantt chart
function generateEmailHTML(data: EmailNotificationData, twoWeekPlan: any[]) {
  const recentOutages = data.recentOutages || []
  const ganttChart = generateGanttChartSVG(twoWeekPlan)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GCP Outage Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .placard { background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .placard h3 { margin-top: 0; color: #007bff; }
        .outage-card { border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0; background: white; }
        .outage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .severity-high { border-left: 4px solid #dc3545; }
        .severity-medium { border-left: 4px solid #ffc107; }
        .severity-low { border-left: 4px solid #28a745; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .badge-high { background: #dc3545; color: white; }
        .badge-medium { background: #ffc107; color: #212529; }
        .badge-low { background: #28a745; color: white; }
        .badge-highlight { background: #ff6b6b; color: white; }
        .env-tags { margin: 10px 0; }
        .env-tag { display: inline-block; background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin: 2px; }
        .timeline { border-left: 3px solid #007bff; padding-left: 20px; margin: 20px 0; }
        .timeline-item { margin-bottom: 20px; position: relative; }
        .timeline-item::before { content: ''; position: absolute; left: -26px; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: #007bff; }
        .highlight { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
        .gantt-container { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .gantt-chart { max-width: 100%; height: auto; border: 1px solid #dee2e6; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 GCP Outage Notification</h1>
            <p>New Outage Scheduled - Detailed Information & Updated Schedule</p>
            <p>${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
        </div>
        
        <div class="content">
            ${
              data.message
                ? `<div class="placard">
                <h3>📢 Important Message</h3>
                <p>${data.message}</p>
            </div>`
                : ""
            }
            
            ${
              recentOutages.length > 0
                ? `
            <div class="placard">
                <h3>🆕 Newly Scheduled Outage</h3>
                <p>The following outage has been added to the schedule:</p>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">${recentOutages.length}</div>
                        <div class="stat-label">New Outage</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${recentOutages[0].severity}</div>
                        <div class="stat-label">Impact Level</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${recentOutages[0].environments.length}</div>
                        <div class="stat-label">Environments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${recentOutages[0].estimatedUsers || 0}</div>
                        <div class="stat-label">Users Affected</div>
                    </div>
                </div>
                
                ${recentOutages
                  .map(
                    (outage: any) => `
                <div class="outage-card severity-${outage.severity.toLowerCase()}">
                    <div class="outage-header">
                        <h4 style="margin: 0;">${outage.title}</h4>
                        <span class="badge badge-${outage.severity.toLowerCase()}">${outage.severity} Impact</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                        <div>
                            <p><strong>📅 Start:</strong> ${outage.startDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}</p>
                            <p><strong>🏁 End:</strong> ${outage.endDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}</p>
                            <p><strong>⏱️ Duration:</strong> ${
                              Math.round(
                                ((outage.endDate.getTime() - outage.startDate.getTime()) / (1000 * 60 * 60)) * 10,
                              ) / 10
                            } hours</p>
                        </div>
                        <div>
                            <p><strong>👥 Responsible Team:</strong> ${outage.assignee}</p>
                            <p><strong>🎯 Priority:</strong> ${outage.priority || "Standard"}</p>
                            ${outage.category ? `<p><strong>📂 Category:</strong> ${outage.category}</p>` : ""}
                            ${outage.contactEmail ? `<p><strong>📧 Contact:</strong> ${outage.contactEmail}</p>` : ""}
                        </div>
                    </div>
                    
                    <div class="env-tags">
                        <strong>🌐 Affected Environments:</strong><br>
                        ${outage.environments.map((env: string) => `<span class="env-tag">${env}</span>`).join("")}
                    </div>
                    
                    ${outage.affectedModels ? `<p><strong>🔧 Affected Models:</strong> ${outage.affectedModels}</p>` : ""}
                    ${outage.reason ? `<p><strong>📝 Reason:</strong> ${outage.reason}</p>` : ""}
                    
                    ${
                      outage.detailedImpact && outage.detailedImpact.length > 0
                        ? `
                    <div style="margin-top: 15px;">
                        <strong>⚠️ Detailed Impact:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            ${outage.detailedImpact.map((impact: string) => `<li>${impact}</li>`).join("")}
                        </ul>
                    </div>
                    `
                        : ""
                    }
                </div>
                `,
                  )
                  .join("")}
            </div>
            `
                : ""
            }
            
            ${
              ganttChart
                ? `
            <div class="placard">
                <h3>📊 Updated Gantt Chart - Two Week Schedule</h3>
                <p>Visual timeline showing all scheduled outages for the next 14 days:</p>
                <div class="gantt-container">
                    ${ganttChart}
                </div>
                <p style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                    🔴 High Impact &nbsp;&nbsp; 🟡 Medium Impact &nbsp;&nbsp; 🟢 Low Impact
                </p>
            </div>
            `
                : ""
            }
            
            <div class="placard">
                <h3>📋 Complete Two-Week Outage Schedule</h3>
                <p>Comprehensive view of all scheduled outages for the next 14 days:</p>
                
                <div class="highlight">
                    <strong>⚠️ High Impact Indicators:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>🔴 Outages lasting 8+ hours</li>
                        <li>🔴 Outages during weekdays (Mon-Fri)</li>
                        <li>🔴 Outages during working hours (9 AM - 5 PM)</li>
                    </ul>
                </div>
                
                ${
                  twoWeekPlan.length === 0
                    ? `<p style="text-align: center; color: #28a745; font-weight: bold;">✅ No additional outages scheduled for the next two weeks!</p>`
                    : `
                <div class="timeline">
                    ${twoWeekPlan
                      .map(
                        (outage: any) => `
                    <div class="timeline-item">
                        <div class="outage-card severity-${outage.severity.toLowerCase()}">
                            <div class="outage-header">
                                <h4 style="margin: 0;">${outage.title}</h4>
                                <div>
                                    <span class="badge badge-${outage.severity.toLowerCase()}">${outage.severity}</span>
                                    ${
                                      outage.isHighImpact
                                        ? '<span class="badge badge-highlight">High Impact Period</span>'
                                        : ""
                                    }
                                </div>
                            </div>
                            <p><strong>📅 ${outage.startDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}</strong></p>
                            <p><strong>🕐 Time:</strong> ${outage.startDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${outage.endDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} (${outage.duration}h)</p>
                            <p><strong>👥 Team:</strong> ${outage.assignee}</p>
                            <div class="env-tags">
                                ${outage.environments
                                  .map((env: string) => `<span class="env-tag">${env}</span>`)
                                  .join("")}
                            </div>
                            ${
                              outage.isLongDuration
                                ? '<p style="color: #dc3545;"><strong>⚠️ Extended Duration:</strong> This outage will last 8+ hours</p>'
                                : ""
                            }
                            ${
                              outage.isWeekday && outage.isWorkingHours
                                ? '<p style="color: #dc3545;"><strong>⚠️ Business Hours Impact:</strong> This outage occurs during weekday working hours</p>'
                                : ""
                            }
                        </div>
                    </div>
                    `,
                      )
                      .join("")}
                </div>
                `
                }
            </div>
            
            <div class="placard">
                <h3>📊 Summary Statistics</h3>
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number">${twoWeekPlan.length + recentOutages.length}</div>
                        <div class="stat-label">Total Outages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${twoWeekPlan.filter((o) => o.isHighImpact).length + recentOutages.filter((o: any) => o.severity === "High").length}</div>
                        <div class="stat-label">High Impact</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${twoWeekPlan.filter((o) => o.isLongDuration).length}</div>
                        <div class="stat-label">8+ Hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${
                          twoWeekPlan.filter((o) => o.isWeekday && o.isWorkingHours).length
                        }</div>
                        <div class="stat-label">Business Hours</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>GCP Operations Dashboard</strong></p>
            ${
              data.dashboardUrl
                ? `<p><a href="${data.dashboardUrl}" style="color: #007bff;">📊 View Live Dashboard</a></p>`
                : ""
            }
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `
}

export async function sendOutageNotification(data: EmailNotificationData) {
  try {
    const twoWeekPlan = await generateTwoWeekPlan()
    const emailHTML = generateEmailHTML(data, twoWeekPlan)

    // Mock email sending - in production, integrate with your email service
    console.groupCollapsed("📧 GCP Outage Notification Email")
    console.log("Recipients:", data.recipientEmails.join(", "))
    console.log("Subject:", data.subject || "GCP Outage Notification - New Outage Scheduled")
    console.log("Recent Outages:", data.recentOutages?.length || 0)
    console.log("Two-Week Plan:", twoWeekPlan.length, "outages")
    console.log("High Impact Outages:", twoWeekPlan.filter((o) => o.isHighImpact).length)
    console.log("HTML Content Length:", emailHTML.length, "characters")
    console.groupEnd()

    // Return success with email preview
    return {
      success: true,
      messageId: `gcp-outage-${Date.now()}`,
      preview: emailHTML,
      stats: {
        recipients: data.recipientEmails.length,
        recentOutages: data.recentOutages?.length || 0,
        twoWeekOutages: twoWeekPlan.length,
        highImpactOutages: twoWeekPlan.filter((o) => o.isHighImpact).length,
      },
    }
  } catch (error) {
    console.error("Error sending notification:", error)
    throw new Error("Failed to send notification")
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
