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
      <Button variant="outline" size="sm" disabled className="w-10 h-10 p-0 rounded-lg">
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
      className="w-10 h-10 p-0 rounded-lg border-2 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {isLight ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-400" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
