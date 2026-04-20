import { config, requireInternalDashboardCreds } from './config.js'

let cachedSessionCookie = null
let cachedSessionAt = 0

const PAYBOX_MOVE_COLUMNS = [
  { data: 'created', name: 'created', db: 'PayboxesMoves.created', type: 'datetime' },
  { data: 'type', name: 'type', db: 'PayboxesMoves.type', type: 'multi_options' },
  { data: 'payment_method.name', name: 'payment_method.name', db: 'PaymentMethods.name', type: 'ajax_multi_options', foreign_key: 'PayboxesMoves.payment_method_id' },
  { data: 'import', name: 'import', db: 'PayboxesMoves.import', type: 'decimal' },
]

export async function getInternalDashboardSessionCookie() {
  requireInternalDashboardCreds()

  if (cachedSessionCookie && Date.now() - cachedSessionAt < 20 * 60 * 1000) {
    return cachedSessionCookie
  }

  const loginBody = new URLSearchParams({
    username: config.internalDashboard.username,
    password: config.internalDashboard.password,
  })

  const response = await fetch(
    `${config.internalDashboard.baseUrl}/users/login?redirect=%2FPayboxesMoves%2Findex`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginBody,
      redirect: 'manual',
    }
  )

  const cookieHeader = response.headers.get('set-cookie')
  if (!cookieHeader) {
    throw new Error('No se pudo obtener la sesion del tablero interno.')
  }

  const sessionCookie = cookieHeader
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .find((part) => part.startsWith('PHPSESSID='))

  if (!sessionCookie) {
    throw new Error('No se encontro el cookie de sesion del tablero interno.')
  }

  const html = await response.text()
  if (html.includes('Usuario o contraseña inválido')) {
    throw new Error('Credenciales invalidas para el tablero interno.')
  }

  cachedSessionCookie = sessionCookie
  cachedSessionAt = Date.now()
  return sessionCookie
}

export async function fetchPayboxesMovesPage({ year, month, start = 0, length = 500 }) {
  const cookie = await getInternalDashboardSessionCookie()
  const monthFilter = `${year}-${String(month).padStart(2, '0')}%`
  const body = buildPayboxesMovesRequestBody({ year, month, start, length, monthFilter })

  const response = await fetch(`${config.internalDashboard.baseUrl}/PayboxesMoves/find.json`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Error consultando movimientos de caja internos: ${response.status}`)
  }

  const json = await response.json()
  if (!json?.response) {
    throw new Error('Respuesta invalida al consultar movimientos de caja internos.')
  }

  return json.response
}

export async function fetchAllPayboxesMovesForMonth(year, month) {
  const firstPage = await fetchPayboxesMovesPage({ year, month, start: 0, length: 500 })
  const total = Number(firstPage.recordsFiltered || firstPage.recordsTotal || 0)
  let rows = [...(firstPage.data || [])]

  for (let start = rows.length; start < total; start += 500) {
    const nextPage = await fetchPayboxesMovesPage({ year, month, start, length: 500 })
    rows = rows.concat(nextPage.data || [])
  }

  return rows
}

function buildPayboxesMovesRequestBody({ start, length, monthFilter }) {
  const params = new URLSearchParams()
  params.set('draw', '1')
  params.set('start', String(start))
  params.set('length', String(length))
  params.set('search[value]', '')
  params.set('search[regex]', 'false')
  params.set('order[0][column]', '0')
  params.set('order[0][dir]', 'desc')
  params.set('get_total', '0')
  params.set('today', '0')
  params.set('paybox_id', '0')

  PAYBOX_MOVE_COLUMNS.forEach((column, index) => {
    params.set(`columns[${index}][data]`, column.data)
    params.set(`columns[${index}][name]`, column.name)
    params.set(`columns[${index}][searchable]`, 'true')
    params.set(`columns[${index}][orderable]`, 'true')
    params.set(`columns[${index}][search][value]`, '')
    params.set(`columns[${index}][search][regex]`, 'false')

    params.set(`columns_meta[${index}][db]`, column.db)
    params.set(`columns_meta[${index}][type]`, column.type)
    params.set(`columns_meta[${index}][integer]`, 'false')
    if (column.foreign_key) {
      params.set(`columns_meta[${index}][foreign_key]`, column.foreign_key)
    }
  })

  params.set('where[0][PayboxesMoves.deleted]', '0')
  params.set('where[1][PayboxesMoves.created LIKE]', monthFilter)

  return params
}
