// src/app/page.tsx
"use client"
import Link from "next/link"
import { Zap, FileText, Code2, CreditCard, ArrowRight, Check, Shield, Globe } from "lucide-react"

const features = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Rust-powered speed",
    desc: "Our PDF engine is written in Rust — 10–50× faster than Python alternatives. Your documents in milliseconds.",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "5 templates, growing",
    desc: "Catalogues, invoices, letters, spec sheets, price schedules. All pixel-perfect, print-ready PDFs.",
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "Simple REST API",
    desc: "One POST request. JSON in, PDF out. Works with any language, any framework. API keys included.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Pay per document",
    desc: "No monthly lock-in. Buy credit packs. 3 free documents on signup to try before you buy.",
  },
]

const packs = [
  { id: "starter",  credits: 10,  price: "$8",   label: "Starter",   highlight: false },
  { id: "growth",   credits: 50,  price: "$35",  label: "Growth",    highlight: true  },
  { id: "pro",      credits: 200, price: "$120", label: "Pro",       highlight: false },
  { id: "team",     credits: 999, price: "$399", label: "Unlimited", highlight: false },
]

const codeExample = `// Generate a PDF with one API call
const res = await fetch("https://api.swiftdocs.io/api/documents/generate", {
  method: "POST",
  headers: {
    "x-api-key": "sd_live_your_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    template: "invoice",
    payload: {
      invoice_number: "INV-001",
      from_name: "Asterleigh Systems Ltd",
      to_name: "Nairobi City County",
      currency: "KES",
      items: [
        { description: "MacBook Pro M4 Pro", qty: 2, unit_price: 419000 }
      ]
    }
  })
})

const { document_id, status } = await res.json()
// Poll /documents/{document_id}/status → download_url ready in ~200ms`

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-900">

      {/* ── Nav ── */}
      <nav className="border-b border-dark-600 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-brand-500" />
          <span className="text-xl font-bold">SwiftDocs</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost text-sm">Dashboard</Link>
          <Link href="/login" className="btn-ghost text-sm">Login</Link>
          <Link href="/register" className="btn-primary text-sm">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-500 text-sm font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by Rust — 10× faster than Python PDF libs
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          PDF generation
          <br />
          <span className="text-brand-500">that actually ships fast</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          One API call. Professional PDFs in milliseconds.
          Invoices, catalogues, letters, spec sheets — all blazing fast.
          <strong className="text-white"> 3 free documents</strong> to start, no card required.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/docs" className="btn-ghost px-6 py-3 text-base border border-dark-500 rounded-xl">
            View docs
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mt-16 text-sm">
          {[["~200ms", "avg generation"], ["5", "templates"], ["99.9%", "uptime"], ["REST", "simple API"]].map(([val, lbl]) => (
            <div key={lbl} className="text-center">
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-gray-500 mt-0.5">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Code example ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-gray-500 text-xs font-mono">generate.js</span>
          </div>
          <pre className="text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed">
            <code>{codeExample}</code>
          </pre>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Simple, pay-per-doc pricing</h2>
          <p className="text-gray-400">Buy once, never expires. Start with 3 free docs.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packs.map((p) => (
            <div key={p.id} className={`card relative flex flex-col ${p.highlight ? "border-brand-500 shadow-lg shadow-brand-500/10" : ""}`}>
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-500 rounded-full text-xs font-semibold">
                  Most popular
                </div>
              )}
              <div className="text-gray-400 text-sm mb-1">{p.label}</div>
              <div className="text-3xl font-bold mb-1">{p.price}</div>
              <div className="text-gray-500 text-sm mb-6">{p.credits === 999 ? "Unlimited" : `${p.credits} documents`}</div>
              <Link href={`/register?pack=${p.id}`} className={`mt-auto ${p.highlight ? "btn-primary justify-center" : "btn-ghost border border-dark-500 rounded-xl justify-center"}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          All plans include: Rust-speed engine · All 5 templates · API access · PDF download links
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-dark-600 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-500" />
            <span>SwiftDocs</span>
          </div>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-white transition">Docs</Link>
            <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/login" className="hover:text-white transition">Login</Link>
          </div>
          <span>© 2026 SwiftDocs</span>
        </div>
      </footer>
    </div>
  )
}
