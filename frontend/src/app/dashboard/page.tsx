"use client"
import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  Zap, FileText, Key, CreditCard, LogOut,
  Plus, Download, Clock, CheckCircle,
  Copy, Trash2, RefreshCw, Search, Activity, 
  ExternalLink, ShieldCheck, AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type LogEntry = { id: string; action: string; time: string; type: "success" | "info" | "warning" }

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [docs, setDocs] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<LogEntry[]>([])
  const [tab, setTab] = useState<"docs" | "keys" | "billing">("docs")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const addLog = (action: string, type: "success" | "info" | "warning" = "info") => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    }
    setActivityLog(prev => [newLog, ...prev].slice(0, 5))
  }

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
            clearInterval(poll)
            await load()
            router.replace("/dashboard")
            toast.success("Credits synced!", { id: "sync" })
            addLog("Credits added via Stripe", "success")
          }
        }, 2000)
      } else {
        load()
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (mounted && !user && !loading) router.push("/login")
  }, [user, mounted, loading])

  async function load() {
    setLoading(true)
    try {
      const [docsRes, keysRes] = await Promise.all([
        api.get("/documents/"),
        api.get("/auth/api-keys"),
        refreshMe()
      ])
      setDocs(docsRes.data)
      setKeys(keysRes.data)
    } catch (e) {
      toast.error("Sync failed")
    } finally {
      setLoading(false)
    }
  }

  // --- API KEY ACTIONS ---
  async function handleCreateKey() {
    if (!newKeyName.trim()) return toast.error("Please name your key")
    try {
      const { data } = await api.post("/auth/api-keys", { name: newKeyName })
      setCreatedKey(data.key)
      setNewKeyName("")
      addLog(`Generated key: ${data.name}`, "success")
      load()
      toast.success("API Key Generated")
    } catch { toast.error("Failed to create key") }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm("Revoke this key? All integrations using it will break.")) return
    try {
      await api.delete(`/auth/api-keys/${id}`)
      setKeys(prev => prev.filter(k => k.id !== id))
      addLog("API Key revoked", "warning")
      toast.success("Key revoked")
    } catch { toast.error("Revocation failed") }
  }

  // --- DOCUMENT ACTIONS ---
  async function deleteDoc(id: string) {
    if (!confirm("Delete permanently?")) return
    try {
      await api.delete(`/documents/${id}`)
      setDocs(prev => prev.filter(x => x.id !== id))
      addLog("Document deleted", "warning")
      toast.success("Deleted")
    } catch { toast.error("Delete failed") }
  }

  const filteredDocs = useMemo(() => 
    docs.filter(d => d.template.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery)),
    [docs, searchQuery]
  )

  if (!mounted || !user) return <div className="min-h-screen bg-[#0a0a0c]" />

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex text-gray-200 font-sans selection:bg-brand-500/30">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0d0d10] border-r border-white/5 flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2 font-bold text-xl text-white">
          <Zap className="w-5 h-5 text-brand-500 fill-brand-500" /> SwiftDocs
        </div>

        <nav className="flex-1 space-y-1">
          {[{ id: "docs", icon: <FileText size={18}/>, label: "Documents" },
            { id: "keys", icon: <Key size={18}/>, label: "API Keys" },
            { id: "billing", icon: <CreditCard size={18}/>, label: "Billing" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id as any); setCreatedKey(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                tab === item.id ? "bg-white/5 text-white border border-white/10" : "text-gray-500 hover:text-white"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* RECENT ACTIVITY */}
        <div className="mt-6 mb-6">
          <p className="px-2 mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12}/> Recent Activity
          </p>
          <div className="space-y-2">
            {activityLog.map(log => (
              <div key={log.id} className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-[11px] flex justify-between">
                <span className={log.type === 'success' ? 'text-green-400' : 'text-brand-400'}>{log.action}</span>
                <span className="text-gray-600">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BALANCE CARD & USAGE */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-[28px] backdrop-blur-xl">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Available Balance</p>
          <div className="text-3xl font-bold text-white mb-4 tracking-tighter">{user.credits}</div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
             <div className="h-full bg-brand-500 transition-all duration-1000" style={{ width: `${(user.credits_used / (user.credits + user.credits_used || 1)) * 100}%` }} />
          </div>
          <p className="text-[9px] text-gray-500 mt-2 font-medium">{user.credits_used} documents created to date</p>
          <button onClick={() => setTab("billing")} className="w-full mt-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:brightness-110 transition shadow-lg shadow-brand-500/20">
            Top Up
          </button>
        </div>

        <button onClick={logout} className="mt-6 flex items-center gap-2 text-sm text-gray-500 px-2 hover:text-white transition">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-rgb),0.03),transparent)]">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold capitalize text-white tracking-tight">{tab}</h1>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  placeholder="Search records..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm w-72 focus:outline-none focus:border-brand-500/50 transition-all"
                />
             </div>
             <button onClick={load} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition active:scale-95">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </header>

        {/* --- DOCUMENTS TAB --- */}
        {tab === "docs" && (
          <div className="space-y-4">
            <Link href="/dashboard/generate" className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-bold transition hover:shadow-xl hover:shadow-brand-500/20 active:scale-95">
              <Plus size={18}/> New Document
            </Link>
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <div key={doc.id} className="bg-[#0d0d10] border border-white/5 p-5 rounded-2xl flex justify-between items-center group hover:border-white/20 transition-all hover:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${doc.status === 'done' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    {doc.status === 'done' ? <CheckCircle className="text-green-400" size={18}/> : <Clock className="text-yellow-400 animate-spin" size={18}/>}
                  </div>
                  <div>
                    <div className="font-bold text-white capitalize text-sm">{doc.template.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-wider">{doc.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {doc.download_url && <button className="p-2 text-brand-500 hover:bg-brand-500/10 rounded-lg transition"><Download size={18}/></button>}
                   <button onClick={() => deleteDoc(doc.id)} className="p-2 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18}/></button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                <FileText className="mx-auto text-gray-800 mb-4" size={40} />
                <p className="text-gray-500 text-sm">No documents found.</p>
              </div>
            )}
          </div>
        )}

        {/* --- API KEYS TAB (FULLY SORTED) --- */}
        {tab === "keys" && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#0d0d10] border border-white/10 p-8 rounded-[32px] shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                 <ShieldCheck className="text-brand-500" size={24} />
                 <h3 className="font-bold text-lg text-white">Developer API Keys</h3>
              </div>
              
              <div className="flex gap-3">
                <input 
                  value={newKeyName} 
                  onChange={e => setNewKeyName(e.target.value)} 
                  placeholder="e.g. My Website Production" 
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500/50 transition-all" 
                />
                <button 
                  onClick={handleCreateKey}
                  className="bg-white text-black px-8 rounded-xl font-bold hover:bg-brand-500 hover:text-white transition-all active:scale-95"
                >Generate</button>
              </div>

              {createdKey && (
                <div className="mt-6 p-5 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-300">
                  <div className="overflow-hidden mr-4">
                    <p className="text-[10px] text-brand-400 font-bold uppercase mb-1 tracking-widest">Secret Key (Save it now!)</p>
                    <code className="text-xs text-brand-200 font-mono break-all">{createdKey}</code>
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied to clipboard") }} 
                    className="p-3 bg-brand-500/20 rounded-xl hover:bg-brand-500/40 transition active:scale-90"
                  ><Copy className="w-4 h-4 text-brand-500" /></button>
                </div>
              )}
            </div>

            <div className="grid gap-3">
               {keys.length > 0 ? keys.map(k => (
                 <div key={k.id} className="bg-[#0d0d10] border border-white/5 p-6 rounded-2xl flex justify-between items-center group hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white/5 rounded-xl text-gray-400 group-hover:text-brand-500 transition-colors"><Key size={20}/></div>
                       <div>
                          <div className="font-bold text-white text-sm">{k.name}</div>
                          <div className="text-[10px] text-gray-600 font-mono mt-1 flex items-center gap-2">
                             {k.key_preview} • <span className="opacity-50">Last used: {k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</span>
                          </div>
                       </div>
                    </div>
                    <button 
                       onClick={() => handleRevokeKey(k.id)}
                       className="text-red-500/30 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >Revoke</button>
                 </div>
               )) : (
                 <p className="text-center text-gray-600 text-xs py-10 italic">No API keys active.</p>
               )}
            </div>
          </div>
        )}

        {/* --- BILLING TAB --- */}
        {tab === "billing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
              { id: "starter", credits: 10, price: "$8" },
              { id: "growth", credits: 50, price: "$35", highlight: true },
              { id: "pro", credits: 200, price: "$120" },
              { id: "team", credits: 999, price: "$399" },
            ].map(p => (
              <div key={p.id} className={`p-8 rounded-[35px] border flex flex-col transition-all duration-300 hover:-translate-y-2 ${p.highlight ? 'bg-brand-500 border-brand-500 text-white shadow-2xl shadow-brand-500/20' : 'bg-[#0d0d10] border-white/10 text-gray-300 hover:border-white/20'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">{p.id}</p>
                <h3 className="text-4xl font-bold mb-1 tracking-tighter">{p.price}</h3>
                <div className="text-sm font-medium mb-12 opacity-80">{p.credits === 999 ? "Enterprise Access" : `${p.credits} Credits`}</div>
                <button 
                  onClick={async () => {
                    const { data } = await api.post("/billing/topup", { pack: p.id, success_url: window.location.origin + "/dashboard?topup=success", cancel_url: window.location.origin + "/dashboard" })
                    window.location.href = data.checkout_url
                  }}
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${p.highlight ? 'bg-white text-brand-600 hover:shadow-xl' : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black'}`}
                >Select Plan</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}