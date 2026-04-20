import { createReadStream, existsSync } from 'node:fs'
import { stat, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = normalize(join(dirname(__filename), '..'))
const distDir = join(repoRoot, 'apps', 'web', 'dist')
const host = process.env.WEB_HOST || '127.0.0.1'
const port = Number(process.env.WEB_PORT || 4185)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

if (!existsSync(distDir)) {
  console.error(`Web dist not found at ${distDir}. Run the frontend build first.`)
  process.exit(1)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`)
    const pathname = decodeURIComponent(url.pathname)
    const safePath = pathname === '/' ? '/index.html' : pathname
    const requestedPath = normalize(join(distDir, safePath))
    const withinDist = requestedPath.startsWith(distDir)

    if (!withinDist) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Forbidden')
      return
    }

    const filePath = await resolvePath(requestedPath)
    const extension = extname(filePath).toLowerCase()
    const contentType = mimeTypes[extension] || 'application/octet-stream'

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=300',
    })

    createReadStream(filePath).pipe(res)
  } catch (_error) {
    try {
      const fallback = await readFile(join(distDir, 'index.html'))
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      })
      res.end(fallback)
    } catch (fallbackError) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`Unable to serve web app: ${fallbackError.message}`)
    }
  }
})

server.listen(port, host, () => {
  console.log(`VAI BI web running on http://${host}:${port}`)
})

async function resolvePath(requestedPath) {
  const resolvedStat = await stat(requestedPath).catch(() => null)
  if (resolvedStat?.isFile()) {
    return requestedPath
  }

  if (resolvedStat?.isDirectory()) {
    const indexPath = join(requestedPath, 'index.html')
    const indexStat = await stat(indexPath).catch(() => null)
    if (indexStat?.isFile()) {
      return indexPath
    }
  }

  const htmlCandidate = `${requestedPath}.html`
  const htmlStat = await stat(htmlCandidate).catch(() => null)
  if (htmlStat?.isFile()) {
    return htmlCandidate
  }

  throw new Error('Not found')
}
