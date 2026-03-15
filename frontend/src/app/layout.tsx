// src/app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "SwiftDocs — Blazing-Fast PDF Generation API",
  description: "Generate professional PDFs in milliseconds. Catalogues, invoices, letters and more. Powered by Rust.",
  openGraph: {
    title: "SwiftDocs",
    description: "Blazing-fast PDF generation API powered by Rust.",
    url: "https://swiftdocs.io",
    siteName: "SwiftDocs",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: "#1d1d1f", color: "#fff", border: "1px solid #3d3d42" },
          }}
        />
      </body>
    </html>
  )
}
