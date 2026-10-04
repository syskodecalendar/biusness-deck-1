import React from 'react'
import { X, Search, Plus, Download, Pencil, Trash2, Eye, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { money } from '../lib/api'

export const Money = ({ value }) => <>{money(value)}</>

export function Status({ value }) {
  const v = String(value || '').replaceAll('_', ' ')
  return <span className={`status status-${String(value || '').toLowerCase()}`}>{v || '—'}</span>
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-head">
        <div><span className="eyebrow">BUSINESS DECK</span><h3>{title}</h3></div>
        <button type="button" className="icon-btn" onClick={onClose}><X /></button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm action', message, confirmText = 'Delete', danger = true, busy = false }) {
  if (!open) return null
  return <Modal open={open} onClose={onClose} title={title}>
    <div className="confirm-copy">{message}</div>
    <div className="form-actions">
      <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmText}</button>
    </div>
  </Modal>
}

export function PageHead({ eyebrow = 'OPERATIONS', title, desc, action, onAction, exportAction, children }) {
  return <div className="page-head">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{desc && <p>{desc}</p>}</div>
    <div className="head-actions">
      {children}
      {exportAction && <button className="btn secondary" onClick={exportAction}><Download size={16} />Export</button>}
      {action && <button className="btn primary" onClick={onAction}><Plus size={16} />{action}</button>}
    </div>
  </div>
}

export function SearchBox({ value, onChange, placeholder = 'Search everything on this page…' }) {
  return <label className="search"><Search size={17} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>
}

export function SortableTh({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort?.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return <th className={`sortable-th ${className}`}><button type="button" onClick={() => onSort(sortKey)}>{label}<Icon size={13}/></button></th>
}

export function SortSelect({ value, onChange, options = [] }) {
  return <select className="sort-select" value={value} onChange={e => onChange(e.target.value)}>
    {options.map(([v, t]) => <option value={v} key={v}>{t}</option>)}
  </select>
}

export function Empty({ text = 'No records found' }) { return <div className="empty">{text}</div> }
export function Field({ label, children, wide = false }) { return <label className={`field ${wide ? 'span-2' : ''}`}><span>{label}</span>{children}</label> }

export function RowActions({ onView, onEdit, onDelete, onRestore, deleteTitle = 'Delete' }) {
  return <div className="row-actions">
    {onView && <button type="button" className="icon-action" title="View" onClick={e => { e.stopPropagation(); onView() }}><Eye size={15} /></button>}
    {onEdit && <button type="button" className="icon-action" title="Edit" onClick={e => { e.stopPropagation(); onEdit() }}><Pencil size={15} /></button>}
    {onRestore && <button type="button" className="icon-action restore" title="Restore" onClick={e => { e.stopPropagation(); onRestore() }}><RotateCcw size={15} /></button>}
    {onDelete && <button type="button" className="icon-action danger" title={deleteTitle} onClick={e => { e.stopPropagation(); onDelete() }}><Trash2 size={15} /></button>}
  </div>
}

export function SubmitButton({ busy, children, busyText = 'Saving…', className = 'btn primary' }) {
  return <button className={className} disabled={busy}>{busy ? busyText : children}</button>
}

export function Notice({ type = 'error', children }) {
  if (!children) return null
  return <div className={`alert ${type}`}>{children}</div>
}
