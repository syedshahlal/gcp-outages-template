import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

// Safe metadata base helper
function safeMetadataBase() {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) return undefined

  try {
    // Auto-prepend https:// if no protocol is specified
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`
    return new URL(normalizedUrl)
  } catch {
    return undefined
  }
}

export const metadata: Metadata = {
  title: "GCP Outages Dashboard",
  description: "Comprehensive dashboard for tracking GCP platform outages and scheduling maintenance",
  metadataBase: safeMetadataBase(),
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
