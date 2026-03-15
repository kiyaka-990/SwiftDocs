// src/app/dashboard/page.tsx
"use client"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  Zap, FileText, Key, CreditCard, LogOut,
  Plus, Download, Clock, CheckCircle, XCircle,
  Copy, Trash2, RefreshCw, ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Doc = {
  id: string; template: string; status: string
  download_url: string | null; file_size: number | null; created_at: string
}
type ApiKey = {
  id: string; name: string; key_preview: string; last_used: string | null; created_at: string
}

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  const [docs, setDocs] = useState<Doc[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [tab, setTab] = useState<"docs" | "keys" | "billing">("docs")
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push("/login"); return }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    try {
      const [docsRes, keysRes] = await Promise.all([
        api.get("/documents/"),
        api.get("/auth/api-keys"),
      ])
      setDocs(docsRes.data)
      setKeys(keysRes.data)
      await refreshMe()
    } catch (e) {
      toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return toast.error("Enter a key name")
    try {
      const { data } = await api.post("/auth/api-keys", { name: newKeyName })
      setCreatedKey(data.key)
      setNewKeyName("")
      await load()
      toast.success("API key created!")
    } catch {
      toast.error("Failed to create key")
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key?")) return
    try {
      await api.delete(`/auth/api-keys/${id}`)
      setKeys((k) => k.filter((x) => x.id !== id))
      toast.success("Key revoked")
    } catch {
      toast.error("Failed to revoke key")
    }
  }

  async function buyCredits(pack: string) {
    try {
      const { data } = await api.post("/billing/topup", {
        pack,
        success_url: window.location.origin + "/dashboard?topup=success",
        cancel_url:  window.location.origin + "/dashboard",
      })
      window.location.href = data.checkout_url
    } catch {
      toast.error("Failed to start checkout")
    }
  }

  const statusIcon = (s: string) => {
    if (s === "done")       return <CheckCircle className="w-4 h-4 text-green-400" />
    if (s === "failed")     return <XCircle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-dark-800 border-r border-dark-600 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Zap className="w-5 h-5 text-brand-500" />
          <span className="font-bold">SwiftDocs</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: "docs",    icon: <FileText className="w-4 h-4" />, label: "Documents" },
            { id: "keys",    icon: <Key className="w-4 h-4" />,      label: "API Keys"  },
            { id: "billing", icon: <CreditCard className="w-4 h-4" />, label: "Credits" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as typeof tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === item.id
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-gray-400 hover:text-white hover:bg-dark-600"
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        {/* Credits badge */}
        <div className="mt-auto p-3 bg-dark-700 rounded-xl mb-3">
          <div className="text-xs text-gray-500 mb-1">Credits remaining</div>
          <div className="text-2xl font-bold text-white">{user?.credits ?? 0}</div>
          <button onClick={() => setTab("billing")} className="text-xs text-brand-500 hover:underline mt-1">
            Buy more →
          </button>
        </div>

        <button
          onClick={() => { logout(); router.push("/") }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-white rounded-lg transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold capitalize">{tab}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {tab === "docs"    && "Your generated documents"}
              {tab === "keys"    && "Manage your API keys"}
              {tab === "billing" && "Purchase document credits"}
            </p>
          </div>
          <button onClick={load} className="btn-ghost text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* ── Documents tab ── */}
        {tab === "docs" && (
          <div>
            <Link href="/dashboard/generate" className="btn-primary mb-6 w-fit">
              <Plus className="w-4 h-4" /> Generate document
            </Link>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-dark-700" />)}
              </div>
            ) : docs.length === 0 ? (
              <div className="card text-center py-16 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No documents yet.</p>
                <Link href="/dashboard/generate" className="btn-primary mt-4 mx-auto w-fit">
                  Generate your first PDF
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="card flex items-center gap-4 py-4">
                    {statusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium capitalize text-sm">{doc.template.replace("_", " ")}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{doc.id}</div>
                    </div>
                    <span className={`badge ${
                      doc.status === "done" ? "bg-green-500/10 text-green-400" :
                      doc.status === "failed" ? "bg-red-500/10 text-red-400" :
                      "bg-yellow-500/10 text-yellow-400"
                    }`}>{doc.status}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {doc.download_url && (
  <button
    onClick={async () => {
      const raw = localStorage.getItem("swiftdocs-auth")
      const token = raw ? JSON.parse(raw)?.state?.token : null
      const res = await fetch(`http://localhost:8000${doc.download_url}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { toast.error("Download failed"); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${doc.template}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }}
    className="btn-ghost text-xs px-3 py-1.5"
  >
    <Download className="w-3.5 h-3.5" /> Download
  </button>
)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── API Keys tab ── */}
        {tab === "keys" && (
          <div className="space-y-6">
            {/* Create key */}
            <div className="card">
              <h3 className="font-semibold mb-4">Create new API key</h3>
              <div className="flex gap-3">
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createKey()}
                  placeholder="Key name (e.g. production, testing)"
                  className="input flex-1"
                />
                <button onClick={createKey} className="btn-primary">
                  <Plus className="w-4 h-4" /> Create
                </button>
              </div>
            </div>

            {/* Newly created key – show once */}
            {createdKey && (
              <div className="card border-green-500/30 bg-green-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-400">⚠ Copy this key — it won't be shown again</p>
                  <button onClick={() => setCreatedKey(null)} className="text-gray-500 hover:text-white text-xs">Dismiss</button>
                </div>
                <div className="flex items-center gap-3 bg-dark-700 rounded-lg px-4 py-3 font-mono text-sm">
                  <span className="flex-1 break-all">{createdKey}</span>
                  <button onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied!") }}>
                    <Copy className="w-4 h-4 text-brand-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Keys list */}
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="card flex items-center gap-4 py-4">
                  <Key className="w-4 h-4 text-brand-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{k.name}</div>
                    <div className="text-xs font-mono text-gray-500">{k.key_preview}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {k.last_used ? `Used ${new Date(k.last_used).toLocaleDateString()}` : "Never used"}
                  </div>
                  <button onClick={() => revokeKey(k.id)} className="btn-ghost text-red-400 hover:text-red-300 text-xs px-3 py-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                  </button>
                </div>
              ))}
              {keys.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">No API keys yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Billing tab ── */}
        {tab === "billing" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: "starter",  credits: 10,  price: "$8",   label: "Starter"   },
              { id: "growth",   credits: 50,  price: "$35",  label: "Growth", highlight: true },
              { id: "pro",      credits: 200, price: "$120", label: "Pro"       },
              { id: "team",     credits: 999, price: "$399", label: "Unlimited" },
            ].map((p) => (
              <div key={p.id} className={`card flex flex-col ${(p as any).highlight ? "border-brand-500" : ""}`}>
                <div className="text-gray-400 text-sm mb-1">{p.label}</div>
                <div className="text-3xl font-bold mb-1">{p.price}</div>
                <div className="text-gray-500 text-sm mb-6">
                  {p.credits === 999 ? "Unlimited documents" : `${p.credits} documents`}
                </div>
                <button onClick={() => buyCredits(p.id)}
                  className={`mt-auto ${(p as any).highlight ? "btn-primary justify-center" : "btn-ghost border border-dark-500 rounded-xl justify-center"}`}>
                  Buy now
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
