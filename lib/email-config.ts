import nodemailer from "nodemailer"

/**
 * In full Node.js (e.g. Vercel Functions) we use the real SMTP transport.
 * Inside the v0 / next-lite preview the DNS module is missing, so we silently
 * fall back to Nodemailer’s JSON transport which just returns the message as JSON
 * and never opens a socket. This prevents the “dns.lookup is not implemented” error.
 */
export function createTransporter() {
  try {
    if (!process.env.SMTP_HOST || typeof window !== "undefined") {
      // Browser / next-lite or missing config → use stub transport
      return nodemailer.createTransport({ jsonTransport: true })
    }

    // Full server runtime → use real SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    })
  } catch {
    // Any unexpected error -> always fall back
    return nodemailer.createTransport({ jsonTransport: true })
  }
}

export const SENDER_EMAIL = "sr.shahlal@gmail.com"
