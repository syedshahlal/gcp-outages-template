"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Clock, Globe } from "lucide-react"
import { getUserTimezone, getCommonTimezones, getTimezoneAbbreviation } from "@/lib/timezone-utils"

interface TimezoneSelectorProps {
  value?: string
  onValueChange: (timezone: string) => void
  label?: string
  showCurrentTime?: boolean
}

export function TimezoneSelector({
  value,
  onValueChange,
  label = "Timezone",
  showCurrentTime = true,
}: TimezoneSelectorProps) {
  const [currentTime, setCurrentTime] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  const selectedTimezone = value || getUserTimezone()
  const timezones = getCommonTimezones()

  useEffect(() => {
    setMounted(true)

    const updateTime = () => {
      const now = new Date()
      const timeString = new Intl.DateTimeFormat("en-US", {
        timeZone: selectedTimezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now)
      setCurrentTime(timeString)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [selectedTimezone])

  if (!mounted) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {label}
      </Label>

      <Select value={selectedTimezone} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select timezone">
            <div className="flex items-center gap-2">
              <span>{selectedTimezone.replace("_", " ")}</span>
              <Badge variant="secondary" className="text-xs">
                {getTimezoneAbbreviation(selectedTimezone)}
              </Badge>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {timezones.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              <div className="flex items-center justify-between w-full">
                <span>{tz.label}</span>
                {tz.offset && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {tz.offset}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCurrentTime && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700">
          <Clock className="h-3 w-3" />
          <span>Current time: {currentTime}</span>
        </div>
      )}
    </div>
  )
}
