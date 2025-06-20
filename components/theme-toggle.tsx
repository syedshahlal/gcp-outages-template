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
      className="relative h-9 w-20 p-1 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {/* Background capsule */}
      <div className="absolute inset-1 flex items-center justify-between px-1">
        {/* Light mode section */}
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
            isLight ? "bg-white dark:bg-gray-900 shadow-sm" : "bg-transparent"
          }`}
        >
          <Sun
            className={`h-4 w-4 transition-colors duration-200 ${
              isLight ? "text-yellow-500" : "text-gray-400 dark:text-gray-500"
            }`}
          />
        </div>

        {/* Dark mode section */}
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
            !isLight ? "bg-white dark:bg-gray-900 shadow-sm" : "bg-transparent"
          }`}
        >
          <Moon
            className={`h-4 w-4 transition-colors duration-200 ${
              !isLight ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
            }`}
          />
        </div>
      </div>

      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
