"use client"
import { useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Zap, CheckCircle2 } from "lucide-react"

export default function Register() {
  const { register } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState({ email: "", name: "", password: "" })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form.email, form.name, form.password)
      toast.success("Welcome! 3 Free Credits added.")
      router.push("/dashboard")
    } catch { toast.error("Registration failed") }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0d0d10] border border-white/5 p-10 rounded-[40px] shadow-2xl">
        <div className="flex flex-col items-center mb-10 text-center">
          <Zap className="w-10 h-10 text-brand-500 fill-brand-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Join SwiftDocs</h1>
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-[11px] font-bold text-green-400 uppercase tracking-wide">
              3 free documents included — no credit card required
            </span>
          </div>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-brand-500/50 outline-none" placeholder="Name" onChange={e => setForm({...form, name: e.target.value})} />
          <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-brand-500/50 outline-none" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
          <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-brand-500/50 outline-none" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
          <button className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold hover:brightness-110">Get Started</button>
        </form>
      </div>
    </div>
  )
}