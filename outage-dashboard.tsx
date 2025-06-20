"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { List } from "lucide-react"

import { Button } from "@/components/ui/button"

const OutageDashboard = () => {
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline")

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Outage Dashboard</h1>

      <div className="flex justify-between items-center mb-4">
        {/* Filters Section */}
        <div className="flex items-center space-x-4">
          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className={`h-8 px-3 rounded-md transition-all duration-200 ${
                viewMode === "timeline" ? "bg-background shadow-sm text-foreground" : "hover:bg-background/50"
              }`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Timeline
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 px-3 rounded-md transition-all duration-200 ${
                viewMode === "list" ? "bg-background shadow-sm text-foreground" : "hover:bg-background/50"
              }`}
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
        </div>

        {/* Actions Section (e.g., Add Outage) */}
        <div>
          <Button>Add Outage</Button>
        </div>
      </div>

      {/* Main Content Area (Timeline or List View) */}
      <div>{viewMode === "timeline" ? <div>Timeline View Content</div> : <div>List View Content</div>}</div>
    </div>
  )
}

export default OutageDashboard
