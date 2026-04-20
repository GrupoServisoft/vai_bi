export const config = {
  port: Number(process.env.PORT || 4100),
  ispbrain: {
    baseUrl: process.env.ISPBRAIN_BASE_URL || 'https://vaiinternet.ispbrain.io:4443/api/v2',
    username: process.env.ISPBRAIN_USERNAME || '',
    password: process.env.ISPBRAIN_PASSWORD || '',
  },
  internalDashboard: {
    baseUrl: process.env.INTERNAL_DASHBOARD_BASE_URL || 'https://vaiinternet.ispbrain.io',
    username: process.env.INTERNAL_DASHBOARD_USERNAME || '',
    password: process.env.INTERNAL_DASHBOARD_PASSWORD || '',
  },
  databaseUrl: process.env.DATABASE_URL || '',
}

export function requireIspbrainCreds() {
  if (!config.ispbrain.username || !config.ispbrain.password) {
    throw new Error('Faltan credenciales ISPbrain. Defini ISPBRAIN_USERNAME e ISPBRAIN_PASSWORD en apps/api/.env.')
  }
}

export function requireInternalDashboardCreds() {
  if (!config.internalDashboard.username || !config.internalDashboard.password) {
    throw new Error('Faltan credenciales del tablero interno. Defini INTERNAL_DASHBOARD_USERNAME e INTERNAL_DASHBOARD_PASSWORD en apps/api/.env.')
  }
}
