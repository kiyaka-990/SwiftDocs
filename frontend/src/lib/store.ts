// src/lib/store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import api from "./api"

interface User {
  id: string
  email: string
  name: string
  credits: number
}

interface AuthStore {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
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
          user: { id: data.user_id, email: data.email, name: "", credits: data.credits },
        })
      },

      register: async (email, name, password) => {
        const { data } = await api.post("/auth/register", { email, name, password })
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
        set({
          token: data.access_token,
          user: { id: data.user_id, email: data.email, name, credits: data.credits },
        })
      },

      logout: () => {
        delete api.defaults.headers.common["Authorization"]
        set({ user: null, token: null })
      },

      refreshMe: async () => {
        const { data } = await api.get("/auth/me")
        set((s) => ({ user: { ...s.user!, ...data } }))
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
