"use client"

import type React from "react"
import { useState } from "react"

interface EnhancedOutageFormProps {
  onSubmit: (data: any) => void
}

const EnhancedOutageForm: React.FC<EnhancedOutageFormProps> = ({ onSubmit }) => {
  const [recipientEmails, setRecipientEmails] = useState<string>("")
  const [subject, setSubject] = useState<string>("")
  const [message, setMessage] = useState<string>("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "recipientEmails") {
      setRecipientEmails(value)
    } else if (name === "subject") {
      setSubject(value)
    } else if (name === "message") {
      setMessage(value)
    }
  }

  const validateEmails = async (emails: string): Promise<{ valid: string[]; invalid: string[] }> => {
    // Simulate email validation (replace with actual validation logic)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network request

    const emailList = emails.split(",").map((email) => email.trim())
    const validEmails: string[] = []
    const invalidEmails: string[] = []

    for (const email of emailList) {
      if (email.includes("@") && email.includes(".")) {
        validEmails.push(email)
      } else {
        invalidEmails.push(email)
      }
    }

    return { valid: validEmails, invalid: invalidEmails }
  }

  const handleSendNotifications = async (e: React.FormEvent) => {
    e.preventDefault()

    const { valid, invalid } = await validateEmails(recipientEmails)

    if (invalid.length > 0) {
      alert(`Invalid emails: ${invalid.join(", ")}`)
      return
    }

    const formData = {
      recipientEmails: valid,
      subject,
      message,
    }

    onSubmit(formData)

    // Clear the form
    setRecipientEmails("")
    setSubject("")
    setMessage("")
  }

  return (
    <form onSubmit={handleSendNotifications}>
      <div>
        <label htmlFor="recipientEmails">Recipient Emails (comma-separated):</label>
        <input
          type="text"
          id="recipientEmails"
          name="recipientEmails"
          value={recipientEmails}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="subject">Subject:</label>
        <input type="text" id="subject" name="subject" value={subject} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="message">Message:</label>
        <textarea id="message" name="message" value={message} onChange={handleChange} />
      </div>
      <button type="submit">Send Notifications</button>
    </form>
  )
}

export default EnhancedOutageForm
