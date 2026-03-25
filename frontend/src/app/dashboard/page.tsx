"use client"
import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  Zap, FileText, Key, CreditCard, LogOut,
  Plus, Download, Clock, CheckCircle, XCircle,
  Copy, Trash2, RefreshCw, Search
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

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [tab, setTab] = useState<"docs" | "keys" | "billing">("docs")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // 1. Fix Hydration and Handle Stripe Return Instantly
  useEffect(() => {
    setMounted(true)
    const init = async () => {
      await refreshMe()
      
      const params = new URLSearchParams(window.location.search)
      if (params.get("topup") === "success") {
        toast.success("Syncing your new credits...")
        // 2s delay to allow Webhook to finish writing to DB
        setTimeout(async () => {
          await load()
          router.replace("/dashboard")
        }, 2000)
      } else {
        load()
      }
    }
    init()
  }, [])

  // 2. Security Check: If refreshMe finishes and no user, go to login
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
      setDocs(docsRes.data)
      setKeys(keysRes.data)
      await refreshMe() // Final sync
    } catch (e) {
      toast.error("Failed to sync data")
    } finally {
      setLoading(false)
    }
  }

  // Search Logic
  const filteredDocs = useMemo(() => 
    docs.filter(d => d.template.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery)),
    [docs, searchQuery]
  )

  // Download All Feature
  async function downloadAllReady() {
    const ready = docs.filter(d => d.status === "done" && d.download_url)
    if (ready.length === 0) return toast.error("No documents ready for download")
    
    toast.loading(`Starting ${ready.length} downloads...`, { duration: 3000 })
    for (const doc of ready) {
      await downloadDoc(doc)
    }
  }

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
    } catch { toast.error("Download failed") }
  }

  async function deleteDoc(id: string) {
    if (!confirm("Permanently delete this document?")) return
    try {
      await api.delete(`/documents/${id}`)
      setDocs(d => d.filter(x => x.id !== id))
      toast.success("Document deleted")
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
    } catch { toast.error("Creation failed") }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key?")) return
    try {
      await api.delete(`/auth/api-keys/${id}`)
      setKeys(k => k.filter(x => x.id !== id))
      toast.success("Key revoked")
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
    <div className="min-h-screen bg-[#0a0a0c] flex text-gray-200">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0d0d10] border-r border-white/5 flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Zap className="w-5 h-5 text-brand-500 fill-brand-500" />
          <span className="font-bold text-xl text-white">SwiftDocs</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[{ id: "docs", icon: <FileText className="w-4 h-4" />, label: "Documents" },
            { id: "keys", icon: <Key className="w-4 h-4" />, label: "API Keys" },
            { id: "billing", icon: <CreditCard className="w-4 h-4" />, label: "Credits" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                tab === item.id ? "bg-white/5 text-white border border-white/10" : "text-gray-500 hover:text-white"
              }`}
            >
              {item.icon} <span className="capitalize">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-5 bg-white/5 border border-white/10 rounded-2xl mb-6">
          <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Balance</p>
          <div className="text-3xl font-bold text-white tracking-tighter">{user?.credits ?? 0}</div>
          <button onClick={() => setTab("billing")} className="w-full mt-4 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition">
            Add Credits +
          </button>
        </div>

        <button onClick={() => { logout(); router.push("/") }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition px-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold capitalize text-white tracking-tight">{tab}</h1>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none w-64 focus:border-brand-500/50"
                />
             </div>
             <button onClick={load} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </header>

        {/* Tab Logic */}
        {tab === "docs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard/generate" className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-600 transition shadow-lg shadow-brand-500/10">
                    <Plus className="w-4 h-4" /> New Document
                </Link>
                <button onClick={downloadAllReady} className="text-xs text-gray-400 hover:text-white flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download All Ready
                </button>
            </div>
            {filteredDocs.map(doc => (
              <div key={doc.id} className="bg-[#0d0d10] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${doc.status === 'done' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    {doc.status === 'done' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-yellow-400 animate-spin" />}
                  </div>
                  <div>
                    <div className="font-bold text-white capitalize text-sm">{doc.template.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">{doc.id}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                    {doc.download_url && <button onClick={() => downloadDoc(doc)} className="p-2 hover:bg-white/10 rounded-lg transition text-brand-500"><Download className="w-4 h-4" /></button>}
                    <button onClick={() => deleteDoc(doc.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "keys" && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#0d0d10] border border-white/5 p-8 rounded-3xl">
              <h3 className="font-bold text-white mb-4">API Key Generation</h3>
              <div className="flex gap-3">
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key Name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none" />
                <button onClick={createKey} className="bg-white text-black px-8 rounded-xl font-bold">Generate</button>
              </div>
              {createdKey && (
                <div className="mt-6 p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-between">
                  <code className="text-xs text-brand-500 font-mono break-all">{createdKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied!") }} className="p-2"><Copy className="w-4 h-4 text-brand-500" /></button>
                </div>
              )}
            </div>
            {keys.map(k => (
              <div key={k.id} className="bg-[#0d0d10] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl"><Key className="w-4 h-4 text-gray-400" /></div>
                  <div><div className="font-bold text-white">{k.name}</div><div className="text-xs text-gray-600 font-mono">{k.key_preview}</div></div>
                </div>
                <button onClick={() => revokeKey(k.id)} className="text-red-500/50 hover:text-red-500 text-xs font-bold transition">Revoke</button>
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
              <div key={p.id} className={`p-8 rounded-[32px] border flex flex-col transition-all ${p.highlight ? 'bg-brand-500 border-brand-500 text-white shadow-2xl shadow-brand-500/20' : 'bg-[#0d0d10] border-white/5 text-gray-300'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">{p.id}</p>
                <h3 className="text-3xl font-bold mb-1">{p.price}</h3>
                <div className="text-sm mb-10">{p.credits === 999 ? "Unlimited" : p.credits} Credits</div>
                <button onClick={() => buyCredits(p.id)} className={`w-full py-3 rounded-2xl font-bold ${p.highlight ? 'bg-black text-white' : 'bg-white text-black'}`}>Buy Now</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}