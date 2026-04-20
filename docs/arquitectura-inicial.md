# Base tecnica inicial

## Modulos incluidos

- Directorio
- Comercial
- Cobranzas
- Soporte

## Backend

- `GET /api/health`
- `GET /api/meta`
- `GET /api/directorio/summary`
- `GET /api/directorio/monthly?year=2026`
- `GET /api/comercial/summary`
- `GET /api/comercial/monthly?year=2026`
- `GET /api/cobranzas/summary`
- `GET /api/cobranzas/monthly?year=2026`
- `GET /api/soporte/summary`
- `GET /api/soporte/monthly?year=2026`
- `POST /api/sync/directorio`

## Regla live validada

Conexiones activas:

- `enabled = 1`
- `deleted = 0`
- `archived = 0`

Valor validado el `30/03/2026`:

- `1.815`

## Fuente live actual

El backend ya consulta en vivo:

- conexiones activas
- clientes totales
- ventas del mes
- facturacion del mes
- cobranza del mes
- cartera pendiente de cobranzas
- compromisos de pago
- tickets de soporte y backlog operativo

Quedan todavia provisionales o parciales:

- leads del mes
- conversion lead a venta
- mix fibra / wireless
- bajas del mes
- upselling del mes
- instalaciones

## Criterios actuales por proceso

### Directorio

- `conexiones activas`: `enabled = 1`, `deleted = 0`, `archived = 0`
- `facturacion del mes`: comprobantes operativos del mes, excluyendo recibos y descontando notas de credito
- `cobranza del mes`: recibos del mes (`tipo XRX`)

### Cobranzas

- `saldo pendiente actual`: suma de cargos pendientes
- `compromisos vigentes`: `payment-commitments` con `status = 0`
- `compromisos incumplidos`: `payment-commitments` con `status = 2`
- `cobrado sobre emitido`: `cobranza del mes / facturacion operativa del mes`

### Soporte

- el proceso se construye sobre tickets tecnicos y reclamos
- se excluyen instalaciones, retiros y cambios comerciales
- `backlog abierto`: tickets de soporte con estados distintos de resuelto
- `tasa de cierre`: tickets resueltos en el mes sobre tickets abiertos en el mes
- `abiertos sin asignar`: tickets de soporte abiertos con `user_assigned_id` vacio

### Comercial: upselling

- mientras no exista historial expuesto de cambio de plan, `upselling` se reconstruye con tickets comerciales
- categorias usadas:
  - `21`: upselling / promos
  - `18`: cambio de abono
  - `14`: migracion `Wireless a Fibra`
- el tablero comercial muestra cantidad por estado para cada categoria
- `gestiones cerradas del mes` = tickets de esas categorias con `status = 2`
- esta metrica mide gestion comercial cerrada, no todavia impacto economico neto por cambio de plan

## Siguiente iteracion

1. Montar PostgreSQL y definir `DATABASE_URL`.
2. Persistir marts reales, no solo snapshots.
3. Integrar embudo interno para `leads` y `conversion`.
4. Integrar bajas reales y upselling reales.
5. Construir `Instalaciones` y `Caja` con el mismo patron live.
