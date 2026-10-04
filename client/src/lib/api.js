import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
})

api.interceptors.request.use(async (request) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const token = data.session?.access_token
  if (token) {
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${token}`
  }

  return request
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Retry a protected API request once with a freshly renewed Supabase session.
    if (error.response?.status === 401 && original && !original._authRetry) {
      original._authRetry = true
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      const token = data.session?.access_token

      if (!refreshError && token) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }

    return Promise.reject(error)
  }
)

export const money = (value) => new Intl.NumberFormat('en-BH', {
  style: 'currency',
  currency: 'BHD',
  minimumFractionDigits: 3
}).format(Number(value || 0))

export async function fetchAll(path, params = {}, pageSize = 200) {
  const rows = []
  let page = 1

  while (true) {
    const response = await api.get(path, { params: { ...params, page, limit: pageSize } })
    const batch = response.data?.data || []
    const count = Number(response.data?.count ?? 0)
    rows.push(...batch)

    if (batch.length < pageSize || (count > 0 && rows.length >= count)) break
    page += 1
  }

  return rows
}
