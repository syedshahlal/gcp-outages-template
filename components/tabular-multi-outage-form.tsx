"use client"

import type React from "react"

import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material"
import { useState } from "react"

function createData(startTime: string, endTime: string, affectedArea: string, cause: string) {
  return { startTime, endTime, affectedArea, cause }
}

const initialRows = [createData("", "", "", "")]

export default function TabularMultiOutageForm() {
  const [rows, setRows] = useState(initialRows)

  const handleAddRow = () => {
    setRows([...rows, createData("", "", "", "")])
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, index: number, field: string) => {
    const newRows = [...rows]
    newRows[index][field] = event.target.value
    setRows(newRows)
  }

  async function submitMany(rows: any[]) {
    const res = await fetch("/api/outages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    })
    if (!res.ok) throw new Error("Bulk upload failed")
    return res.json()
  }

  const handleSubmit = async () => {
    try {
      await submitMany(rows)
      alert("Outages submitted successfully!")
      setRows(initialRows) // Clear the form after successful submission
    } catch (error: any) {
      console.error("Failed to submit outages:", error)
      alert(`Failed to submit outages: ${error.message}`)
    }
  }

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Start Time</TableCell>
            <TableCell>End Time</TableCell>
            <TableCell>Affected Area</TableCell>
            <TableCell>Cause</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell>
                <TextField
                  size="small"
                  value={row.startTime}
                  onChange={(event) => handleChange(event, index, "startTime")}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={row.endTime}
                  onChange={(event) => handleChange(event, index, "endTime")}
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={row.affectedArea}
                  onChange={(event) => handleChange(event, index, "affectedArea")}
                />
              </TableCell>
              <TableCell>
                <TextField size="small" value={row.cause} onChange={(event) => handleChange(event, index, "cause")} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={handleAddRow}>Add Row</Button>
      <Button onClick={handleSubmit}>Submit</Button>
    </Box>
  )
}
