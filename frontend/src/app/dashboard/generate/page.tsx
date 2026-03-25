"use client"
import { useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"
import { Zap, Loader2, CheckCircle2 } from "lucide-react"

export default function Register() {
  const { register } = useAuthStore()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.email, form.name, form.password)
      toast.success("Welcome! 3 Free Documents added.")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 selection:bg-brand-500/30">
      <div className="w-full max-w-md bg-[#0d0d10] border border-white/5 p-10 rounded-[40px] shadow-2xl relative">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-3 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/20">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Join SwiftDocs</h1>
          
          <div className="mt-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-[11px] font-bold text-green-400 uppercase tracking-wide">
              3 free documents included — no credit card required
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            placeholder="Full Name" required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input 
            type="email" placeholder="Email Address" required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 transition-all"
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button 
            disabled={loading}
            className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold hover:brightness-110 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8">
          Already have an account? <Link href="/login" className="text-brand-500 font-bold hover:underline transition">Login</Link>
        </p>
      </div>
    </div>
  )
}