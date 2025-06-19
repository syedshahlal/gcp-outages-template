"use server"

import type { EmailNotificationData } from "./email-actions"
import { sendOutageNotification } from "./email-actions"

/**
 * Thin server-action wrapper the Client Component can call.
 * It keeps all heavy logic on the server side (even though here it’s a mock).
 */
export async function notify(payload: EmailNotificationData) {
  return await sendOutageNotification(payload)
}
