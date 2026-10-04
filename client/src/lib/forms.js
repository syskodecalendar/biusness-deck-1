import { useRef, useState } from 'react'

export function useSubmitGuard() {
  const lock = useRef(false)
  const [saving, setSaving] = useState(false)
  async function run(fn) {
    if (lock.current) return false
    lock.current = true
    setSaving(true)
    try { await fn(); return true }
    finally { lock.current = false; setSaving(false) }
  }
  return { saving, run }
}
