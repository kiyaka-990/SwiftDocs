// src/app/login/page.tsx
"use client"
import { useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Zap } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const { login } = useAuthStore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-7 h-7 text-brand-500" />
            <span className="text-2xl font-bold">SwiftDocs</span>
          </div>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account?{" "}
          <Link href="/register" className="text-brand-500 hover:underline">Create one free</Link>
        </p>
      </div>
    </div>
  )
}
