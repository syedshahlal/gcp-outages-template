"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function EmailTestForm() {
  const { toast } = useToast()
  const [emails, setEmails] = useState("")
  const [subject, setSubject] = useState("GCP Outage Notification (TEST)")
  const [message, setMessage] = useState("This is a test email from the GCP Outage dashboard.")
  const [lastResult, setLastResult] = useState<any>(null)

  const send = async () => {
    try {
      const emailArray = emails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmails: emailArray,
          subject,
          message,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }

      const result = await res.json()
      setLastResult(result)

      if (result.isPreview) {
        toast({
          title: "Preview Mode",
          description: "Email content generated successfully. Check below for preview (no real email sent in v0).",
        })
      } else {
        toast({
          title: "Success",
          description: `Real emails sent to ${emailArray.length} recipient(s)`,
        })
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message ?? "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Test Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email(s) (comma-separated)</Label>
            <Input
              id="emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="user@example.com, another@corp.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg">Message</Label>
            <Textarea id="msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <Button onClick={send} disabled={!emails.trim()}>
            Send Test
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>{lastResult.isPreview ? "📧 Email Preview (v0 Mode)" : "✅ Email Sent"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{lastResult.message}</p>

              {lastResult.isPreview && lastResult.emailPreview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>From:</strong> {lastResult.emailPreview.from}
                    </div>
                    <div>
                      <strong>To:</strong> {lastResult.emailPreview.to.join(", ")}
                    </div>
                    <div className="col-span-2">
                      <strong>Subject:</strong> {lastResult.emailPreview.subject}
                    </div>
                  </div>

                  <div>
                    <strong>HTML Preview:</strong>
                    <div
                      className="mt-2 p-4 border rounded-lg bg-white text-black max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: lastResult.emailPreview.html }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">💡 How Email Testing Works</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                <strong>v0 Preview:</strong> Shows email preview only (no real emails sent)
              </li>
              <li>
                <strong>Production:</strong> Sends real emails via SMTP when deployed
              </li>
              <li>
                <strong>To test real emails:</strong> Deploy to Vercel and configure SMTP environment variables
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
