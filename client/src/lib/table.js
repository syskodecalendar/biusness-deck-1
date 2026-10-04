import { useMemo, useState } from 'react'

function primitiveText(value, seen = new WeakSet()) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'object') return ''
  if (seen.has(value)) return ''
  seen.add(value)
  if (Array.isArray(value)) return value.map(v => primitiveText(v, seen)).join(' ')
  return Object.values(value).map(v => primitiveText(v, seen)).join(' ')
}

export function matchesSearch(row, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return primitiveText(row).toLowerCase().includes(q)
}

export function getPath(row, path) {
  return String(path || '').split('.').reduce((v, k) => v == null ? undefined : v[k], row)
}

export function compareValues(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const an = Number(a), bn = Number(b)
  if (String(a).trim() !== '' && String(b).trim() !== '' && Number.isFinite(an) && Number.isFinite(bn)) return an - bn
  const ad = Date.parse(a), bd = Date.parse(b)
  if (/^\d{4}-\d{2}-\d{2}/.test(String(a)) && /^\d{4}-\d{2}-\d{2}/.test(String(b)) && !Number.isNaN(ad) && !Number.isNaN(bd)) return ad - bd
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRows(rows, sort) {
  if (!sort?.key) return rows
  const dir = sort.direction === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => compareValues(getPath(a, sort.key), getPath(b, sort.key)) * dir)
}

export function useTableRows(rows, initialSort = null) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(initialSort)
  const filtered = useMemo(() => sortRows((rows || []).filter(row => matchesSearch(row, query)), sort), [rows, query, sort])
  const toggleSort = key => setSort(current => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  return { query, setQuery, sort, setSort, toggleSort, rows: filtered }
}
