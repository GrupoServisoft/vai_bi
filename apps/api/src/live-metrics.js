import { goals } from './goals-data.js'
import { ispbrainGet } from './ispbrain-client.js'
import { fetchAllPayboxesMovesForMonth } from './internal-dashboard-client.js'

export async function getLiveMeta() {
  const active = await ispbrainGet('/connections/total', {
    'filter[enabled]': 1,
    'filter[deleted]': 0,
    'filter[archived]': 0,
  })

  return {
    source_priority: ['API ISPbrain', 'Reportes internos', 'Excel objetivos'],
    active_connections_rule: {
      enabled: 1,
      deleted: 0,
      archived: 0,
      validated_at: new Date().toISOString().slice(0, 10),
      current_value: active.data.amount,
    },
  }
}

export async function getDirectorioSummary(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const monthRange = getMonthRange(year, month)
  const [activeConnections, customers, salesMonth, billingMonth, collectionsMonth] = await Promise.all([
    ispbrainGet('/connections/total', {
      'filter[enabled]': 1,
      'filter[deleted]': 0,
      'filter[archived]': 0,
    }),
    ispbrainGet('/customers/total'),
    ispbrainGet('/connections', {
      'page[size]': 1,
      'page[number]': 1,
      'filter[created_from]': monthRange.from,
      'filter[created_until]': monthRange.until,
      'filter[enabled]': 1,
      'filter[deleted]': 0,
      'filter[archived]': 0,
    }),
    getMonthlyBilling(monthRange.from, monthRange.until),
    ispbrainGet('/comprobantes/receipts/total', {
      'filter[date_from]': monthRange.from,
      'filter[date_until]': monthRange.until,
    }),
  ])

  const currentActive = activeConnections.data.amount
  const billingValue = billingMonth.total

  return {
    kpis: [
      kpi('activeConnections', 'Conexiones activas', currentActive, goals.directorio.activeConnections, 'warn'),
      kpi('customers', 'Clientes totales', customers.data.amount, null, 'info'),
      kpi('salesMonth', 'Ventas del mes', salesMonth.meta.filtered_total, goals.comercial.salesMonth, 'warn'),
      kpi('billingMonth', 'Facturacion del mes', billingValue, goals.directorio.billingMonth, 'warn', 'currency'),
      kpi('collectionsMonth', 'Cobranza del mes', collectionsMonth.data.total, null, 'info', 'currency'),
      kpi('arpu', 'ARPU', Math.round(billingValue / Math.max(currentActive, 1)), goals.directorio.arpu, 'warn', 'currency'),
    ],
    insights: [
      `Conexiones activas live: ${currentActive} con regla enabled=1, deleted=0, archived=0.`,
      `Ventas del periodo live: ${salesMonth.meta.filtered_total} conexiones nuevas activadas en ${monthRange.labelLong}.`,
      'Facturacion del mes se calcula con comprobantes del mes, excluyendo recibos y descontando notas de credito.',
    ],
  }
}

export async function getDirectorioMonthly(year) {
  const activeHistory = await getHistoricalActiveConnectionsMap()
  const rows = await Promise.all(
    getYearMonths(year).map(async (monthRow) => {
        const goalRow = getGoalMonth(year, monthRow.month)
        const monthRange = getMonthRange(year, monthRow.month)
        const [sales, billing] = await Promise.all([
          ispbrainGet('/connections', {
            'page[size]': 1,
            'page[number]': 1,
            'filter[created_from]': monthRange.from,
            'filter[created_until]': monthRange.until,
            'filter[enabled]': 1,
            'filter[deleted]': 0,
            'filter[archived]': 0,
          }),
          getMonthlyBilling(monthRange.from, monthRange.until),
        ])

        const estimatedActive = activeHistory.get(`${year}-${String(monthRow.month).padStart(2, '0')}`) ?? null

        return {
          year,
          month: monthRow.month,
          label: monthRow.label,
          activeConnections: estimatedActive,
          activeConnectionsTarget: goalRow?.activeConnectionsTarget ?? null,
          sales: sales.meta.filtered_total,
          salesTarget: goalRow?.salesTarget ?? null,
          churn: year === 2026 && monthRow.month <= 3 ? interpolateChurn(monthRow.month) : null,
          churnTarget: goalRow?.churnTarget ?? null,
          billing: billing.total,
          billingTarget: goalRow?.billingTarget ?? null,
        }
      })
  )

  return rows
}

export async function getComercialSummary(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const monthRange = getMonthRange(year, month)
  const goalRow = getGoalMonth(year, month)
  const [salesMonth, activeConnections, commercialTickets, billingMonth] = await Promise.all([
    ispbrainGet('/connections', {
      'page[size]': 1,
      'page[number]': 1,
      'filter[created_from]': monthRange.from,
      'filter[created_until]': monthRange.until,
      'filter[enabled]': 1,
      'filter[deleted]': 0,
      'filter[archived]': 0,
    }),
    ispbrainGet('/connections/total', {
      'filter[enabled]': 1,
      'filter[deleted]': 0,
      'filter[archived]': 0,
    }),
    getCommercialTicketsByMonth(year, month),
    getMonthlyBilling(monthRange.from, monthRange.until),
  ])

  const upsellingClosed = commercialTickets.upselling.byStatus.resolved || 0
  const planChangeClosed = commercialTickets.planChange.byStatus.resolved || 0
  const migrationClosed = commercialTickets.migration.byStatus.resolved || 0
  const managedClosed = upsellingClosed + planChangeClosed + migrationClosed

  return {
    kpis: [
      { id: 'leadsMonth', label: 'Leads del mes', value: 96, status: 'info', target: year === 2026 ? goals.comercial.leadsMonth : null },
      kpi('leadConversion', 'Conversion lead a venta', 22.9, year === 2026 ? goals.comercial.leadConversion : null, 'warn', 'percent'),
      kpi('salesMonth', 'Ventas del mes', salesMonth.meta.filtered_total, goalRow?.salesTarget ?? null, 'warn'),
      kpi('dropsMonth', 'Bajas del mes', year === 2026 ? interpolateChurn(month) : 0, goalRow?.churnTarget ?? null, 'bad'),
      { id: 'upsellingMonth', label: 'Gestiones cerradas del mes', value: managedClosed, status: goalRow?.upsellingTarget ? (managedClosed >= goalRow.upsellingTarget ? 'good' : 'warn') : 'info', target: goalRow?.upsellingTarget ?? null },
      kpi('billingMonth', 'Facturacion del mes', billingMonth.total, goalRow?.billingTarget ?? null, 'warn', 'currency'),
      { id: 'activeConnections', label: 'Conexiones activas', value: activeConnections.data.amount, status: 'info' },
    ],
    insights: [
      `Ventas del periodo live: ${salesMonth.meta.filtered_total} conexiones activadas en ${monthRange.labelLong}.`,
      `Gestiones comerciales cerradas en ${monthRange.labelLong}: upselling ${upsellingClosed}, cambio de abono ${planChangeClosed}, migracion ${migrationClosed}.`,
      `Facturacion comercial del periodo: ${billingMonth.total.toLocaleString('es-AR')} ARS en ${monthRange.labelLong}.`,
      'Leads y conversion siguen siendo provisionales hasta completar la integracion del embudo interno.',
    ],
    ticketBreakdown: commercialTickets,
  }
}

export async function getComercialMonthly(year) {
  const activeHistory = await getHistoricalActiveConnectionsMap()
  const rows = await Promise.all(
    getYearMonths(year).map(async (monthRow) => {
        const goalRow = getGoalMonth(year, monthRow.month)
        const monthRange = getMonthRange(year, monthRow.month)
        const [sales, commercialTickets, billing] = await Promise.all([
          ispbrainGet('/connections', {
            'page[size]': 1,
            'page[number]': 1,
            'filter[created_from]': monthRange.from,
            'filter[created_until]': monthRange.until,
            'filter[enabled]': 1,
            'filter[deleted]': 0,
            'filter[archived]': 0,
          }),
          getCommercialTicketsByMonth(year, monthRow.month),
          getMonthlyBilling(monthRange.from, monthRange.until),
        ])

        const upsellingClosed = commercialTickets.upselling.byStatus.resolved || 0
        const planChangeClosed = commercialTickets.planChange.byStatus.resolved || 0
        const migrationClosed = commercialTickets.migration.byStatus.resolved || 0

        return {
          year,
          month: monthRow.month,
          label: monthRow.label,
          activeConnections: activeHistory.get(`${year}-${String(monthRow.month).padStart(2, '0')}`) ?? null,
          activeConnectionsTarget: goalRow?.activeConnectionsTarget ?? null,
          sales: sales.meta.filtered_total,
          salesTarget: goalRow?.salesTarget ?? null,
          drops: year === 2026 && monthRow.month <= 3 ? interpolateChurn(monthRow.month) : null,
          dropsTarget: goalRow?.churnTarget ?? null,
          upselling: upsellingClosed + planChangeClosed + migrationClosed,
          upsellingTarget: goalRow?.upsellingTarget ?? null,
          billing: billing.total,
          billingTarget: goalRow?.billingTarget ?? null,
          ticketCategories: commercialTickets,
        }
      })
  )

  return rows
}

export async function getComercialTicketRows(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const range = getMonthDateRange(year, month)
  const tickets = await getAllTickets({
    'filter[deleted]': 0,
    'filter[created]': `${year}-${String(month).padStart(2, '0')}`,
  })

  return tickets
    .filter((ticket) => {
      const createdAt = new Date(ticket.created)
      return createdAt >= range.from && createdAt <= range.until
    })
    .filter((ticket) => [21, 18, 14].includes(Number(ticket.ticket_category_id)))
    .map((ticket) => ({
      id: ticket.id,
      created: ticket.created,
      categoryId: Number(ticket.ticket_category_id),
      categoryLabel: commercialCategoryLabel(ticket.ticket_category_id),
      statusId: Number(ticket.ticket_status_id),
      statusLabel: commercialStatusLabel(ticket.ticket_status_id),
      title: String(ticket.title || '').trim(),
      customerId: ticket.customer_id,
      connectionId: ticket.connection_id,
      assignedUserId: ticket.user_assigned_id,
      spaces: ticket.spaces,
    }))
}

export async function getComercialPlanEvolution(year = getCurrentYearMonth().year) {
  const [currentActivePlans, monthlyChanges, plansCatalog, monthlyBilling] = await Promise.all([
    getCurrentActiveConnectionsByPlan(),
    getCommercialPlanMonthlyChanges(year),
    getPlansCatalog(),
    Promise.all(getYearMonths(year).map(async ({ month, label }) => {
      const monthRange = getMonthRange(year, month)
      const billing = await getMonthlyBilling(monthRange.from, monthRange.until)
      return {
        month,
        label,
        operationalBilling: billing.total,
        averageTicket: billing.operationalCount > 0 ? round(billing.total / billing.operationalCount) : 0,
        comprobantes: billing.operationalCount,
      }
    })),
  ])

  const priceByPlanId = new Map(plansCatalog.map((plan) => [Number(plan.id), Number(plan.price || 0)]))
  const nameBillByPlanId = new Map(plansCatalog.map((plan) => [Number(plan.id), plan.name_bill || plan.name]))

  const rows = [...monthlyChanges]
  let runningCounts = new Map(currentActivePlans)

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    const monthPlanMap = new Map()

    for (const [planId, count] of runningCounts.entries()) {
      if (count > 0) {
        monthPlanMap.set(planId, count)
      }
    }

    row.planCounts = monthPlanMap

    const previousCounts = new Map(monthPlanMap)
    for (const [planId, created] of row.createdByPlan.entries()) {
      previousCounts.set(planId, (previousCounts.get(planId) || 0) - created)
    }
    for (const [planId, removed] of row.removedByPlan.entries()) {
      previousCounts.set(planId, (previousCounts.get(planId) || 0) + removed)
    }

    runningCounts = new Map(
      Array.from(previousCounts.entries())
        .filter(([, count]) => count > 0)
    )
  }

  const seriesSource = rows.map((row) => {
    const planRows = Array.from(row.planCounts.entries()).map(([planId, count]) => {
      const amount = round(count * (priceByPlanId.get(planId) || 0))
      return {
        planId,
        planName: row.planLabels.get(planId) || nameBillByPlanId.get(planId) || `Plan ${planId}`,
        nameBill: nameBillByPlanId.get(planId) || row.planLabels.get(planId) || `Plan ${planId}`,
        connections: count,
        estimatedAmount: amount,
        price: priceByPlanId.get(planId) || 0,
      }
    }).sort((a, b) => b.estimatedAmount - a.estimatedAmount)

    return {
      month: row.month,
      label: row.label,
      operationalBilling: monthlyBilling.find((item) => item.month === row.month)?.operationalBilling || 0,
      averageTicket: monthlyBilling.find((item) => item.month === row.month)?.averageTicket || 0,
      comprobantes: monthlyBilling.find((item) => item.month === row.month)?.comprobantes || 0,
      plans: planRows,
    }
  })

  const ranking = new Map()
  for (const row of seriesSource) {
    for (const plan of row.plans) {
      const current = ranking.get(plan.planId) || {
        planId: plan.planId,
        planName: plan.planName,
        nameBill: plan.nameBill,
        totalConnections: 0,
        totalEstimatedAmount: 0,
        lastPrice: plan.price,
      }
      current.totalConnections += plan.connections
      current.totalEstimatedAmount = round(current.totalEstimatedAmount + plan.estimatedAmount)
      current.lastPrice = plan.price || current.lastPrice
      ranking.set(plan.planId, current)
    }
  }

  const rankedPlans = Array.from(ranking.values()).sort((a, b) => b.totalEstimatedAmount - a.totalEstimatedAmount)
  const topPlans = rankedPlans.slice(0, 5)
  const topPlanIds = new Set(topPlans.map((plan) => plan.planId))

  const monthly = seriesSource.map((row) => {
    const topRows = topPlans.map((plan) => {
      const current = row.plans.find((item) => item.planId === plan.planId)
      return {
        planId: plan.planId,
        planName: plan.planName,
        connections: current?.connections || 0,
        estimatedAmount: current?.estimatedAmount || 0,
        price: current?.price ?? plan.lastPrice,
      }
    })

    const otherPlans = row.plans.filter((plan) => !topPlanIds.has(plan.planId))
    const others = {
      planId: 'others',
      planName: 'Otros',
      connections: otherPlans.reduce((acc, plan) => acc + plan.connections, 0),
      estimatedAmount: round(otherPlans.reduce((acc, plan) => acc + plan.estimatedAmount, 0)),
      price: null,
    }

    return {
      month: row.month,
      label: row.label,
      averageTicket: row.averageTicket,
      operationalBilling: row.operationalBilling,
      comprobantes: row.comprobantes,
      plans: others.connections > 0 || others.estimatedAmount > 0 ? [...topRows, others] : topRows,
    }
  })

  return {
    topPlans: topPlans.map((plan) => ({
      planId: plan.planId,
      planName: plan.planName,
      totalConnections: plan.totalConnections,
      totalEstimatedAmount: plan.totalEstimatedAmount,
      averageEstimatedTicket: plan.totalConnections > 0 ? round(plan.totalEstimatedAmount / plan.totalConnections) : 0,
      lastPrice: plan.lastPrice,
    })),
    monthly,
  }
}

export async function getCobranzasSummary(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const monthRange = getMonthRange(year, month)
  const [pendingCharges, currentCommitments, failedCommitments, marchReceipts, marchBilling] = await Promise.all([
    getPendingCharges(),
    ispbrainGet('/payment-commitments', {
      'page[size]': 10,
      'page[number]': 1,
      'filter[status]': 0,
      'filter[deleted]': 0,
    }),
    ispbrainGet('/payment-commitments', {
      'page[size]': 10,
      'page[number]': 1,
      'filter[status]': 2,
      'filter[deleted]': 0,
    }),
    getReceiptsTotal(monthRange.from, monthRange.until),
    getMonthlyBilling(monthRange.from, monthRange.until),
  ])

  const pendingTotal = round(
    pendingCharges.rows.reduce((acc, item) => acc + Number(item.total || 0), 0)
  )
  const commitmentsOpenTotal = round(
    currentCommitments.data.reduce((acc, item) => acc + Number(item.saldo || 0), 0)
  )
  const collectionRate = round((marchReceipts.total / Math.max(marchBilling.total, 1)) * 100)

  return {
    kpis: [
      { id: 'pendingBalance', label: 'Saldo pendiente actual', value: pendingTotal, status: pendingTotal > 0 ? 'warn' : 'good', format: 'currency' },
      { id: 'pendingCharges', label: 'Cargos pendientes', value: pendingCharges.meta.filtered_total, status: 'info' },
      { id: 'openCommitments', label: 'Compromisos vigentes', value: currentCommitments.meta.filtered_total, status: 'info' },
      { id: 'openCommitmentsAmount', label: 'Saldo en compromisos', value: commitmentsOpenTotal, status: 'warn', format: 'currency' },
      { id: 'failedCommitments', label: 'Compromisos incumplidos', value: failedCommitments.meta.filtered_total, status: 'bad' },
      { id: 'collectionsMonth', label: 'Cobranza del mes', value: marchReceipts.total, status: collectionRate >= goals.cobranzas.collectionRate ? 'good' : 'warn', format: 'currency', target: marchBilling.total },
      { id: 'collectionRate', label: 'Cobrado sobre emitido', value: collectionRate, status: collectionRate >= goals.cobranzas.collectionRate ? 'good' : 'warn', format: 'percent', target: goals.cobranzas.collectionRate },
    ],
    insights: [
      `Saldo pendiente live actual: ${pendingTotal.toLocaleString('es-AR')} ARS sobre ${pendingCharges.meta.filtered_total} cargos abiertos.`,
      `Compromisos vigentes live: ${currentCommitments.meta.filtered_total}; incumplidos acumulados: ${failedCommitments.meta.filtered_total}.`,
      `La cobranza mensual ya sale live desde recibos (tipo XRX) y se compara contra la facturacion operativa de ${monthRange.labelLong}.`,
    ],
    pendingByPeriod: groupByPeriod(pendingCharges.rows),
  }
}

export async function getCobranzasMonthly(year) {
  const monthlyGoals = getYearMonths(year)
  const rows = await Promise.all(
    monthlyGoals.map(async (goalRow) => {
      const range = getMonthRange(year, goalRow.month)
      const [receipts, billing] = await Promise.all([
        getReceiptsTotal(range.from, range.until),
        getMonthlyBilling(range.from, range.until),
      ])

      return {
        year,
        month: goalRow.month,
        label: goalRow.label,
        collections: receipts.total,
        receiptsCount: receipts.amount,
        billing: billing.total,
        collectionRate: round((receipts.total / Math.max(billing.total, 1)) * 100),
      }
    })
  )

  return rows
}

export async function getCobranzasPaymentMethods(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month, mode = 'amount') {
  const normalizedMode = mode === 'count' ? 'count' : 'amount'
  const monthlyRows = await Promise.all(
    getYearMonths(year).map(async (monthRow) => {
      const paymentMethods = await getPaymentMethodBreakdownForMonth(year, monthRow.month)
      return {
        year,
        month: monthRow.month,
        label: monthRow.label,
        totalCount: paymentMethods.reduce((acc, item) => acc + item.count, 0),
        totalAmount: round(paymentMethods.reduce((acc, item) => acc + item.amount, 0)),
        methods: paymentMethods,
      }
    })
  )

  const selectedMonthRow = monthlyRows.find((row) => row.month === month) || monthlyRows[0] || null
  const allMethodNames = new Set()
  monthlyRows.forEach((row) => {
    row.methods.forEach((item) => allMethodNames.add(item.label))
  })

  const rankedMethods = Array.from(allMethodNames)
    .map((label) => ({
      label,
      value: monthlyRows.reduce((acc, row) => {
        const found = row.methods.find((item) => item.label === label)
        return acc + (normalizedMode === 'count' ? (found?.count || 0) : (found?.amount || 0))
      }, 0),
    }))
    .sort((a, b) => b.value - a.value)

  const topMethodNames = rankedMethods.slice(0, 5).map((item) => item.label)

  return {
    mode: normalizedMode,
    selectedMonth: selectedMonthRow
      ? {
          month: selectedMonthRow.month,
          label: selectedMonthRow.label,
          total: normalizedMode === 'count' ? selectedMonthRow.totalCount : selectedMonthRow.totalAmount,
          methods: selectedMonthRow.methods.map((item) => ({
            label: item.label,
            count: item.count,
            amount: item.amount,
            value: normalizedMode === 'count' ? item.count : item.amount,
          })),
        }
      : null,
    monthly: monthlyRows.map((row) => ({
      month: row.month,
      label: row.label,
      total: normalizedMode === 'count' ? row.totalCount : row.totalAmount,
      methods: row.methods
        .filter((item) => topMethodNames.includes(item.label))
        .map((item) => ({
          label: item.label,
          count: item.count,
          amount: item.amount,
          value: normalizedMode === 'count' ? item.count : item.amount,
        })),
    })),
    topMethods: rankedMethods.slice(0, 5),
  }
}

export async function getCobranzasLocalCommercialAnalysis(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month, mode = 'amount') {
  const normalizedMode = mode === 'count' ? 'count' : 'amount'
  const moves = await fetchAllPayboxesMovesForMonth(year, month)
  const localMoves = moves
    .filter((move) => COLLECTION_MOVE_TYPES.has(String(move.type || '').trim().toUpperCase()))
    .map((move) => mapLocalCommercialMove(move))
    .filter((move) => LOCAL_PAYMENT_METHODS.includes(move.method))

  const totalAmount = round(localMoves.reduce((acc, item) => acc + item.amount, 0))
  const totalCount = localMoves.length

  const weeklyMap = new Map()
  const mixMap = new Map()
  const detailMap = new Map()
  const heatmapMap = new Map()

  for (const week of WEEK_LABELS) {
    weeklyMap.set(week, createWeekAccumulator(week))
    heatmapMap.set(week, createHeatmapAccumulator(week))
  }

  for (const method of LOCAL_PAYMENT_METHODS) {
    mixMap.set(method, { label: method, amount: 0, count: 0 })
  }

  for (const move of localMoves) {
    const weekKey = weekLabel(move.weekOfMonth)
    const slotKey = move.timeSlot
    const currentWeek = weeklyMap.get(weekKey) || createWeekAccumulator(weekKey)
    currentWeek[methodField(move.method, normalizedMode)] = round(currentWeek[methodField(move.method, normalizedMode)] + measureValue(move, normalizedMode))
    currentWeek.total = round(currentWeek.total + measureValue(move, normalizedMode))
    weeklyMap.set(weekKey, currentWeek)

    const currentMix = mixMap.get(move.method) || { label: move.method, amount: 0, count: 0 }
    currentMix.amount = round(currentMix.amount + move.amount)
    currentMix.count += 1
    mixMap.set(move.method, currentMix)

    const detailKey = `${weekKey}|${slotKey}|${move.method}`
    const currentDetail = detailMap.get(detailKey) || {
      key: detailKey,
      week: weekKey,
      timeSlot: slotKey,
      method: move.method,
      count: 0,
      amount: 0,
    }
    currentDetail.count += 1
    currentDetail.amount = round(currentDetail.amount + move.amount)
    detailMap.set(detailKey, currentDetail)

    const currentHeatmapRow = heatmapMap.get(weekKey) || createHeatmapAccumulator(weekKey)
    currentHeatmapRow[slotKey] = round(currentHeatmapRow[slotKey] + measureValue(move, normalizedMode))
    currentHeatmapRow.total = round(currentHeatmapRow.total + measureValue(move, normalizedMode))
    heatmapMap.set(weekKey, currentHeatmapRow)
  }

  const weekly = WEEK_LABELS.map((label) => weeklyMap.get(label) || createWeekAccumulator(label))
  const mix = LOCAL_PAYMENT_METHODS.map((method) => {
    const item = mixMap.get(method) || { label: method, amount: 0, count: 0 }
    return {
      ...item,
      value: normalizedMode === 'count' ? item.count : item.amount,
      share: totalAmount > 0 ? round((item.amount / totalAmount) * 100) : 0,
    }
  })
  const heatmap = WEEK_LABELS.map((label) => heatmapMap.get(label) || createHeatmapAccumulator(label))
  const details = Array.from(detailMap.values())
    .map((item) => ({
      ...item,
      percentOfLocal: normalizedMode === 'count'
        ? (totalCount > 0 ? round((item.count / totalCount) * 100) : 0)
        : (totalAmount > 0 ? round((item.amount / totalAmount) * 100) : 0),
    }))
    .sort((a, b) => {
      if (a.week !== b.week) return weekOrder(a.week) - weekOrder(b.week)
      if (a.timeSlot !== b.timeSlot) return timeSlotOrder(a.timeSlot) - timeSlotOrder(b.timeSlot)
      return a.method.localeCompare(b.method)
    })

  return {
    year,
    month,
    mode: normalizedMode,
    title: 'Analisis de cobros en el local comercial',
    weekly,
    heatmap,
    mix,
    details,
    totals: {
      count: totalCount,
      amount: totalAmount,
    },
  }
}

export async function getSoporteSummary(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const supportTickets = await getSupportTickets()
  const range = getMonthDateRange(year, month)
  const resolvedMonth = supportTickets.filter((ticket) => isResolvedSupportStatus(ticket.ticket_status_id) && isDateInRange(ticket.modified, range))
  const createdMonth = supportTickets.filter((ticket) => isDateInRange(ticket.created, range))
  const delayedMonth = resolvedMonth.filter((ticket) => getSupportHoursElapsed(ticket) > goals.soporte.slaHours)
  const openOverdue = supportTickets.filter((ticket) => !isResolvedSupportStatus(ticket.ticket_status_id) && getSupportHoursElapsed(ticket) > goals.soporte.slaHours)
  const averageHours = average(resolvedMonth.map((ticket) => getSupportHoursElapsed(ticket)))
  const slaCompliance = resolvedMonth.length ? round(((resolvedMonth.length - delayedMonth.length) / resolvedMonth.length) * 100) : 0
  const byCategory = summarizeSupportCategories(resolvedMonth)

  return {
    kpis: [
      { id: 'supportCreated', label: 'Casos ingresados del mes', value: createdMonth.length, status: 'info' },
      { id: 'supportResolved', label: 'Casos resueltos del mes', value: resolvedMonth.length, status: 'info' },
      { id: 'supportAvgHours', label: 'Demora promedio', value: averageHours, status: averageHours <= goals.soporte.slaHours ? 'good' : 'warn', target: goals.soporte.slaHours, format: 'hours' },
      { id: 'supportSlaCompliance', label: 'Cumplimiento SLA', value: slaCompliance, status: slaCompliance >= 85 ? 'good' : 'warn', target: 85, format: 'percent' },
      { id: 'supportDelayedMonth', label: 'Fuera de SLA en el mes', value: delayedMonth.length, status: delayedMonth.length === 0 ? 'good' : 'bad', target: 0 },
      { id: 'supportOpenOverdue', label: 'Abiertos vencidos', value: openOverdue.length, status: openOverdue.length <= goals.soporte.unassignedMax ? 'good' : 'warn', target: goals.soporte.unassignedMax },
    ],
    insights: [
      `Soporte ahora analiza solo tickets clasificados como Reclamo y Soporte, con SLA objetivo de ${goals.soporte.slaHours} horas.`,
      `Resueltos dentro del SLA en ${monthNames[month - 1]} ${year}: ${resolvedMonth.length - delayedMonth.length} de ${resolvedMonth.length}.`,
      'La capa Data incluye una lectura diaria de posibles incidentes segun cantidad de tickets y clientes afectados.',
    ],
    byCategory,
  }
}

export async function getSoporteMonthly(year) {
  const supportTickets = await getSupportTickets()

  return getYearMonths(year).map((monthRow) => {
    const range = getMonthDateRange(year, monthRow.month)
    const created = supportTickets.filter((ticket) => isDateInRange(ticket.created, range))
    const resolved = supportTickets.filter((ticket) => isResolvedSupportStatus(ticket.ticket_status_id) && isDateInRange(ticket.modified, range))
    const delayed = resolved.filter((ticket) => getSupportHoursElapsed(ticket) > goals.soporte.slaHours)
    const avgHours = average(resolved.map((ticket) => getSupportHoursElapsed(ticket)))
    const slaCompliance = resolved.length ? round(((resolved.length - delayed.length) / resolved.length) * 100) : 0

    return {
      year,
      month: monthRow.month,
      label: monthRow.label,
      opened: created.length,
      resolved: resolved.length,
      averageHours: avgHours,
      slaTarget: goals.soporte.slaHours,
      delayed: delayed.length,
      slaCompliance,
      categories: summarizeSupportCategories(resolved),
    }
  })
}

export async function getSoporteIncidents(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month, from = null, until = null) {
  const supportTickets = await getSupportTickets()
  const range = from && until
    ? getExplicitDateRange(from, until)
    : getMonthDateRange(year, month)
  const monthRows = supportTickets.filter((ticket) => isDateInRange(ticket.created, range))
  const grouped = new Map()

  for (const ticket of monthRows) {
    const dateKey = formatDateOnly(ticket.created)
    const current = grouped.get(dateKey) || {
      date: dateKey,
      tickets: 0,
      customers: new Set(),
      reclamo: 0,
      soporte: 0,
    }
    const category = supportCategoryLabel(ticket)
    current.tickets += 1
    if (ticket.customer_id) current.customers.add(String(ticket.customer_id))
    current[category === 'Reclamo' ? 'reclamo' : 'soporte'] += 1
    grouped.set(dateKey, current)
  }

  return Array.from(grouped.values())
    .map((row) => ({
      date: row.date,
      tickets: row.tickets,
      customers: row.customers.size,
      ticketsPerCustomer: row.customers.size ? round(row.tickets / row.customers.size) : row.tickets,
      reclamo: row.reclamo,
      soporte: row.soporte,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

export async function getSoporteBreaches(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month, from = null, until = null) {
  const supportTickets = await getSupportTickets()
  const range = from && until
    ? getExplicitDateRange(from, until)
    : getMonthDateRange(year, month)

  return supportTickets
    .filter((ticket) => {
      if (isResolvedSupportStatus(ticket.ticket_status_id)) {
        return isDateInRange(ticket.modified, range)
      }
      return isDateInRange(ticket.created, range)
    })
    .map((ticket) => {
      const hoursElapsed = getSupportHoursElapsed(ticket)
      const resolved = isResolvedSupportStatus(ticket.ticket_status_id)
      return {
        id: ticket.id,
        created: ticket.created,
        modified: ticket.modified,
        categoryLabel: supportCategoryLabel(ticket),
        statusLabel: supportStatusLabel(ticket.ticket_status_id),
        customerId: ticket.customer_id,
        connectionId: ticket.connection_id,
        assignedUserId: ticket.user_assigned_id,
        hoursElapsed,
        slaTarget: goals.soporte.slaHours,
        isOverTarget: hoursElapsed > goals.soporte.slaHours,
        resolved,
      }
    })
    .filter((ticket) => ticket.isOverTarget)
    .sort((a, b) => b.hoursElapsed - a.hoursElapsed)
}

export async function getSoporteRecurrence(from, until) {
  const supportTickets = await getSupportTickets()
  const range = {
    from: new Date(`${from}T00:00:00-03:00`),
    until: new Date(`${until}T23:59:59-03:00`),
  }
  const reclamoTickets = supportTickets
    .filter((ticket) => supportCategoryLabel(ticket) === 'Reclamo')
    .filter((ticket) => isDateInRange(ticket.created, range))

  const customers = new Map()
  for (const ticket of reclamoTickets) {
    const key = String(ticket.customer_id || `sin-cliente-${ticket.id}`)
    const current = customers.get(key) || {
      customerId: ticket.customer_id || null,
      ticketCount: 0,
      firstTicket: ticket.created,
      lastTicket: ticket.created,
      statusSet: new Set(),
      connectionSet: new Set(),
    }
    current.ticketCount += 1
    if (new Date(ticket.created) < new Date(current.firstTicket)) current.firstTicket = ticket.created
    if (new Date(ticket.created) > new Date(current.lastTicket)) current.lastTicket = ticket.created
    current.statusSet.add(supportStatusLabel(ticket.ticket_status_id))
    if (ticket.connection_id) current.connectionSet.add(String(ticket.connection_id))
    customers.set(key, current)
  }

  const rows = Array.from(customers.values()).map((row) => ({
    customerId: row.customerId,
    ticketCount: row.ticketCount,
    firstTicket: row.firstTicket,
    lastTicket: row.lastTicket,
    statuses: Array.from(row.statusSet).join(', '),
    connections: row.connectionSet.size,
    severity: row.ticketCount > 3 ? 'Critico' : row.ticketCount === 3 ? 'Atencion' : 'Normal',
  }))
    .sort((a, b) => b.ticketCount - a.ticketCount || new Date(b.lastTicket) - new Date(a.lastTicket))

  const buckets = [
    { label: '1 ticket', min: 1, max: 1 },
    { label: '2 tickets', min: 2, max: 2 },
    { label: '3 tickets', min: 3, max: 3 },
    { label: '4 tickets', min: 4, max: 4 },
    { label: '5+ tickets', min: 5, max: Number.POSITIVE_INFINITY },
  ].map((bucket) => ({
    label: bucket.label,
    customers: rows.filter((row) => row.ticketCount >= bucket.min && row.ticketCount <= bucket.max).length,
  }))

  const recurringCustomers = await Promise.all(
    rows
      .filter((row) => row.ticketCount >= 2)
      .map(async (row) => ({
        ...row,
        ...(await getCustomerSupportProfile(row.customerId)),
      }))
  )

  return {
    range: {
      from,
      until,
      days: Math.max(1, daysBetween(from, until) + 1),
    },
    totalCustomers: rows.length,
    totalTickets: reclamoTickets.length,
    buckets,
    recurringCustomers,
  }
}

export async function getPlantaExteriorSummary(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const tickets = await getPlantaExteriorTickets()
  const monthRange = getMonthDateRange(year, month)
  const monthRows = tickets.filter((ticket) => isDateInRange(ticket.created, monthRange))
  const monthResolved = tickets.filter((ticket) => isResolvedSupportStatus(ticket.ticket_status_id) && isDateInRange(ticket.modified, monthRange))
  const monthDelayed = monthResolved.filter((ticket) => getTicketBusinessDays(ticket) > goals.plantaExterior.slaBusinessDays)
  const openOverdue = tickets.filter((ticket) => !isResolvedSupportStatus(ticket.ticket_status_id) && getBusinessDaysElapsed(ticket.created, new Date()) > goals.plantaExterior.slaBusinessDays)
  const averageBusinessDays = average(monthResolved.map((ticket) => getTicketBusinessDays(ticket)))
  const byCategory = summarizePlantaExteriorCategories(monthResolved)
  const slaCompliance = monthResolved.length ? round(((monthResolved.length - monthDelayed.length) / monthResolved.length) * 100) : 0

  return {
    kpis: [
      { id: 'plantaCreatedMonth', label: 'Casos ingresados del mes', value: monthRows.length, status: 'info' },
      { id: 'plantaResolvedMonth', label: 'Casos realizados del mes', value: monthResolved.length, status: 'info' },
      { id: 'plantaAvgDelay', label: 'Demora promedio', value: averageBusinessDays, status: averageBusinessDays <= goals.plantaExterior.slaBusinessDays ? 'good' : 'warn', target: goals.plantaExterior.slaBusinessDays, format: 'days' },
      { id: 'plantaSlaCompliance', label: 'Cumplimiento SLA', value: slaCompliance, status: slaCompliance >= 85 ? 'good' : 'warn', target: 85, format: 'percent' },
      { id: 'plantaDelayedMonth', label: 'Fuera de objetivo en el mes', value: monthDelayed.length, status: monthDelayed.length === 0 ? 'good' : 'bad', target: 0 },
      { id: 'plantaOpenOverdue', label: 'Abiertos vencidos', value: openOverdue.length, status: openOverdue.length <= 10 ? 'good' : 'warn', target: 10 },
    ],
    insights: [
      `Planta Exterior toma tickets de instalación (${PLANTA_EXTERIOR_CATEGORIES.installation}), Wireless a Fibra (${PLANTA_EXTERIOR_CATEGORIES.wirelessToFiber}) y cambio de domicilio (${PLANTA_EXTERIOR_CATEGORIES.addressChange}).`,
      `Realizado se mide por tickets resueltos (status = 2) y usa la fecha de modified como cierre operativo.`,
      `La demora se calcula en días hábiles y el SLA actual es ${goals.plantaExterior.slaBusinessDays} días hábiles.`,
    ],
    byCategory,
  }
}

export async function getPlantaExteriorMonthly(year = getCurrentYearMonth().year) {
  const tickets = await getPlantaExteriorTickets()
  return getYearMonths(year).map((monthRow) => {
    const range = getMonthDateRange(year, monthRow.month)
    const created = tickets.filter((ticket) => isDateInRange(ticket.created, range))
    const resolved = tickets.filter((ticket) => isResolvedSupportStatus(ticket.ticket_status_id) && isDateInRange(ticket.modified, range))
    const delayed = resolved.filter((ticket) => getTicketBusinessDays(ticket) > goals.plantaExterior.slaBusinessDays)
    const avgDelay = average(resolved.map((ticket) => getTicketBusinessDays(ticket)))

    return {
      year,
      month: monthRow.month,
      label: monthRow.label,
      created: created.length,
      resolved: resolved.length,
      averageBusinessDays: avgDelay,
      slaTarget: goals.plantaExterior.slaBusinessDays,
      delayed: delayed.length,
      delayedRate: resolved.length ? round((delayed.length / resolved.length) * 100) : 0,
      categories: summarizePlantaExteriorCategories(resolved),
    }
  })
}

export async function getPlantaExteriorBreaches(year = getCurrentYearMonth().year, month = getCurrentYearMonth().month) {
  const tickets = await getPlantaExteriorTickets()
  const range = getMonthDateRange(year, month)

  const rows = tickets
    .filter((ticket) => {
      if (isResolvedSupportStatus(ticket.ticket_status_id)) {
        return isDateInRange(ticket.modified, range)
      }
      return isDateInRange(ticket.created, range)
    })
    .map((ticket) => {
      const businessDays = getTicketBusinessDays(ticket)
      const resolved = isResolvedSupportStatus(ticket.ticket_status_id)
      return {
        id: ticket.id,
        created: ticket.created,
        modified: ticket.modified,
        title: String(ticket.title || '').trim(),
        categoryId: Number(ticket.ticket_category_id),
        categoryLabel: plantaExteriorCategoryLabel(ticket.ticket_category_id),
        statusId: Number(ticket.ticket_status_id),
        statusLabel: supportStatusLabel(ticket.ticket_status_id),
        customerId: ticket.customer_id,
        connectionId: ticket.connection_id,
        assignedUserId: ticket.user_assigned_id,
        businessDays,
        slaTarget: goals.plantaExterior.slaBusinessDays,
        isOverTarget: businessDays > goals.plantaExterior.slaBusinessDays,
        resolved,
      }
    })
    .filter((ticket) => ticket.isOverTarget)
    .sort((a, b) => b.businessDays - a.businessDays)

  return Promise.all(rows.map(async (row) => ({
    ...row,
    customerName: await getCustomerDisplayName(row.customerId),
  })))
}

async function getMonthlyBilling(from, until) {
  const firstPage = await ispbrainGet('/comprobantes', {
    'page[size]': 500,
    'page[number]': 1,
    'filter[date_from]': from,
    'filter[date_until]': until,
  })

  const totalPages = firstPage.meta.pagination.page_total
  let allItems = [...firstPage.data]

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await ispbrainGet('/comprobantes', {
      'page[size]': 500,
      'page[number]': page,
      'filter[date_from]': from,
      'filter[date_until]': until,
    })
    allItems = allItems.concat(nextPage.data)
  }

  const classified = allItems.map((item) => ({
    ...item,
    amount: Number(item.total || 0),
    category: classifyComprobante(item.tipo_comp),
  }))

  const total = classified.reduce((acc, item) => {
    if (item.category === 'operational_income') return acc + item.amount
    if (item.category === 'negative_adjustment') return acc - Math.abs(item.amount)
    return acc
  }, 0)
  const operationalCount = classified.filter((item) => item.category === 'operational_income').length

  return {
    total,
    count: classified.length,
    operationalCount,
    breakdown: classified.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount
      return acc
    }, {}),
  }
}

async function getReceiptsTotal(from, until) {
  const result = await ispbrainGet('/comprobantes/receipts/total', {
    'filter[date_from]': from,
    'filter[date_until]': until,
  })

  return {
    amount: result.data.amount,
    total: Number(result.data.total || 0),
  }
}

async function getCurrentActiveConnectionsByPlan() {
  const rows = await getAllConnections({
    'filter[enabled]': 1,
    'filter[deleted]': 0,
    'filter[archived]': 0,
  })

  return rows.reduce((acc, row) => {
    const planId = Number(row.plan?.id || 0)
    if (!planId) return acc
    acc.set(planId, (acc.get(planId) || 0) + 1)
    return acc
  }, new Map())
}

async function getCommercialPlanMonthlyChanges(year) {
  const months = getYearMonths(year)
  return Promise.all(months.map(async ({ month, label }) => {
    const range = getMonthRange(year, month)
    const [createdRows, deletedRows, archivedRows] = await Promise.all([
      getAllConnections({
        'filter[created_from]': range.from,
        'filter[created_until]': range.until,
      }),
      getAllConnections({
        'filter[deleted_from]': range.from,
        'filter[deleted_until]': range.until,
      }),
      getAllConnections({
        'filter[archived_from]': range.from,
        'filter[archived_until]': range.until,
      }),
    ])

    const planLabels = new Map()
    const createdByPlan = summarizeConnectionPlans(createdRows, planLabels)
    const removedByPlan = mergePlanCountMaps(
      summarizeConnectionPlans(deletedRows, planLabels),
      summarizeConnectionPlans(archivedRows, planLabels),
    )

    return {
      month,
      label,
      createdByPlan,
      removedByPlan,
      planLabels,
    }
  }))
}

function summarizeConnectionPlans(rows, planLabels = new Map()) {
  return rows.reduce((acc, row) => {
    const planId = Number(row.plan?.id || 0)
    if (!planId) return acc
    if (row.plan?.name) {
      planLabels.set(planId, row.plan.name)
    }
    acc.set(planId, (acc.get(planId) || 0) + 1)
    return acc
  }, new Map())
}

function mergePlanCountMaps(...maps) {
  const merged = new Map()
  for (const map of maps) {
    for (const [key, value] of map.entries()) {
      merged.set(key, (merged.get(key) || 0) + value)
    }
  }
  return merged
}

async function getPlansCatalog() {
  const response = await ispbrainGet('/plans', {
    'page[size]': 500,
    'page[number]': 1,
  })
  return Array.isArray(response) ? response : response.data || []
}

async function getAllConnections(params = {}) {
  const firstPage = await ispbrainGet('/connections', {
    'page[size]': 500,
    'page[number]': 1,
    ...params,
  })

  const rows = [...(firstPage.data || [])]
  const totalPages = firstPage.meta?.pagination?.page_total || 1

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await ispbrainGet('/connections', {
      'page[size]': 500,
      'page[number]': page,
      ...params,
    })
    rows.push(...(nextPage.data || []))
  }

  return rows
}

async function getPendingCharges() {
  const firstPage = await ispbrainGet('/charges/pending', {
    'page[size]': 50,
    'page[number]': 1,
  })

  const totalPages = firstPage.meta.pagination.page_total
  let rows = [...firstPage.data]

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await ispbrainGet('/charges/pending', {
      'page[size]': 50,
      'page[number]': page,
    })
    rows = rows.concat(next.data)
  }

  return {
    meta: firstPage.meta,
    rows,
  }
}

async function getPaymentMethodBreakdownForMonth(year, month) {
  const cacheKey = `${year}-${String(month).padStart(2, '0')}`
  const cached = paymentMethodMonthCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const moves = await fetchAllPayboxesMovesForMonth(year, month)
  const collections = moves.filter((move) => COLLECTION_MOVE_TYPES.has(String(move.type || '').trim().toUpperCase()))
  const grouped = new Map()

  for (const move of collections) {
    const label = String(move.payment_method?.name || 'Sin metodo de pago').trim() || 'Sin metodo de pago'
    const amount = round(Math.abs(Number(move.import || 0)))
    const current = grouped.get(label) || { label, count: 0, amount: 0 }
    current.count += 1
    current.amount = round(current.amount + amount)
    grouped.set(label, current)
  }

  const data = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
  paymentMethodMonthCache.set(cacheKey, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    data,
  })

  return data
}

function mapLocalCommercialMove(move) {
  const createdAt = new Date(move.created)
  return {
    method: normalizeLocalPaymentMethod(move.payment_method?.name),
    amount: round(Math.abs(Number(move.import || 0))),
    createdAt,
    weekOfMonth: Math.min(5, Math.floor((createdAt.getDate() - 1) / 7) + 1),
    timeSlot: getTimeSlotLabel(createdAt),
  }
}

function normalizeLocalPaymentMethod(value) {
  const normalized = normalizeText(value)
  if (normalized.includes('efectivo')) return 'Efectivo'
  if (normalized.includes('debito')) return 'Tarjeta de Débito'
  if (normalized.includes('credito')) return 'Tarjeta de Crédito'
  return String(value || 'Sin metodo de pago').trim() || 'Sin metodo de pago'
}

function getTimeSlotLabel(date) {
  const hour = date.getHours()
  if (hour < 10) return '08-10'
  if (hour < 12) return '10-12'
  if (hour < 14) return '12-14'
  if (hour < 16) return '14-16'
  if (hour < 18) return '16-18'
  if (hour < 20) return '18-20'
  return 'Otro'
}

function weekLabel(weekNumber) {
  return WEEK_LABELS[weekNumber - 1] || '5ta semana'
}

function createWeekAccumulator(label) {
  return {
    label,
    efectivo: 0,
    debito: 0,
    credito: 0,
    total: 0,
  }
}

function createHeatmapAccumulator(label) {
  return {
    label,
    '08-10': 0,
    '10-12': 0,
    '12-14': 0,
    '14-16': 0,
    '16-18': 0,
    '18-20': 0,
    Otro: 0,
    total: 0,
  }
}

function methodField(method, mode) {
  if (method === 'Efectivo') return 'efectivo'
  if (method === 'Tarjeta de Débito') return 'debito'
  if (method === 'Tarjeta de Crédito') return 'credito'
  return mode === 'count' ? 'efectivo' : 'efectivo'
}

function measureValue(move, mode) {
  return mode === 'count' ? 1 : move.amount
}

function weekOrder(label) {
  return WEEK_LABELS.indexOf(label)
}

function timeSlotOrder(label) {
  return TIME_SLOT_LABELS.indexOf(label)
}

function classifyComprobante(tipo) {
  if (tipo === 'XRX') return 'receipt'
  if (tipo === '008') return 'negative_adjustment'
  return 'operational_income'
}

function getMonthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const untilDate = new Date(year, month, 0)
  const until = `${year}-${String(month).padStart(2, '0')}-${String(untilDate.getDate()).padStart(2, '0')}`
  return { from, until, labelLong: `${monthNames[month - 1]} ${year}` }
}

function kpi(id, label, value, target, status, format = null) {
  return {
    id,
    label,
    value,
    target,
    progress: target ? round((value / target) * 100) : null,
    status,
    format,
  }
}

function round(value) {
  return Math.round(value * 10) / 10
}

function interpolateActive(month) {
  const map = { 1: 1760, 2: 1784, 3: 1815 }
  return map[month] || 1815
}

function interpolateChurn(month) {
  const map = { 1: 24, 2: 29, 3: 21 }
  return map[month] || 0
}

function interpolateUpselling(month) {
  const map = { 1: 16, 2: 19, 3: 18 }
  return map[month] || 0
}

async function getCommercialTicketsByMonth(year, month) {
  const range = getMonthDateRange(year, month)
  const tickets = await getAllTickets({
    'filter[deleted]': 0,
    'filter[created]': `${year}-${String(month).padStart(2, '0')}`,
  })

  const monthlyRows = tickets.filter((ticket) => {
    const createdAt = new Date(ticket.created)
    return createdAt >= range.from && createdAt <= range.until
  })

  return {
    upselling: summarizeCommercialCategory(monthlyRows, 21, 'Upselling'),
    planChange: summarizeCommercialCategory(monthlyRows, 18, 'Cambio de abono'),
    migration: summarizeCommercialCategory(monthlyRows, 14, 'Migracion'),
  }
}

function groupByPeriod(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = row.period || 'Sin periodo'
    map.set(key, (map.get(key) || 0) + Number(row.total || 0))
  }
  return Array.from(map.entries())
    .map(([label, total]) => ({ label, total: round(total) }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
}

async function getSupportTickets() {
  const tickets = await getAllTickets({ 'filter[deleted]': 0 })
  return tickets.filter(isSupportTicket)
}

async function getCustomerDisplayName(customerId) {
  if (!customerId) return null

  try {
    const response = await ispbrainGet(`/customers/${customerId}`)
    return response?.name || response?.fantasy_name || response?.data?.name || response?.data?.fantasy_name || null
  } catch (_error) {
    return null
  }
}

async function getCustomerSupportProfile(customerId) {
  if (!customerId) {
    return {
      customerName: null,
      serviceStartDate: null,
      blockedByLackOfPayment: null,
    }
  }

  const cached = customerSupportProfileCache.get(customerId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  try {
    const response = await ispbrainGet(`/customers/${customerId}`)
    const customer = response?.data || response
    const connections = Array.isArray(customer?.connections) ? customer.connections : []
    const serviceStartDate = resolveServiceStartDate(customer, connections)
    const hasDisabledConnection = connections.some((connection) => connection?.enabled === false && !connection?.archived && !connection?.deleted)
    const hasPositiveBalance = Number(customer?.saldo || 0) > 0

    const data = {
      customerName: customer?.name || customer?.fantasy_name || null,
      serviceStartDate,
      blockedByLackOfPayment: hasDisabledConnection && hasPositiveBalance,
    }

    customerSupportProfileCache.set(customerId, {
      expiresAt: Date.now() + 10 * 60 * 1000,
      data,
    })

    return data
  } catch (_error) {
    return {
      customerName: null,
      serviceStartDate: null,
      blockedByLackOfPayment: null,
    }
  }
}

function resolveServiceStartDate(customer, connections) {
  const candidates = [
    customer?.created,
    ...connections.flatMap((connection) => [connection?.created, connection?.technical_created_date]),
  ]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b)

  return candidates[0]?.toISOString() || null
}

async function getPlantaExteriorTickets() {
  const tickets = await getAllTickets({ 'filter[deleted]': 0 })
  return tickets.filter((ticket) => PLANTA_EXTERIOR_CATEGORY_SET.has(Number(ticket.ticket_category_id)))
}

async function getAllTickets(baseParams = {}) {
  const pageSize = 500
  const firstPage = await ispbrainGet('/tickets', {
    'page[size]': pageSize,
    'page[number]': 1,
    ...baseParams,
  })

  const totalPages = firstPage.meta.pagination.page_total
  let rows = [...firstPage.data]

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await ispbrainGet('/tickets', {
      'page[size]': pageSize,
      'page[number]': page,
      ...baseParams,
    })
    rows = rows.concat(next.data)
  }

  return rows
}

function isSupportTicket(ticket) {
  const title = normalizeText(ticket.title)
  const supportCategoryIds = new Set([1, 10, 19])

  if (supportCategoryIds.has(Number(ticket.ticket_category_id))) return true

  return [
    'reclamo',
    'sin servicio',
    'se corta',
    'cambio de contrasena',
    'soporte',
    'lentitud',
    'cable de red',
  ].some((keyword) => title.includes(keyword))
}

function supportCategoryLabel(ticket) {
  const title = normalizeText(ticket.title)

  if (title.includes('reclamo') || title.includes('sin servicio') || title.includes('se corta') || title.includes('lentitud')) {
    return 'Reclamo'
  }

  return 'Soporte'
}

function isOpenSupportStatus(statusId) {
  return [1, 3, 4, 5, 6].includes(Number(statusId))
}

function isResolvedSupportStatus(statusId) {
  return Number(statusId) === 2
}

function supportStatusLabel(statusId) {
  const map = {
    1: 'Pendiente',
    2: 'Resuelto',
    3: 'En curso',
    4: 'Seguimiento',
    5: 'Escalado',
    6: 'Postergado',
  }
  return map[statusId] || `Estado ${statusId}`
}

function summarizeSupportCategories(rows) {
  return ['Reclamo', 'Soporte'].map((label) => ({
    label,
    value: rows.filter((ticket) => supportCategoryLabel(ticket) === label).length,
  }))
}

function topCounts(rows, keyFn, limit = 6) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFn(row) || 'Sin dato'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function compactTicketLabel(title) {
  const normalized = normalizeText(title)
  if (!normalized) return 'Sin titulo'
  if (normalized.includes('sin servicio')) return 'Sin servicio'
  if (normalized.includes('reclamo')) return 'Reclamos'
  if (normalized.includes('contrasena')) return 'Cambio de contrasena'
  if (normalized.includes('soporte')) return 'Soporte'
  if (normalized.includes('cable de red')) return 'Cable de red'
  return String(title).trim()
}

function summarizeCommercialCategory(rows, categoryId, label) {
  const filtered = rows.filter((ticket) => Number(ticket.ticket_category_id) === categoryId)
  const counts = {
    pending: 0,
    resolved: 0,
    inProgress: 0,
    followUp: 0,
    escalated: 0,
    postponed: 0,
  }

  for (const ticket of filtered) {
    const status = commercialStatusBucket(ticket.ticket_status_id)
    counts[status] = (counts[status] || 0) + 1
  }

  return {
    id: `category-${categoryId}`,
    label,
    categoryId,
    total: filtered.length,
    byStatus: counts,
  }
}

function commercialStatusBucket(statusId) {
  const map = {
    1: 'pending',
    2: 'resolved',
    3: 'inProgress',
    4: 'followUp',
    5: 'escalated',
    6: 'postponed',
  }
  return map[Number(statusId)] || 'pending'
}

function commercialStatusLabel(statusId) {
  const map = {
    1: 'Pendiente',
    2: 'Resuelto',
    3: 'En curso',
    4: 'Seguimiento',
    5: 'Escalado',
    6: 'Postergado',
  }
  return map[Number(statusId)] || `Estado ${statusId}`
}

function commercialCategoryLabel(categoryId) {
  const map = {
    21: 'Upselling',
    18: 'Cambio de abono',
    14: 'Wireless a fibra',
  }
  return map[Number(categoryId)] || `Categoria ${categoryId}`
}

function plantaExteriorCategoryLabel(categoryId) {
  const map = {
    [PLANTA_EXTERIOR_CATEGORIES.installation]: 'Nueva instalación',
    [PLANTA_EXTERIOR_CATEGORIES.wirelessToFiber]: 'Wireless a Fibra',
    [PLANTA_EXTERIOR_CATEGORIES.addressChange]: 'Cambio de domicilio',
  }
  return map[Number(categoryId)] || `Categoria ${categoryId}`
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function daysBetween(dateValue, endDate) {
  const start = new Date(dateValue)
  const end = new Date(endDate)
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

function getHoursElapsed(startValue, endValue) {
  if (!startValue || !endValue) return 0
  const start = new Date(startValue)
  const end = new Date(endValue)
  return round((end - start) / (1000 * 60 * 60))
}

function getBusinessDaysElapsed(startValue, endValue) {
  if (!startValue || !endValue) return 0
  const start = new Date(startValue)
  const end = new Date(endValue)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  if (end <= start) return 0

  let current = new Date(start)
  current.setDate(current.getDate() + 1)
  let count = 0

  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      count += 1
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

function getTicketBusinessDays(ticket) {
  const endDate = isResolvedSupportStatus(ticket.ticket_status_id) ? ticket.modified : new Date()
  return getBusinessDaysElapsed(ticket.created, endDate)
}

function getSupportHoursElapsed(ticket) {
  const endDate = isResolvedSupportStatus(ticket.ticket_status_id) ? ticket.modified : new Date()
  return getHoursElapsed(ticket.created, endDate)
}

function average(values) {
  if (!values.length) return 0
  return round(values.reduce((acc, value) => acc + Number(value || 0), 0) / values.length)
}

function isDateInRange(value, range) {
  const date = new Date(value)
  return date >= range.from && date <= range.until
}

function summarizePlantaExteriorCategories(rows) {
  const categories = [
    PLANTA_EXTERIOR_CATEGORIES.installation,
    PLANTA_EXTERIOR_CATEGORIES.wirelessToFiber,
    PLANTA_EXTERIOR_CATEGORIES.addressChange,
  ]

  return categories.map((categoryId) => {
    const filtered = rows.filter((ticket) => Number(ticket.ticket_category_id) === categoryId)
    return {
      categoryId,
      label: plantaExteriorCategoryLabel(categoryId),
      value: filtered.length,
    }
  })
}

function getMonthDateRange(year, month) {
  return {
    from: new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00-03:00`),
    until: new Date(`${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}T23:59:59-03:00`),
  }
}

function getExplicitDateRange(from, until) {
  return {
    from: new Date(`${from}T00:00:00-03:00`),
    until: new Date(`${until}T23:59:59-03:00`),
  }
}

function getGoalMonth(year, month) {
  return goals.monthly.find((row) => row.year === year && row.month === month) || null
}

let activeHistoryCache = {
  expiresAt: 0,
  data: null,
}

async function getHistoricalActiveConnectionsMap() {
  if (activeHistoryCache.data && activeHistoryCache.expiresAt > Date.now()) {
    return activeHistoryCache.data
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const startYear = 2025

  const currentActive = (await ispbrainGet('/connections/total', {
    'filter[enabled]': 1,
    'filter[deleted]': 0,
    'filter[archived]': 0,
  })).data.amount

  const rows = []
  for (let year = startYear; year <= currentYear; year += 1) {
    const maxMonth = year === currentYear ? currentMonth : 12
    for (let month = 1; month <= maxMonth; month += 1) {
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const isCurrentMonth = year === currentYear && month === currentMonth
      const until = isCurrentMonth
        ? formatDateOnly(now)
        : `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

      const [created, deletedIds, archivedIds] = await Promise.all([
        getConnectionsFilteredTotal({
          'filter[created_from]': from,
          'filter[created_until]': until,
        }),
        getConnectionIds({
          'filter[deleted_from]': from,
          'filter[deleted_until]': until,
        }),
        getConnectionIds({
          'filter[archived_from]': from,
          'filter[archived_until]': until,
        }),
      ])

      rows.push({
        key: `${year}-${String(month).padStart(2, '0')}`,
        created,
        removed: new Set([...deletedIds, ...archivedIds]).size,
      })
    }
  }

  let activeEnd = currentActive
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    rows[index].activeEnd = activeEnd
    activeEnd = activeEnd - rows[index].created + rows[index].removed
  }

  const map = new Map(rows.map((row) => [row.key, row.activeEnd]))
  activeHistoryCache = {
    data: map,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }

  return map
}

async function getConnectionsFilteredTotal(params = {}) {
  const response = await ispbrainGet('/connections', {
    'page[size]': 1,
    'page[number]': 1,
    ...params,
  })

  return response.meta.filtered_total || 0
}

async function getConnectionIds(params = {}) {
  const firstPage = await ispbrainGet('/connections', {
    'page[size]': 500,
    'page[number]': 1,
    ...params,
  })

  const rows = [...firstPage.data]
  const totalPages = firstPage.meta.pagination.page_total

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await ispbrainGet('/connections', {
      'page[size]': 500,
      'page[number]': page,
      ...params,
    })
    rows.push(...nextPage.data)
  }

  return rows.map((item) => item.id)
}

function getYearMonths(year) {
  return monthNames.map((label, index) => ({
    year,
    month: index + 1,
    label,
  }))
}

function getCurrentYearMonth() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function formatDateOnly(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PLANTA_EXTERIOR_CATEGORIES = {
  installation: 2,
  wirelessToFiber: 14,
  addressChange: 15,
}
const PLANTA_EXTERIOR_CATEGORY_SET = new Set(Object.values(PLANTA_EXTERIOR_CATEGORIES))
const COLLECTION_MOVE_TYPES = new Set(['INGRESO', 'TRANSFERENCIA DE INGRESO'])
const LOCAL_PAYMENT_METHODS = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito']
const WEEK_LABELS = ['1ra semana', '2da semana', '3ra semana', '4ta semana', '5ta semana']
const TIME_SLOT_LABELS = ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20', 'Otro']
const paymentMethodMonthCache = new Map()
const customerSupportProfileCache = new Map()
