"use client"

import { useState, useEffect } from "react"
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react"
import "gantt-task-react/dist/index.css"

interface Task extends GanttTask {
  dependencies: string[]
}

interface Outage {
  start: string
  end: string
  reason: string
}

const EnhancedGanttChart = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
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
        <button onClick={() => setViewMode(ViewMode.Day)}>Day</button>
        <button onClick={() => setViewMode(ViewMode.Week)}>Week</button>
        <button onClick={() => setViewMode(ViewMode.Month)}>Month</button>
      </div>
      <div style={{ height: "500px" }}>
        <Gantt tasks={tasks} viewMode={viewMode} onDateChange={handleTaskChange} />
      </div>
    </div>
  )
}

export default EnhancedGanttChart
