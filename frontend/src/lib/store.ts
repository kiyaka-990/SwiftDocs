import { create } from "zustand"
import { persist } from "zustand/middleware"
import api from "./api"

// 1. Added credits_used to the User interface
interface User {
  id: string
  email: string
  name: string
  credits: number
  credits_used: number 
}

interface AuthStore {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  // 2. Updated to return Promise<boolean> for truthiness checks
  refreshMe: () => Promise<boolean> 
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const form = new URLSearchParams({ username: email, password })
        const { data } = await api.post("/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
        set({
          token: data.access_token,
          user: { 
            id: data.user_id, 
            email: data.email, 
            name: "", 
            credits: data.credits,
            credits_used: data.credits_used ?? 0 // Default to 0
          },
        })
      },

      register: async (email, name, password) => {
        const { data } = await api.post("/auth/register", { email, name, password })
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
        set({
          token: data.access_token,
          user: { 
            id: data.user_id, 
            email: data.email, 
            name, 
            credits: data.credits,
            credits_used: data.credits_used ?? 0
          },
        })
      },

      logout: () => {
        delete api.defaults.headers.common["Authorization"]
        set({ user: null, token: null })
      },

      refreshMe: async () => {
        try {
          const { data } = await api.get("/auth/me")
          const currentUser = get().user
          
          // Check if credits actually changed (useful for Stripe polling)
          const creditsChanged = currentUser ? data.credits > currentUser.credits : false
          
          set((s) => ({ 
            user: s.user ? { ...s.user, ...data } : data 
          }))
          
          return creditsChanged // Now the dashboard can test this for "truthiness"
        } catch (error) {
          console.error("Failed to refresh user", error)
          return false
        }
      },
    }),
    {
      name: "swiftdocs-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`
        }
      },
    }
  )
)