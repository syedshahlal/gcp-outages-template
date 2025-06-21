/**
 * Timezone utility functions for handling outage times
 */

// Get user's local timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Get timezone abbreviation (e.g., "PST", "EST")
export const getTimezoneAbbreviation = (timezone?: string): string => {
  const tz = timezone || getUserTimezone()
  const date = new Date()

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })

    const parts = formatter.formatToParts(date)
    const timeZonePart = parts.find((part) => part.type === "timeZoneName")
    return timeZonePart?.value || tz
  } catch {
    return tz
  }
}

// Format date with timezone
export const formatDateWithTimezone = (
  date: Date,
  timezone?: string,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const tz = timezone || getUserTimezone()

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(date)
}

// Format date for timeline display
export const formatTimelineDate = (date: Date, timezone?: string): string => {
  return formatDateWithTimezone(date, timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Format date for detailed view
export const formatDetailedDate = (date: Date, timezone?: string): string => {
  return formatDateWithTimezone(date, timezone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

// Convert date to specific timezone for form inputs
export const dateToTimezoneString = (date: Date, timezone?: string): string => {
  const tz = timezone || getUserTimezone()

  try {
    // Create a date in the target timezone
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    return formatter.format(date)
  } catch {
    return date.toISOString().split("T")[0]
  }
}

// Convert date to timezone time string for form inputs
export const dateToTimezoneTimeString = (date: Date, timezone?: string): string => {
  const tz = timezone || getUserTimezone()

  try {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    return formatter.format(date)
  } catch {
    return date.toTimeString().slice(0, 5)
  }
}

// Get common timezones for dropdown
export const getCommonTimezones = (): Array<{ value: string; label: string; offset: string }> => {
  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Pacific/Auckland",
  ]

  const now = new Date()

  return timezones.map((tz) => {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "short",
      })

      const parts = formatter.formatToParts(now)
      const timeZonePart = parts.find((part) => part.type === "timeZoneName")
      const abbreviation = timeZonePart?.value || tz

      // Get offset
      const offsetFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "longOffset",
      })
      const offsetParts = offsetFormatter.formatToParts(now)
      const offsetPart = offsetParts.find((part) => part.type === "timeZoneName")
      const offset = offsetPart?.value || ""

      return {
        value: tz,
        label: `${tz.replace("_", " ")} (${abbreviation})`,
        offset,
      }
    } catch {
      return {
        value: tz,
        label: tz.replace("_", " "),
        offset: "",
      }
    }
  })
}

// Check if two dates are on the same day in a timezone
export const isSameDayInTimezone = (date1: Date, date2: Date, timezone?: string): boolean => {
  const tz = timezone || getUserTimezone()

  const day1 = formatDateWithTimezone(date1, tz, { year: "numeric", month: "2-digit", day: "2-digit" })
  const day2 = formatDateWithTimezone(date2, tz, { year: "numeric", month: "2-digit", day: "2-digit" })

  return day1 === day2
}
