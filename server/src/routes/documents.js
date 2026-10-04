import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { admin } from '../lib.js'
import { config } from '../config.js'
import { audit } from '../services/audit.js'
import { can, filterRow, projectAllowed, recordAllowed } from '../services/access.js'

const r = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 10 } })

function guard(req, res, action) {
  if (can(req, 'documents', action)) return true
  res.status(403).json({ error: `Your role does not allow document ${action}.` })
  return false
}

r.post('/upload', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!guard(req, res, 'create')) return
    if (!req.files?.length) return res.status(400).json({ error: 'No files' })
    if (req.body.project_id && !(await projectAllowed(req, req.body.project_id))) return res.status(403).json({ error: 'Project is outside your assigned data scope.' })
    if ((req.profile?.data_scope || 'all') === 'vendor' && req.body.vendor_id !== req.profile?.linked_vendor_id) {
      return res.status(403).json({ error: 'Vendor-scoped users can only upload documents against their linked vendor.' })
    }
    const created = []
    for (const f of req.files) {
      const path = `${req.body.project_id || 'general'}/${Date.now()}-${crypto.randomUUID()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await admin.storage.from(config.bucket).upload(path, f.buffer, { contentType: f.mimetype })
      if (upErr) throw upErr
      const { data, error } = await admin.from('documents').insert({
        project_id: req.body.project_id || null,
        vendor_id: req.body.vendor_id || null,
        project_vendor_id: req.body.project_vendor_id || null,
        category: req.body.category || 'other',
        file_name: f.originalname,
        storage_path: path,
        mime_type: f.mimetype,
        file_size: f.size,
        uploaded_by: req.profile.id
      }).select().single()
      if (error) throw error
      created.push(filterRow(req, 'documents', data))
      await audit(req, 'upload', 'documents', data.id, null, data)
    }
    res.status(201).json(created)
  } catch (e) { next(e) }
})

r.put('/:id', async (req, res, next) => {
  try {
    if (!guard(req, res, 'edit')) return
    const { data: before, error: readError } = await admin.from('documents').select('*').eq('id', req.params.id).single()
    if (readError) throw readError
    if (!(await recordAllowed(req, 'documents', before))) return res.status(404).json({ error: 'Document not found' })
    const payload = {}
    if (req.body.category !== undefined) payload.category = req.body.category
    if (req.body.file_name !== undefined) payload.file_name = req.body.file_name
    const { data, error } = await admin.from('documents').update(payload).eq('id', req.params.id).select().single()
    if (error) throw error
    await audit(req, 'update', 'documents', data.id, before, data)
    res.json(filterRow(req, 'documents', data))
  } catch (e) { next(e) }
})

r.get('/:id/download', async (req, res, next) => {
  try {
    if (!guard(req, res, 'download')) return
    const { data: d, error } = await admin.from('documents').select('*').eq('id', req.params.id).single()
    if (error) throw error
    if (!(await recordAllowed(req, 'documents', d))) return res.status(404).json({ error: 'Document not found' })
    const { data, error: signedError } = await admin.storage.from(config.bucket).createSignedUrl(d.storage_path, 60)
    if (signedError) throw signedError
    res.json({ url: data.signedUrl })
  } catch (e) { next(e) }
})

r.delete('/:id', async (req, res, next) => {
  try {
    if (!guard(req, res, 'delete')) return
    const { data: before, error: readError } = await admin.from('documents').select('*').eq('id', req.params.id).single()
    if (readError) throw readError
    if (!(await recordAllowed(req, 'documents', before))) return res.status(404).json({ error: 'Document not found' })
    const { error: storageError } = await admin.storage.from(config.bucket).remove([before.storage_path])
    if (storageError) throw storageError
    const { error } = await admin.from('documents').delete().eq('id', req.params.id)
    if (error) throw error
    await audit(req, 'delete', 'documents', before.id, before, null)
    res.status(204).end()
  } catch (e) { next(e) }
})

export default r
