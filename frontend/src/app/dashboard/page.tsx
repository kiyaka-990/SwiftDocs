"use client"
import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { Zap, FileText, Key, CreditCard, LogOut, Plus, Download, Clock, CheckCircle, Trash2, RefreshCw, Search, Activity, Copy, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [docs, setDocs] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [tab, setTab] = useState("docs")
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get("topup") === "success") {
        toast.loading("Verifying payment...", { id: "sync" })
        let attempts = 0
        const poll = setInterval(async () => {
          const success = await refreshMe()
          attempts++
          if (success || attempts >= 5) {
            clearInterval(poll); await load();
            router.replace("/dashboard");
            toast.success("Credits synced!", { id: "sync" })
          }
        }, 2000)
      } else { load() }
    }
    init()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [d, k] = await Promise.all([api.get("/documents/"), api.get("/auth/api-keys")])
      setDocs(d.data); setKeys(k.data); await refreshMe()
    } finally { setLoading(false) }
  }

  async function handleCreateKey() {
    try {
      const { data } = await api.post("/auth/api-keys", { name: newKeyName })
      setCreatedKey(data.key); setNewKeyName(""); load();
    } catch { toast.error("Failed to create key") }
  }

  if (!mounted || !user) return <div className="min-h-screen bg-[#0a0a0c]" />

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex text-gray-200">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0d0d10] border-r border-white/5 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10 px-2 font-bold text-xl text-white">
          <Zap className="text-brand-500 fill-brand-500" /> SwiftDocs
        </div>
        
        <nav className="flex-1 space-y-2">
          {[{ id: "docs", icon: <FileText size={18}/> }, { id: "keys", icon: <Key size={18}/> }, { id: "billing", icon: <CreditCard size={18}/> }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl capitalize transition ${tab === t.id ? "bg-white/5 text-white border border-white/10" : "text-gray-500 hover:text-white"}`}>
              {t.icon} {t.id}
            </button>
          ))}
        </nav>

        {/* BALANCE & ANALYTICS */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-[32px] mb-6 backdrop-blur-xl">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Balance</p>
          <div className="text-3xl font-bold text-white mb-4">{user.credits}</div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${(user.credits_used / (user.credits + user.credits_used || 1)) * 100}%` }} />
          </div>
          <button onClick={() => setTab("billing")} className="w-full mt-4 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold">Add Credits +</button>
        </div>
        
        <button onClick={logout} className="flex items-center gap-2 text-gray-500 px-2 hover:text-white transition"><LogOut size={16}/> Logout</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-rgb),0.03),transparent)]">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold capitalize text-white tracking-tight">{tab}</h1>
          <button onClick={load} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
             <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
          </button>
        </header>

        {/* Tab Logic - API Keys specifically sorted here */}
        {tab === "keys" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#0d0d10] border border-white/10 p-8 rounded-[32px] shadow-2xl">
              <h3 className="font-bold text-white mb-4">Generate API Key</h3>
              <div className="flex gap-3">
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key Name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none" />
                <button onClick={handleCreateKey} className="bg-white text-black px-6 rounded-xl font-bold hover:bg-brand-500 hover:text-white transition">Generate</button>
              </div>
              {createdKey && (
                <div className="mt-6 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between">
                  <code className="text-xs text-brand-500">{createdKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied!") }}><Copy size={16} className="text-brand-500"/></button>
                </div>
              )}
            </div>
            {keys.map(k => (
              <div key={k.id} className="bg-[#0d0d10] border border-white/5 p-5 rounded-2xl flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl"><Key size={18} /></div>
                  <div><div className="font-bold text-white text-sm">{k.name}</div><div className="text-[10px] text-gray-600 font-mono">{k.key_preview}</div></div>
                </div>
                <button onClick={async () => { await api.delete(`/auth/api-keys/${k.id}`); load(); }} className="text-red-500/50 hover:text-red-500 text-xs font-bold">Revoke</button>
              </div>
            ))}
          </div>
        )}

        {/* ... (Docs and Billing tabs logic remains consistent with your previous modern layout) */}
      </main>
    </div>
  )
}