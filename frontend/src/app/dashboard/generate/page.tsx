"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import toast from "react-hot-toast"
import { Zap, ArrowLeft, Loader2, FileJson } from "lucide-react"
import Link from "next/link"

const TEMPLATES = ["invoice", "catalogue", "letter", "spec_sheet", "price_schedule"]

export default function GeneratePage() {
  const router = useRouter()
  const { refreshMe, user } = useAuthStore()
  
  const [template, setTemplate] = useState("invoice")
  const [payload, setPayload] = useState(`{\n  "invoice_number": "INV-001",\n  "from_name": "My Company",\n  "to_name": "Client Name"\n}`)
  const [loading, setLoading] = useState(false)

  async function generate() {
    if ((user?.credits ?? 0) < 1) return toast.error("Insufficient credits")
    
    setLoading(true)
    try {
      const parsed = JSON.parse(payload)
      await api.post("/documents/generate", { template, payload: parsed })
      
      toast.success("Generation started!")
      await refreshMe() // Sync credits to sidebar
      router.push("/dashboard")
    } catch (e: any) {
      if (e.message === "Network Error") {
        toast.error("Server Timeout (502). Check Railway Logs.")
      } else {
        toast.error(e?.response?.data?.detail || "Invalid JSON or Server Error")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-8 text-gray-200">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition">
          <ArrowLeft size={16}/> Back to dashboard
        </Link>

        <div className="bg-[#0d0d10] border border-white/5 p-8 rounded-[32px] shadow-2xl">
          <h1 className="text-3xl font-bold mb-8">Generate Document</h1>
          
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Template</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <button key={t} onClick={() => setTemplate(t)} className={`px-4 py-3 rounded-xl border transition-all ${template === t ? "bg-brand-500 border-brand-500 text-white" : "bg-white/5 border-white/10 text-gray-400"}`}>
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Data (JSON)</label>
              <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={10} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 font-mono text-sm focus:border-brand-500/50 outline-none resize-none" />
            </div>

            <button onClick={generate} disabled={loading} className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold text-lg hover:brightness-110 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="white"/> Generate PDF</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}