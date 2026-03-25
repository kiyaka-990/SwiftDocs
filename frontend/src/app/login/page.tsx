"use client"
import { useState } from "react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"
import { Zap, Loader2 } from "lucide-react"

export default function Login() {
  const { login } = useAuthStore()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0d0d10] border border-white/5 p-10 rounded-[32px] shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-brand-500 rounded-2xl mb-4">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-2">Log in to manage your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 transition-all"
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input 
            type="password" 
            placeholder="Password" 
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 transition-all"
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button 
            disabled={loading}
            className="w-full bg-brand-500 text-white py-4 rounded-xl font-bold hover:brightness-110 transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8">
          Don't have an account? <Link href="/register" className="text-brand-500 font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}