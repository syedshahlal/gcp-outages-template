"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  affectedArea: z.string().min(2, {
    message: "Affected area must be at least 2 characters.",
  }),
  startTime: z.string().min(2, {
    message: "Start time must be at least 2 characters.",
  }),
  estimatedEndTime: z.string().min(2, {
    message: "Estimated end time must be at least 2 characters.",
  }),
  cause: z.string().min(2, {
    message: "Cause must be at least 2 characters.",
  }),
  status: z.enum(["planned", "unplanned"]),
  notes: z.string().optional(),
})

async function submitOutage(data: any) {
  const res = await fetch("/api/outages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create outage")
  return res.json()
}

export function EnhancedOutageForm() {
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      affectedArea: "",
      startTime: "",
      estimatedEndTime: "",
      cause: "",
      status: "planned",
      notes: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await submitOutage(values)
      toast({
        title: "You have created a new outage.",
      })
      router.refresh()
      form.reset()
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: "Failed to create outage. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="affectedArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Affected Area</FormLabel>
              <FormControl>
                <Input placeholder="Zone 1" {...field} />
              </FormControl>
              <FormDescription>This is the area affected by the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input placeholder="2023-01-01 00:00" {...field} />
              </FormControl>
              <FormDescription>This is the start time of the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimatedEndTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated End Time</FormLabel>
              <FormControl>
                <Input placeholder="2023-01-01 00:00" {...field} />
              </FormControl>
              <FormDescription>This is the estimated end time of the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cause"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cause</FormLabel>
              <FormControl>
                <Input placeholder="Generator failure" {...field} />
              </FormControl>
              <FormDescription>This is the cause of the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="unplanned">Unplanned</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>This is the status of the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes." className="resize-none" {...field} />
              </FormControl>
              <FormDescription>Any additional notes about the outage.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
