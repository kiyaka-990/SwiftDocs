"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { Zap, ArrowLeft } from "lucide-react"
import Link from "next/link"

const TEMPLATES = ["invoice", "catalogue", "letter", "spec_sheet", "price_schedule"]

export default function GeneratePage() {
  const router = useRouter()
  const [template, setTemplate] = useState("invoice")
  const [payload, setPayload] = useState(`{\n  "invoice_number": "INV-001",\n  "from_name": "My Company",\n  "to_name": "Client Name"\n}`)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const parsed = JSON.parse(payload)
      await api.post("/documents/generate", { template, payload: parsed })
      toast.success("Document generated!")
      router.push("/dashboard")
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="btn-ghost mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-2">Generate Document</h1>
        <p className="text-gray-500 mb-8">Choose a template and provide the data</p>

        <div className="card space-y-6">
          {/* Template selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="input"
            >
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          {/* Payload editor */}
          <div>
            <label className="block text-sm font-medium mb-2">Payload (JSON)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={10}
              className="input font-mono text-sm"
              spellCheck={false}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <><Zap className="w-4 h-4" /> Generate PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}