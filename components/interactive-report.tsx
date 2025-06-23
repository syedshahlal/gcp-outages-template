"use client"

import { useState, useEffect } from "react"
import { Chart } from "react-chartjs-2"
import "chart.js/auto"

interface ReportData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string[]
    borderColor: string[]
    borderWidth: number
  }[]
}

const InteractiveReport = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await generateReportData()
        setReportData(data)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || "Failed to generate report data.")
        setLoading(false)
      }
    }

    fetchData()

    // Real-time data accuracy verification (example - polling every 5 minutes)
    const intervalId = setInterval(async () => {
      try {
        const newData = await generateReportData()
        if (!isDataConsistent(reportData, newData)) {
          console.warn("Data inconsistency detected. Refreshing report.")
          setReportData(newData) // Refresh the report with new data
        }
      } catch (err: any) {
        console.error("Error during real-time data verification:", err.message)
      }
    }, 300000) // 5 minutes in milliseconds

    return () => clearInterval(intervalId) // Cleanup interval on unmount
  }, [])

  const generateReportData = async (): Promise<ReportData> => {
    // Simulate fetching data from an API or database
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network latency

    const labels = ["January", "February", "March", "April", "May", "June"]
    const rawData = [65, 59, 80, 81, 56, 55]

    // Data Validation and Consistency Checks
    if (!Array.isArray(labels) || labels.length === 0) {
      throw new Error("Labels must be a non-empty array.")
    }

    if (!Array.isArray(rawData) || rawData.length !== labels.length) {
      throw new Error("Data must be an array with the same length as labels.")
    }

    if (rawData.some(isNaN)) {
      throw new Error("Data values must be numbers.")
    }

    const backgroundColor = [
      "rgba(255, 99, 132, 0.5)",
      "rgba(54, 162, 235, 0.5)",
      "rgba(255, 206, 86, 0.5)",
      "rgba(75, 192, 192, 0.5)",
      "rgba(153, 102, 255, 0.5)",
      "rgba(255, 159, 64, 0.5)",
    ]

    const borderColor = [
      "rgba(255, 99, 132, 1)",
      "rgba(54, 162, 235, 1)",
      "rgba(255, 206, 86, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(255, 159, 64, 1)",
    ]

    const datasets = [
      {
        label: "Monthly Sales",
        data: rawData,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 1,
      },
    ]

    const reportData: ReportData = {
      labels,
      datasets,
    }

    return reportData
  }

  const isDataConsistent = (oldData: ReportData | null, newData: ReportData): boolean => {
    if (!oldData) return false // If there's no old data, consider it inconsistent

    if (oldData.labels.length !== newData.labels.length) return false
    if (oldData.datasets.length !== newData.datasets.length) return false

    for (let i = 0; i < oldData.labels.length; i++) {
      if (oldData.labels[i] !== newData.labels[i]) return false
    }

    for (let i = 0; i < oldData.datasets.length; i++) {
      const oldDataset = oldData.datasets[i]
      const newDataset = newData.datasets[i]

      if (oldDataset.label !== newDataset.label) return false
      if (oldDataset.data.length !== newDataset.data.length) return false

      for (let j = 0; j < oldDataset.data.length; j++) {
        if (oldDataset.data[j] !== newDataset.data[j]) return false
      }
    }

    return true
  }

  if (loading) {
    return <div>Loading report...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!reportData) {
    return <div>No data to display.</div>
  }

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || ""

            if (label) {
              label += ": "
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(context.parsed.y)
            }
            return label
          },
        },
      },
      legend: {
        labels: {
          font: {
            size: 14,
          },
          color: "black",
        },
      },
      title: {
        display: true,
        text: "Monthly Sales Report",
        font: {
          size: 20,
        },
        color: "black",
      },
    },
    scales: {
      y: {
        ticks: {
          color: "black",
          callback: (value: number) => {
            return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
          },
        },
        title: {
          display: true,
          text: "Sales (USD)",
          color: "black",
          font: {
            size: 16,
          },
        },
      },
      x: {
        ticks: {
          color: "black",
          font: {
            size: 14,
          },
        },
        title: {
          display: true,
          text: "Month",
          color: "black",
          font: {
            size: 16,
          },
        },
      },
    },
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Interactive Sales Report</h1>
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Chart type="bar" data={reportData} options={chartOptions} />
      </div>
      <p style={{ marginTop: "10px", fontSize: "12px", color: "#777", textAlign: "center" }}>
        Data updated in real-time. Last updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  )
}

export default InteractiveReport
