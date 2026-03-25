"use client"
import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  Zap, FileText, Key, CreditCard, LogOut,
  Plus, Download, Clock, CheckCircle, XCircle,
  Copy, Trash2, RefreshCw, Search, History, Activity
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Doc = {
  id: string; template: string; status: string;
  download_url: string | null; created_at: string
}
type ApiKey = {
  id: string; name: string; key_preview: string; last_used: string | null; created_at: string
}
type LogEntry = {
  id: string; action: string; time: string; type: "success" | "info" | "warning"
}

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
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
        addLog("Payment verification started", "info")
        
        const initialCredits = user?.credits ?? 0
        let attempts = 0;

        const pollInterval = setInterval(async () => {
          await refreshMe() // Void function, just call it
          attempts++
          
          // Check if credits actually increased in the store
          if ((user?.credits ?? 0) > initialCredits || attempts >= 5) {
            clearInterval(pollInterval)
            await load()
            router.replace("/dashboard")
            toast.success("Credits updated!", { id: "sync" })
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
    if (mounted && !user && !loading) {
       router.push("/login")
    }
  }, [user, mounted, loading])

  async function load() {
    setLoading(true)
    try {
      const [docsRes, keysRes] = await Promise.all([
        api.get("/documents/"),
        api.get("/auth/api-keys"),
      ])
      await refreshMe() 
      setDocs(docsRes.data)
      setKeys(keysRes.data)
    } catch (e) {
      toast.error("Failed to sync data")
    } finally {
      setLoading(false)
    }
  }

  const filteredDocs = useMemo(() => 
    docs.filter(d => d.template.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery)),
    [docs, searchQuery]
  )

  async function downloadDoc(doc: Doc) {
    if (!doc.download_url) return
    try {
      const res = await api.get(doc.download_url, { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `${doc.template}_${doc.id.slice(0, 5)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addLog(`Downloaded ${doc.template}`, "info")
    } catch { toast.error("Download failed") }
  }

  async function deleteDoc(id: string) {
    if (!confirm("Permanently delete this document?")) return
    try {
      await api.delete(`/documents/${id}`)
      setDocs(prev => prev.filter(x => x.id !== id))
      toast.success("Document deleted")
      addLog("Document deleted", "warning")
    } catch { toast.error("Delete failed") }
  }

  async function createKey() {
    if (!newKeyName.trim()) return toast.error("Enter a key name")
    try {
      const { data } = await api.post("/auth/api-keys", { name: newKeyName })
      setCreatedKey(data.key)
      setNewKeyName("")
      await load()
      toast.success("Key generated")
      addLog(`Created API Key: ${newKeyName}`, "success")
    } catch { toast.error("Creation failed") }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key?")) return
    try {
      await api.delete(`/auth/api-keys/${id}`)
      setKeys(prev => prev.filter(x => x.id !== id))
      toast.success("Key revoked")
      addLog("API Key revoked", "warning")
    } catch { toast.error("Revoke failed") }
  }

  async function buyCredits(pack: string) {
    try {
      const { data } = await api.post("/billing/topup", {
        pack,
        success_url: window.location.origin + "/dashboard?topup=success",
        cancel_url:  window.location.origin + "/dashboard",
      })
      window.location.href = data.checkout_url
    } catch { toast.error("Stripe service error") }
  }

  if (!mounted) return <div className="min-h-screen bg-[#0a0a0c]" />

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex text-gray-200 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0d0d10] border-r border-white/5 flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-brand-500 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">SwiftDocs</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[{ id: "docs", icon: <FileText className="w-4 h-4" />, label: "Documents" },
            { id: "keys", icon: <Key className="w-4 h-4" />, label: "API Keys" },
            { id: "billing", icon: <CreditCard className="w-4 h-4" />, label: "Credits" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === item.id ? "bg-white/5 text-white border border-white/10" : "text-gray-500 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              {item.icon} <span className="capitalize">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* RECENT ACTIVITY LOG */}
        <div className="mt-6 mb-6">
          <div className="flex items-center gap-2 px-2 mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <Activity className="w-3 h-3" /> Recent Activity
          </div>
          <div className="space-y-2">
            {activityLog.length > 0 ? activityLog.map(log => (
              <div key={log.id} className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-[11px]">
                <div className="flex justify-between items-start mb-0.5">
                  <span className={`font-medium ${log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-red-400' : 'text-brand-400'}`}>
                    {log.action}
                  </span>
                  <span className="text-gray-600 text-[9px]">{log.time}</span>
                </div>
              </div>
            )) : (
              <p className="px-3 text-[10px] text-gray-600 italic">No recent actions</p>
            )}
          </div>
        </div>

        {/* BALANCE CARD & USAGE ANALYTICS */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
          <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Available Balance</p>
          <div className="text-3xl font-bold text-white tracking-tighter mb-4">{user?.credits ?? 0}</div>
          
          <div className="space-y-2 pt-4 border-t border-white/5">
             <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase">
                <span>Usage</span>
                <span className="text-brand-500">{(user as any)?.credits_used ?? 0} used</span>
             </div>
             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${Math.min((((user as any)?.credits_used || 0) / ((user?.credits || 1) + ((user as any)?.credits_used || 0))) * 100, 100)}%` }}
                />
             </div>
          </div>

          <button onClick={() => setTab("billing")} className="w-full mt-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:brightness-110 transition shadow-lg shadow-brand-500/20">
            Add Credits +
          </button>
        </div>

        <button onClick={() => { logout(); router.push("/") }} className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition px-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent)]">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold capitalize text-white tracking-tight">{tab}</h1>
          <div className="flex gap-4">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-500 transition-colors" />
                <input 
                  placeholder="Search records..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none w-72 focus:border-brand-500/50 transition-all focus:bg-white/[0.08]"
                />
             </div>
             <button onClick={load} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition active:scale-95">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </header>

        {tab === "docs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard/generate" className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                    <Plus className="w-4 h-4" /> New Document
                </Link>
                <button className="text-xs text-gray-400 hover:text-white flex items-center gap-2 transition">
                    <History className="w-4 h-4" /> View History
                </button>
            </div>
            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
              <div key={doc.id} className="bg-[#0d0d10] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all hover:bg-white/[0.03]">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${doc.status === 'done' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    {doc.status === 'done' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-yellow-400 animate-spin" />}
                  </div>
                  <div>
                    <div className="font-bold text-white capitalize text-sm">{doc.template.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5 tracking-tight">{doc.id}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                    {doc.download_url && <button onClick={() => downloadDoc(doc)} className="p-2 hover:bg-brand-500/10 rounded-lg transition text-brand-500"><Download className="w-4 h-4" /></button>}
                    <button onClick={() => deleteDoc(doc.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/40 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[32px] bg-white/[0.01]">
                <FileText className="w-10 h-10 text-gray-800 mx-auto mb-4" />
                <p className="text-gray-600 text-sm font-medium">No documents generated yet</p>
              </div>
            )}
          </div>
        )}

        {tab === "keys" && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#0d0d10] border border-white/10 p-8 rounded-[32px]">
              <h3 className="font-bold text-lg text-white mb-1">API Key Management</h3>
              <p className="text-xs text-gray-500 mb-6">Create keys to authenticate your external requests.</p>
              <div className="flex gap-3">
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key identifier" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500/50 transition-colors" />
                <button onClick={createKey} className="bg-white text-black px-8 rounded-xl font-bold hover:bg-brand-500 hover:text-white transition-all">Generate</button>
              </div>
              {createdKey && (
                <div className="mt-6 p-5 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-between">
                  <div className="overflow-hidden mr-4">
                    <p className="text-[10px] text-brand-400 font-bold uppercase mb-1 tracking-widest">Secure Key (Save this!)</p>
                    <code className="text-xs text-brand-200 font-mono break-all">{createdKey}</code>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied!") }} className="p-3 bg-brand-500/20 rounded-xl hover:bg-brand-500/40 transition"><Copy className="w-4 h-4 text-brand-500" /></button>
                </div>
              )}
            </div>
            {keys.map(k => (
              <div key={k.id} className="bg-[#0d0d10] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl group-hover:bg-brand-500/10 group-hover:text-brand-500 transition-colors"><Key className="w-4 h-4" /></div>
                  <div><div className="font-bold text-white text-sm">{k.name}</div><div className="text-[10px] text-gray-600 font-mono mt-1">{k.key_preview}</div></div>
                </div>
                <button onClick={() => revokeKey(k.id)} className="text-red-500/30 hover:text-red-500 text-[10px] font-bold transition-all uppercase tracking-tighter">Revoke Access</button>
              </div>
            ))}
          </div>
        )}

        {tab === "billing" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { id: "starter", credits: 10, price: "$8" },
              { id: "growth", credits: 50, price: "$35", highlight: true },
              { id: "pro", credits: 200, price: "$120" },
              { id: "team", credits: 999, price: "$399" },
            ].map(p => (
              <div key={p.id} className={`p-8 rounded-[35px] border flex flex-col transition-all duration-300 hover:-translate-y-2 ${p.highlight ? 'bg-brand-500 border-brand-500 text-white shadow-xl' : 'bg-[#0d0d10] border-white/10 text-gray-300 hover:border-white/20'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">{p.id}</p>
                <h3 className="text-4xl font-bold mb-1 tracking-tighter">{p.price}</h3>
                <div className="text-sm font-medium mb-12 opacity-80">{p.credits === 999 ? "Enterprise Access" : `${p.credits} Document Credits`}</div>
                <button onClick={() => buyCredits(p.id)} className={`w-full py-4 rounded-2xl font-bold transition-all ${p.highlight ? 'bg-white text-brand-600 hover:shadow-xl' : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black'}`}>Select Plan</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}