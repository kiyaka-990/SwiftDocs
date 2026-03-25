// src/app/dashboard/page.tsx
"use client"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  Zap, FileText, Key, CreditCard, LogOut,
  Plus, Download, Clock, CheckCircle, XCircle,
  Copy, Trash2, RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

// --- TYPE DEFINITIONS ---
type Doc = {
  id: string;
  template: string;
  status: string;
  download_url: string | null;
  file_size: number | null;
  created_at: string;
}

type ApiKey = {
  id: string;
  name: string;
  key_preview: string;
  last_used: string | null;
  created_at: string;
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-900" />}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  const { user, logout, refreshMe } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [docs, setDocs] = useState<Doc[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [tab, setTab] = useState<"docs" | "keys" | "billing">("docs")
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
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
  }, [refreshMe])

  useEffect(() => {
    if (!user) {
      const checkAuth = async () => {
        await refreshMe()
        if (!user) router.push("/login")
      }
      checkAuth()
    } else {
      load()
    }
  }, [user, load, router, refreshMe])

  useEffect(() => {
    const topupStatus = searchParams.get("topup")
    if (topupStatus === "success") {
      toast.success("Payment successful! Updating credits...")
      const timer = setTimeout(() => {
        load()
        router.replace("/dashboard")
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, load, router])

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

  async function downloadDoc(doc: Doc) {
    if (!doc.download_url) return
    try {
      const res = await api.get(doc.download_url, { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `${doc.template}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed")
    }
  }

  const statusIcon = (s: string) => {
    if (s === "done")   return <CheckCircle className="w-4 h-4 text-green-400" />
    if (s === "failed") return <XCircle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
  }

  // --- UI RENDER (Sidebar & Main content) ---
  return (
    <div className="min-h-screen bg-dark-900 flex text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Zap className="w-5 h-5 text-brand-500" />
          <span className="font-bold text-lg tracking-tight">SwiftDocs</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: "docs",    icon: <FileText className="w-4 h-4" />, label: "Documents" },
            { id: "keys",    icon: <Key className="w-4 h-4" />,      label: "API Keys"  },
            { id: "billing", icon: <CreditCard className="w-4 h-4" />, label: "Credits" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === item.id
                  ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                  : "text-gray-400 hover:text-white hover:bg-dark-600"
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        {/* Credits Badge */}
        <div className="mt-auto p-4 bg-dark-700/50 rounded-2xl mb-4 border border-dark-600/50">
          <div className="text-xs text-gray-500 font-medium mb-1">Credits remaining</div>
          <div className="text-3xl font-bold text-white transition-all duration-500">
            {user?.credits ?? 0}
          </div>
          <button onClick={() => setTab("billing")} className="text-xs text-brand-500 font-semibold hover:text-brand-400 transition mt-2 flex items-center gap-1">
            Top up balance <Plus className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={() => { logout(); router.push("/") }}
          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold capitalize tracking-tight">{tab}</h1>
            <p className="text-gray-500 mt-1">
              {tab === "docs" && "Overview of your generated PDFs"}
              {tab === "keys" && "Manage programmatic access keys"}
              {tab === "billing" && "Choose a credit pack to continue"}
            </p>
          </div>
          <button onClick={load} className="p-2 hover:bg-dark-700 rounded-full transition-colors text-gray-400 hover:text-white">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content Rendering Logic... */}
        {/* (Assuming you'll paste your existing tab rendering here) */}
      </main>
    </div>
  )
}