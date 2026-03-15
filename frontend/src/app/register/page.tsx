// src/app/register/page.tsx
"use client"
import { useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Zap, Check } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const { register } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.email, form.name, form.password)
      toast.success("Account created! 3 free docs added.")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Registration failed")
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
          <p className="text-gray-400">Create your free account</p>
        </div>

        {/* Free tier callout */}
        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-6 text-sm text-green-400">
          <Check className="w-4 h-4 shrink-0" />
          3 free documents included — no credit card required
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Full name</label>
            <input value={form.name} onChange={set("name")}
              className="input" placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set("email")}
              className="input" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={set("password")}
              className="input" placeholder="Min 8 characters" required minLength={8} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? "Creating account…" : "Create free account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
