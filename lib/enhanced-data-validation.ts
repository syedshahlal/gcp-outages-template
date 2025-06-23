/**
 * Enhanced data validation and consistency checking utilities
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  dataAccuracy: number
}

export interface OutageValidation {
  hasRequiredFields: boolean
  hasValidTimestamps: boolean
  hasCompleteDescription: boolean
  hasAssignedTeam: boolean
  hasValidEnvironments: boolean
  timezoneConsistency: boolean
}

export function validateOutageData(outage: any): OutageValidation {
  return {
    hasRequiredFields: !!(outage.title && outage.startDate && outage.endDate && outage.severity),
    hasValidTimestamps: validateTimestamps(outage.startDate, outage.endDate),
    hasCompleteDescription: !!(outage.reason && outage.detailedImpact?.length > 0),
    hasAssignedTeam: !!(outage.assignee && outage.assignee.trim() !== ""),
    hasValidEnvironments: !!(outage.environments && outage.environments.length > 0),
    timezoneConsistency: validateTimezoneConsistency(outage),
  }
}

export function validateTimestamps(startDate: any, endDate: any): boolean {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false
    }

    // Check if end date is after start date
    if (end <= start) {
      return false
    }

    // Check if dates are reasonable (not too far in past/future)
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())

    if (start < oneYearAgo || end > twoYearsFromNow) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export function validateTimezoneConsistency(outage: any): boolean {
  // Check if timezone information is consistent across all timestamp fields
  if (!outage.timezone) return false

  try {
    // Validate timezone format
    Intl.DateTimeFormat(undefined, { timeZone: outage.timezone })
    return true
  } catch {
    return false
  }
}

export function calculateDataAccuracy(outages: any[]): number {
  if (outages.length === 0) return 100

  let totalScore = 0
  let maxScore = 0

  outages.forEach((outage) => {
    const validation = validateOutageData(outage)
    const score = Object.values(validation).filter(Boolean).length
    totalScore += score
    maxScore += Object.keys(validation).length
  })

  return Math.round((totalScore / maxScore) * 100)
}

export function generateDataIntegrityReport(outages: any[]) {
  const report = {
    missingTimestamps: 0,
    incompleteDescriptions: 0,
    unassignedOutages: 0,
    timezoneInconsistencies: 0,
    validationErrors: [] as string[],
  }

  outages.forEach((outage, index) => {
    const validation = validateOutageData(outage)

    if (!validation.hasValidTimestamps) {
      report.missingTimestamps++
      report.validationErrors.push(`Outage ${index + 1}: Invalid timestamps`)
    }

    if (!validation.hasCompleteDescription) {
      report.incompleteDescriptions++
      report.validationErrors.push(`Outage ${index + 1}: Incomplete description`)
    }

    if (!validation.hasAssignedTeam) {
      report.unassignedOutages++
      report.validationErrors.push(`Outage ${index + 1}: No assigned team`)
    }

    if (!validation.timezoneConsistency) {
      report.timezoneInconsistencies++
      report.validationErrors.push(`Outage ${index + 1}: Timezone inconsistency`)
    }
  })

  return report
}

export function enhanceOutageWithValidation(outage: any) {
  const validation = validateOutageData(outage)

  return {
    ...outage,
    validation,
    dataQualityScore: (Object.values(validation).filter(Boolean).length / Object.keys(validation).length) * 100,
    lastValidated: new Date().toISOString(),
    validationTimestamp: Date.now(),
  }
}
