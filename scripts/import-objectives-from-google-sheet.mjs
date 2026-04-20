import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { Pool } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const schemaPath = path.join(repoRoot, 'db', 'schema.sql')
const workbookUrl = process.env.OBJECTIVES_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1a8Jf0UTcM1jJ6mgKNXLw0evYpcvbJKOMsy6O2E4__iM/export?format=xlsx'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no configurada.')
  process.exit(1)
}

const tmpDir = path.join(os.tmpdir(), `vai-bi-objectives-${Date.now()}`)
const xlsxPath = path.join(tmpDir, 'objectives.xlsx')
const zipPath = path.join(tmpDir, 'objectives.zip')
const unzipDir = path.join(tmpDir, 'unzipped')

await fs.mkdir(tmpDir, { recursive: true })

try {
  await downloadWorkbook(workbookUrl, xlsxPath)
  await fs.copyFile(xlsxPath, zipPath)
  await unzipWorkbook(zipPath, unzipDir)

  const workbookXml = await fs.readFile(path.join(unzipDir, 'xl', 'workbook.xml'), 'utf8')
  const relsXml = await fs.readFile(path.join(unzipDir, 'xl', '_rels', 'workbook.xml.rels'), 'utf8')
  const sharedStringsXml = await fs.readFile(path.join(unzipDir, 'xl', 'sharedStrings.xml'), 'utf8')

  const sharedStrings = parseSharedStrings(sharedStringsXml)
  const sheetMap = parseWorkbookSheets(workbookXml, relsXml)
  const allSheets = {}

  for (const sheet of sheetMap) {
    const worksheetXml = await fs.readFile(path.join(unzipDir, 'xl', sheet.target), 'utf8')
    allSheets[sheet.name] = parseWorksheetRows(worksheetXml, sharedStrings)
  }

  const normalized = normalizeWorkbook(allSheets)
  await persistWorkbook(normalized, allSheets)

  console.log(`Importacion completa. Sheets: ${Object.keys(allSheets).length}. Objetivos mensuales: ${normalized.monthlyGoals.length}.`)
} finally {
  await fs.rm(tmpDir, { recursive: true, force: true })
}

async function downloadWorkbook(url, destination) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo descargar el workbook: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await fs.writeFile(destination, Buffer.from(arrayBuffer))
}

async function unzipWorkbook(zipFile, destination) {
  await runCommand('powershell', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
  ])
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} finalizo con codigo ${code}`))
    })
    child.on('error', reject)
  })
}

function parseSharedStrings(xml) {
  const items = []
  const siRegex = /<si>([\s\S]*?)<\/si>/g
  let match

  while ((match = siRegex.exec(xml))) {
    const textParts = [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(([, text]) => decodeXml(text))
    items.push(textParts.join(''))
  }

  return items
}

function parseWorkbookSheets(workbookXml, relsXml) {
  const relations = new Map()

  for (const match of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)) {
    relations.set(match[1], match[2])
  }

  const sheets = []
  for (const match of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*>/g)) {
    const [, rawName, relationId] = match
    const target = relations.get(relationId)
    if (!target) continue

    sheets.push({
      name: decodeXml(rawName),
      target,
    })
  }

  return sheets
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = []

  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1])
    const cells = {}

    for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const [, column, attributes, innerXml] = cellMatch
      const valueMatch = innerXml.match(/<v>([\s\S]*?)<\/v>/)
      if (!valueMatch) continue

      const rawValue = decodeXml(valueMatch[1])
      const typeMatch = attributes.match(/t="([^"]+)"/)
      const cellType = typeMatch?.[1] || 'n'
      const value = cellType === 's'
        ? sharedStrings[Number(rawValue)] ?? ''
        : rawValue

      cells[column] = normalizeCellValue(value)
    }

    if (Object.keys(cells).length) {
      rows.push({ rowNumber, cells })
    }
  }

  return rows
}

function normalizeCellValue(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (trimmed === '') return ''
  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && /^-?\d+(?:\.\d+)?(?:E-?\d+)?$/i.test(trimmed)) {
    return numeric
  }
  return trimmed
}

function normalizeWorkbook(sheets) {
  const summarySheet = sheets['Resumen Ejecutivo 2026'] || []
  const forecastSheet = sheets['Forecast 26  Tablero'] || []

  const summaryMetrics = summarySheet
    .filter((row) => row.cells.A && row.cells.B !== undefined)
    .map((row) => ({
      metricKey: slugifyMetric(row.cells.A),
      metricLabel: String(row.cells.A),
      metricValueNumeric: typeof row.cells.B === 'number' ? row.cells.B : null,
      metricValueText: typeof row.cells.B === 'number' ? null : String(row.cells.B),
      sourceSheet: 'Resumen Ejecutivo 2026',
      sourceRow: row.rowNumber,
    }))

  const monthlyGoals = forecastSheet
    .filter((row) => typeof row.cells.A === 'string' && monthMap[row.cells.A])
    .map((row) => ({
      anio_mes: `2026-${String(monthMap[row.cells.A]).padStart(2, '0')}`,
      proceso: 'general',
      plan_ventas: numericOrNull(row.cells.B),
      plan_instalaciones: numericOrNull(row.cells.D),
      plan_bajas: numericOrNull(row.cells.F),
      plan_instalaciones_rechazadas: numericOrNull(row.cells.H),
      plan_facturacion: numericOrNull(row.cells.K),
      plan_conexiones_finales: numericOrNull(row.cells.N),
      plan_facturacion_acumulada: numericOrNull(row.cells.P),
      plan_arpu: numericOrNull(row.cells.M),
      plan_upselling: null,
      source_sheet: 'Forecast 26  Tablero',
      source_row: row.rowNumber,
    }))

  return { summaryMetrics, monthlyGoals }
}

async function persistWorkbook(normalized, allSheets) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const schemaSql = await fs.readFile(schemaPath, 'utf8')

  try {
    await pool.query(schemaSql)
    const client = await pool.connect()

    try {
      await client.query('begin')

      const importResult = await client.query(
        `insert into objective_import_runs(source_url, workbook_name, raw_payload)
         values ($1, $2, $3::jsonb)
         returning id`,
        [workbookUrl, 'Objetivos VAI', JSON.stringify({ sheetNames: Object.keys(allSheets) })],
      )

      const importId = importResult.rows[0].id

      for (const [sheetName, rows] of Object.entries(allSheets)) {
        for (const row of rows) {
          await client.query(
            `insert into objective_sheet_rows(import_id, sheet_name, row_number, row_data)
             values ($1, $2, $3, $4::jsonb)`,
            [importId, sheetName, row.rowNumber, JSON.stringify(row.cells)],
          )
        }
      }

      for (const metric of normalized.summaryMetrics) {
        await client.query(
          `insert into objective_summary_metrics(
             import_id, metric_key, metric_label, metric_value_numeric, metric_value_text, source_sheet, source_row
           ) values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            importId,
            metric.metricKey,
            metric.metricLabel,
            metric.metricValueNumeric,
            metric.metricValueText,
            metric.sourceSheet,
            metric.sourceRow,
          ],
        )
      }

      for (const goal of normalized.monthlyGoals) {
        await client.query(
          `insert into fact_objetivos(
             anio_mes,
             proceso,
             plan_ventas,
             plan_instalaciones,
             plan_bajas,
             plan_instalaciones_rechazadas,
             plan_facturacion,
             plan_conexiones_finales,
             plan_facturacion_acumulada,
             plan_arpu,
             plan_upselling,
             source_sheet,
             source_row
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           on conflict (anio_mes, proceso) do update set
             plan_ventas = excluded.plan_ventas,
             plan_instalaciones = excluded.plan_instalaciones,
             plan_bajas = excluded.plan_bajas,
             plan_instalaciones_rechazadas = excluded.plan_instalaciones_rechazadas,
             plan_facturacion = excluded.plan_facturacion,
             plan_conexiones_finales = excluded.plan_conexiones_finales,
             plan_facturacion_acumulada = excluded.plan_facturacion_acumulada,
             plan_arpu = excluded.plan_arpu,
             plan_upselling = excluded.plan_upselling,
             source_sheet = excluded.source_sheet,
             source_row = excluded.source_row,
             imported_at = now()`,
          [
            goal.anio_mes,
            goal.proceso,
            goal.plan_ventas,
            goal.plan_instalaciones,
            goal.plan_bajas,
            goal.plan_instalaciones_rechazadas,
            goal.plan_facturacion,
            goal.plan_conexiones_finales,
            goal.plan_facturacion_acumulada,
            goal.plan_arpu,
            goal.plan_upselling,
            goal.source_sheet,
            goal.source_row,
          ],
        )
      }

      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}

function slugifyMetric(label) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function numericOrNull(value) {
  return typeof value === 'number' ? value : null
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const monthMap = {
  Enero: 1,
  Febrero: 2,
  Marzo: 3,
  Abril: 4,
  Mayo: 5,
  Junio: 6,
  Julio: 7,
  Agosto: 8,
  Septiembre: 9,
  Octubre: 10,
  Noviembre: 11,
  Diciembre: 12,
}
