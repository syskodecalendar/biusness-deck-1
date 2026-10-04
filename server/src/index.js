import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import dashboard from './routes/dashboard.js'
import crud from './routes/crud.js'
import projectRoutes from './routes/projects.js'
import docs from './routes/documents.js'
import reports from './routes/reports.js'
import zoho from './routes/zoho.js'
import zohoPublic from './routes/zohoPublic.js'
import audit from './routes/audit.js'
import users from './routes/users.js'
import access from './routes/access.js'

const app = express()
app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: config.clientUrl, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(rateLimit({ windowMs: 60_000, limit: 300 }))
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'syskode-business-deck', version: '2.2.0' }))
app.use('/api/zoho', zohoPublic)
app.use('/api', requireAuth)
app.use('/api/users', users)
app.use('/api/access', access)
app.use('/api/dashboard', dashboard)
app.use('/api', crud)
app.use('/api/projects', projectRoutes)
app.use('/api/documents', docs)
app.use('/api/reports', reports)
app.use('/api/zoho', zoho)
app.use('/api/audit', audit)
app.use(errorHandler)
app.listen(config.port, () => console.log(`Business Deck API on http://localhost:${config.port}`))
