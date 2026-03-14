import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import "@/styles/bg.css"
import Providers from "./providers"
import { ClerkProvider } from "@clerk/nextjs"
import Shell from "@/components/layout/Shell"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Falbor",
  description: "Build websites with AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Providers>
            <Shell>
              {children}
            </Shell>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}