import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { getCobranzasLocalCommercialAnalysis, getCobranzasMonthly, getCobranzasPaymentMethods, getCobranzasSummary, getComercialMonthly, getComercialPlanEvolution, getComercialSummary, getComercialTicketRows, getDirectorioMonthly, getDirectorioSummary, getLiveMeta, getPlantaExteriorBreaches, getPlantaExteriorMonthly, getPlantaExteriorSummary, getSoporteBreaches, getSoporteIncidents, getSoporteMonthly, getSoporteRecurrence, getSoporteSummary } from './live-metrics.js'
import { saveSyncSnapshot } from './persistence.js'

const app = express()
const port = config.port
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webDistDir = path.resolve(__dirname, '../../web/dist')

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'vai-bi-api',
    now: new Date().toISOString(),
  })
})

app.get('/api/directorio/summary', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getDirectorioSummary(year, month)
    res.json({
      filters: defaultFilters(year, month),
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/directorio/monthly', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getDirectorioMonthly(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/comercial/summary', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getComercialSummary(year, month)
    res.json({
      filters: defaultFilters(year, month),
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/comercial/monthly', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getComercialMonthly(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/comercial/tickets', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getComercialTicketRows(year, month)
    res.json({
      filters: { year, month },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/comercial/plans', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getComercialPlanEvolution(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/cobranzas/summary', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getCobranzasSummary(year, month)
    res.json({
      filters: defaultFilters(year, month),
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/cobranzas/monthly', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getCobranzasMonthly(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/cobranzas/payment-methods', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const mode = String(req.query.mode || 'amount')
    const data = await getCobranzasPaymentMethods(year, month, mode)
    res.json({
      filters: { year, month, mode },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/cobranzas/local-commercial-analysis', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const mode = String(req.query.mode || 'amount')
    const data = await getCobranzasLocalCommercialAnalysis(year, month, mode)
    res.json({
      filters: { year, month, mode },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/soporte/summary', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getSoporteSummary(year, month)
    res.json({
      filters: defaultFilters(year, month),
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/soporte/monthly', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getSoporteMonthly(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/soporte/incidents', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const from = req.query.from ? String(req.query.from) : null
    const until = req.query.until ? String(req.query.until) : null
    const data = await getSoporteIncidents(year, month, from, until)
    res.json({
      filters: { year, month, from, until },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/soporte/breaches', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const from = req.query.from ? String(req.query.from) : null
    const until = req.query.until ? String(req.query.until) : null
    const data = await getSoporteBreaches(year, month, from, until)
    res.json({
      filters: { year, month, from, until },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/soporte/recurrence', async (req, res) => {
  try {
    const from = String(req.query.from)
    const until = String(req.query.until)
    const data = await getSoporteRecurrence(from, until)
    res.json({
      filters: { from, until },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/planta-exterior/summary', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getPlantaExteriorSummary(year, month)
    res.json({
      filters: defaultFilters(year, month),
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/planta-exterior/monthly', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const data = await getPlantaExteriorMonthly(year)
    res.json({
      filters: { year },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/planta-exterior/breaches', async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear())
    const month = Number(req.query.month || new Date().getMonth() + 1)
    const data = await getPlantaExteriorBreaches(year, month)
    res.json({
      filters: { year, month },
      data,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/meta', async (_req, res) => {
  try {
    const data = await getLiveMeta()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sync/directorio', async (_req, res) => {
  try {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const summary = await getDirectorioSummary(currentYear, currentMonth)
    const monthly = await getDirectorioMonthly(currentYear)
    const persisted = await saveSyncSnapshot('directorio', { summary, monthly })
    res.json({
      ok: true,
      persisted,
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(webDistDir))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }

    res.sendFile(path.join(webDistDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`VAI BI API running on http://localhost:${port}`)
})

function defaultFilters(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
  return {
    year,
    month,
    zone: 'Todas',
    technology: 'Todas',
    plan: 'Todos',
  }
}
