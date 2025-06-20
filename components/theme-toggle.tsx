"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled className="w-16 h-8">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isLight = theme === "light"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="relative w-16 h-8 p-0"
    >
      <div className="absolute inset-0 flex items-center justify-between px-1">
        <Sun className="h-3 w-3 text-yellow-500" />
        <Moon className="h-3 w-3 text-blue-500" />
      </div>
      <div
        className={`absolute top-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform duration-200 ${
          isLight ? "left-1" : "left-9"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
