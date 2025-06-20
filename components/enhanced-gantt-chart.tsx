"use client"

import { useState, useEffect } from "react"
import { Gantt } from "gantt-task-scheduling"
import "gantt-task-scheduling/dist/style.css"

interface Task {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies: string[]
}

interface Outage {
  start: string
  end: string
  reason: string
}

const EnhancedGanttChart = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Week")
  const [outages, setOutages] = useState<Outage[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const taskResponse = await fetch("/api/tasks")
        const taskData = await taskResponse.json()
        setTasks(taskData)

        const response = await fetch("/api/outages")
        const outages = await response.json()
        setOutages(outages)
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    fetchData()
  }, [])

  const handleTaskChange = (task: Task) => {
    // Implement your task update logic here, e.g., send a request to update the task in the database
    console.log("Task changed:", task)
  }

  const handleViewModeChange = (mode: "Day" | "Week" | "Month") => {
    setViewMode(mode)
  }

  return (
    <div>
      <div>
        <button onClick={() => handleViewModeChange("Day")}>Day</button>
        <button onClick={() => handleViewModeChange("Week")}>Week</button>
        <button onClick={() => handleViewModeChange("Month")}>Month</button>
      </div>
      <div style={{ height: "500px" }}>
        <Gantt tasks={tasks} viewMode={viewMode} onTaskChange={handleTaskChange} outages={outages} />
      </div>
    </div>
  )
}

export default EnhancedGanttChart
