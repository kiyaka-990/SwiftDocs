// src/lib/api.ts
import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://swiftdocs-production.up.railway.app/api",
  timeout: 30_000,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("swiftdocs-auth")
        window.location.href = "/login"
      }
    }
    return Promise.reject(err)
  }
)

export default api
