import { create } from "zustand"
import { persist } from "zustand/middleware"
import api from "./api"

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
  register: (email: string, name: string, password: string) => Promise<void> // RESTORED
  logout: () => void
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
        
        // Use the nested 'user' object from our updated TokenResponse
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
        set({
          token: data.access_token,
          user: data.user, 
        })
      },

      register: async (email, name, password) => {
        const { data } = await api.post("/auth/register", { email, name, password })
        
        // Use the nested 'user' object from our updated TokenResponse
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
        set({
          token: data.access_token,
          user: data.user,
        })
      },

      logout: () => {
        delete api.defaults.headers.common["Authorization"]
        set({ user: null, token: null })
      },

      refreshMe: async () => {
        try {
          const prevCredits = get().user?.credits ?? 0
          const { data } = await api.get("/auth/me")
          
          set({ user: data })
          
          // Boolean check for Stripe polling in Dashboard
          return data.credits > prevCredits
        } catch (error) {
          console.error("Refresh failed", error)
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