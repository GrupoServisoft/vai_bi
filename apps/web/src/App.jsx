import { useEffect, useMemo, useState } from 'react'
import { ConfigProvider, Layout, Menu, Card as AntCard, Statistic, Row, Col, Typography, Tag, Select, Alert, Table as AntTable, Spin, Tabs as AntTabs, Input, Empty } from 'antd'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js'
import vaiLogo from './assets/vai-logo.svg'
import 'antd/dist/reset.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend)

const { Sider, Header, Content } = Layout
const { Title, Paragraph, Text } = Typography
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-AR')
const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export default function App() {
  const location = useLocation()
  const selected = location.pathname.startsWith('/comercial')
    ? 'comercial'
    : location.pathname.startsWith('/cobranzas')
      ? 'cobranzas'
      : location.pathname.startsWith('/planta-exterior')
        ? 'planta-exterior'
      : location.pathname.startsWith('/soporte')
        ? 'soporte'
      : 'directorio'
  const pageMeta = pageMetaMap[selected]

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#e30629',
          colorText: '#16213d',
          colorTextSecondary: '#5a6b88',
          colorBorderSecondary: '#dbe4ef',
          colorBgContainer: '#ffffff',
          borderRadius: 18,
          fontFamily: '"Segoe UI", Arial, sans-serif',
        },
        components: {
          Layout: {
            siderBg: '#16213d',
            bodyBg: 'transparent',
            headerBg: 'transparent',
          },
          Menu: {
            itemBg: 'transparent',
            itemColor: 'rgba(226, 232, 240, 0.82)',
            itemHoverBg: 'rgba(255, 255, 255, 0.06)',
            itemSelectedBg: '#f4f7fb',
            itemSelectedColor: '#16213d',
            itemBorderRadius: 14,
          },
          Tabs: {
            itemColor: '#4f617f',
            itemSelectedColor: '#ffffff',
            itemActiveColor: '#ffffff',
            titleFontSize: 14,
          },
          Table: {
            headerBg: '#f5f8fc',
            headerColor: '#41526d',
            rowHoverBg: '#f8fbff',
          },
        },
      }}
    >
      <Layout className="app-shell">
        <Sider width={280} className="app-sider" theme="light">
          <BrandCard />
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={[
              { key: 'directorio', label: <Link to="/directorio">Directorio</Link> },
              { key: 'comercial', label: <Link to="/comercial">Comercial</Link> },
              { key: 'cobranzas', label: <Link to="/cobranzas">Cobranzas</Link> },
              { key: 'planta-exterior', label: <Link to="/planta-exterior">Planta Exterior</Link> },
              { key: 'soporte', label: <Link to="/soporte">Soporte</Link> },
            ]}
          />
          <Card className="sider-note">
            <Text type="secondary">Lectura operativa conectada al backend propio, con foco en KPI, comparativos y detalle filtrable por proceso.</Text>
          </Card>
        </Sider>
        <Layout>
          <Header className="app-header">
            <Card bordered={false} className="app-header-card">
              <div className="app-header-row">
                <div className="app-header-copy">
                  <Tag color="red">VAI BI</Tag>
                  <Title level={2}>{pageMeta.title}</Title>
                  <Paragraph>{pageMeta.description}</Paragraph>
                </div>
                <div className="app-header-stats">
                  <div className="app-header-stat">
                    <span className="app-header-stat-label">Vista activa</span>
                    <span className="app-header-stat-value">{pageMeta.label}</span>
                  </div>
                  <div className="app-header-stat">
                    <span className="app-header-stat-label">Actualizado</span>
                    <span className="app-header-stat-value">{formatDateLong(today)}</span>
                  </div>
                  <div className="app-header-stat">
                    <span className="app-header-stat-label">Cobertura</span>
                    <span className="app-header-stat-value">5 procesos</span>
                  </div>
                  <div className="app-header-stat">
                    <span className="app-header-stat-label">Modo</span>
                    <span className="app-header-stat-value">Operativo</span>
                  </div>
                </div>
              </div>
            </Card>
          </Header>
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/directorio" replace />} />
              <Route path="/directorio" element={<DirectorioPage />} />
              <Route path="/comercial" element={<ComercialPage />} />
              <Route path="/cobranzas" element={<CobranzasPage />} />
              <Route path="/planta-exterior" element={<PlantaExteriorPage />} />
              <Route path="/soporte" element={<SoportePage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

function BrandCard() {
  return (
    <div className="brand-card">
      <div className="brand-head">
        <img src={vaiLogo} className="brand-logo" alt="Logo VAI Internet" />
        <div>
          <Title level={4}>VAI BI</Title>
          <Paragraph>Tablero ejecutivo con datos vivos, comparativos y detalle analitico por proceso.</Paragraph>
        </div>
      </div>
    </div>
  )
}

function Card({ className = '', title, ...props }) {
  const variantClassName = title ? 'panel-card panel-card--headed' : 'panel-card'
  return <AntCard title={title} {...props} className={[variantClassName, className].filter(Boolean).join(' ')} />
}

function Table({ className = '', pagination, scroll, locale, size = 'middle', ...props }) {
  const resolvedPagination = pagination === false
    ? false
    : {
        showSizeChanger: false,
        ...(typeof pagination === 'object' ? pagination : {}),
      }

  return (
    <AntTable
      size={size}
      pagination={resolvedPagination}
      scroll={scroll ?? { x: 'max-content' }}
      locale={{ emptyText: <SectionEmpty description="No hay datos disponibles para estos filtros." />, ...locale }}
      className={['data-table', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

function Tabs({ className = '', ...props }) {
  return <AntTabs className={['process-tabs', className].filter(Boolean).join(' ')} {...props} />
}

function DirectorioPage() {
  const [year, setYear] = useState(currentYear)
  const { data: summary, loading: loadingSummary, error: summaryError } = useApi(`/api/directorio/summary?year=${year}&month=${currentMonth}`)
  const { data: monthly, loading: loadingMonthly, error: monthlyError } = useApi(`/api/directorio/monthly?year=${year}`)
  const { data: meta, error: metaError } = useApi('/api/meta')

  const tableRows = useMemo(() => (monthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    activas: row.activeConnections,
    activasObjetivo: row.activeConnectionsTarget,
    ventas: row.sales,
    ventasObjetivo: row.salesTarget,
    bajas: row.churn,
    bajasObjetivo: row.churnTarget,
    facturacion: row.billing,
    facturacionObjetivo: row.billingTarget,
  })), [monthly])

  const lineData = useMemo(() => ({
    labels: tableRows.map((row) => row.mes),
    datasets: [
      { label: 'Activas real', data: tableRows.map((row) => row.activas), borderColor: '#e30629', backgroundColor: '#e30629', tension: 0.35 },
      { label: 'Activas objetivo', data: tableRows.map((row) => row.activasObjetivo), borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.35 },
    ],
  }), [tableRows])

  const salesBars = useMemo(() => ({
    labels: tableRows.map((row) => row.mes),
    datasets: [
      { label: 'Ventas', data: tableRows.map((row) => row.ventas), backgroundColor: '#e30629' },
      { label: 'Objetivo ventas', data: tableRows.map((row) => row.ventasObjetivo), backgroundColor: '#f8c457' },
      { label: 'Bajas', data: tableRows.map((row) => row.bajas), backgroundColor: '#b42318' },
    ],
  }), [tableRows])

  const sectionAlerts = (
    <SectionAlerts
      errors={[summaryError, monthlyError, metaError]}
      info={meta ? `Regla live de conexiones activas: enabled=${meta.active_connections_rule.enabled}, deleted=${meta.active_connections_rule.deleted}, archived=${meta.active_connections_rule.archived}. Valor validado: ${decimal.format(meta.active_connections_rule.current_value)}.` : null}
    />
  )

  return (
    <PageSection
      title="Directorio"
      subtitle="Portada ejecutiva con crecimiento, ingresos y tendencia mensual comparada contra el plan."
      alerts={sectionAlerts}
      extra={<Select value={year} onChange={setYear} options={[{ value: 2026, label: 'Ano 2026' }, { value: 2025, label: 'Ano 2025' }]} style={{ width: 140 }} />}
    >
      {loadingSummary || loadingMonthly ? <CenteredSpinner /> : null}
      <KpiGrid items={summary?.data?.kpis || []} />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Evolucion mensual de conexiones activas">
            <div className="chart-box"><Line data={lineData} options={baseChartOptions} /></div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Ventas y bajas vs objetivo">
            <div className="chart-box"><Bar data={salesBars} options={baseChartOptions} /></div>
          </Card>
        </Col>
      </Row>
      <Card title="Resumen mensual">
        <Table
          dataSource={tableRows}
          pagination={false}
          columns={[
            { title: 'Mes', dataIndex: 'mes', key: 'mes' },
            { title: 'Activas', dataIndex: 'activas', key: 'activas', render: formatNumber },
            { title: 'Obj. activas', dataIndex: 'activasObjetivo', key: 'activasObjetivo', render: formatNumber },
            { title: 'Ventas', dataIndex: 'ventas', key: 'ventas', render: formatNumber },
            { title: 'Obj. ventas', dataIndex: 'ventasObjetivo', key: 'ventasObjetivo', render: formatNumber },
            { title: 'Bajas', dataIndex: 'bajas', key: 'bajas', render: formatNumber },
            { title: 'Facturacion', dataIndex: 'facturacion', key: 'facturacion', render: formatMoney },
          ]}
        />
      </Card>
    </PageSection>
  )
}

function ComercialPage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [compareYear, setCompareYear] = useState(null)
  const [category, setCategory] = useState('upselling')
  const [activeTab, setActiveTab] = useState('resumen')
  const { data: summary, loading: loadingSummary, error: summaryError } = useApi(`/api/comercial/summary?year=${year}&month=${month}`)
  const { data: monthly, loading: loadingMonthly, error: monthlyError } = useApi(`/api/comercial/monthly?year=${year}`)
  const { data: compareMonthly, loading: loadingCompare, error: compareError } = useApi(compareYear ? `/api/comercial/monthly?year=${compareYear}` : null)
  const { data: ticketData, loading: loadingTickets, error: ticketsError } = useApi(`/api/comercial/tickets?year=${year}&month=${month}`)
  const { data: planEvolution, loading: loadingPlanEvolution, error: planEvolutionError } = useApi(`/api/comercial/plans?year=${year}`)

  const rows = useMemo(() => (monthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    ventas: row.sales,
    ventasObjetivo: row.salesTarget,
    bajas: row.drops,
    bajasObjetivo: row.dropsTarget,
    activas: row.activeConnections,
    activasObjetivo: row.activeConnectionsTarget,
    billing: row.billing,
    billingTarget: row.billingTarget,
    upselling: row.upselling,
    upsellingObjetivo: row.upsellingTarget,
  })), [monthly])

  const enhancedRows = useMemo(() => rows.map((row, index) => ({
    ...row,
    category: monthly?.data?.[index]?.ticketCategories?.[category],
  })), [rows, monthly, category])

  const compareRows = useMemo(() => (compareMonthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    activas: row.activeConnections,
    sales: row.sales,
    billing: row.billing,
    upselling: row.upselling,
    category: row.ticketCategories?.[category],
  })), [compareMonthly, category])

  const ticketRows = ticketData?.data || []
  const planMonthlyRows = planEvolution?.data?.monthly || []
  const topPlanRows = planEvolution?.data?.topPlans || []

  const summaryHighlights = useMemo(() => {
    const currentMonth = monthly?.data?.find((row) => row.month === month)
    const previousMonth = compareMonthly?.data?.find((row) => row.month === month)
    return [
      {
        key: 'ventas',
        title: 'Ventas del periodo',
        value: currentMonth?.sales,
        subtitle: compareYear ? `Vs ${compareYear}: ${formatOptionalNumber(previousMonth?.sales)}` : 'Seguimiento de altas concretadas',
      },
      {
        key: 'upselling',
        title: `${categoryLabelMap[category]} resuelto`,
        value: currentMonth?.ticketCategories?.[category]?.byStatus?.resolved,
        subtitle: compareYear ? `Vs ${compareYear}: ${formatOptionalNumber(previousMonth?.ticketCategories?.[category]?.byStatus?.resolved)}` : 'Gestiones cerradas del periodo',
      },
      {
        key: 'facturacion',
        title: 'Facturacion del periodo',
        value: currentMonth?.billing,
        subtitle: currentMonth?.billingTarget ? `Objetivo: ${formatMoney(currentMonth.billingTarget)}` : 'Sin objetivo cargado para este ano',
        format: 'currency',
      },
      {
        key: 'conversion',
        title: 'Conversion lead a venta',
        value: summary?.data?.kpis?.find((item) => item.id === 'leadConversion')?.value,
        subtitle: 'Conversion provisoria hasta integrar el embudo interno',
        format: 'percent',
      },
    ]
  }, [monthly, month, compareMonthly, compareYear, category, summary])

  const yearToDateSummary = useMemo(() => {
    const cutoffMonth = year === currentYear ? currentMonth : 12
    const yearRows = (monthly?.data || []).filter((row) => row.month <= cutoffMonth)

    const totals = yearRows.reduce((acc, row) => ({
      sales: acc.sales + Number(row.sales || 0),
      salesTarget: acc.salesTarget + Number(row.salesTarget || 0),
      drops: acc.drops + Number(row.drops || 0),
      dropsTarget: acc.dropsTarget + Number(row.dropsTarget || 0),
    }), {
      sales: 0,
      salesTarget: 0,
      drops: 0,
      dropsTarget: 0,
    })

    const salesGap = evaluatePerformanceGap(totals.sales, totals.salesTarget, 'higher')
    const dropsGap = evaluatePerformanceGap(totals.drops, totals.dropsTarget, 'lower')

    return {
      cutoffMonth,
      items: [
        {
          key: 'sales-real',
          title: 'Venta real',
          value: totals.sales,
          subtitle: `Acumulado hasta ${monthLabelMap[cutoffMonth]}`,
        },
        {
          key: 'sales-target',
          title: 'Venta objetivo',
          value: totals.salesTarget,
          subtitle: `Referencia hasta ${monthLabelMap[cutoffMonth]}`,
        },
        {
          key: 'drops-real',
          title: 'Baja real',
          value: totals.drops,
          subtitle: `Acumulado hasta ${monthLabelMap[cutoffMonth]}`,
        },
        {
          key: 'drops-target',
          title: 'Baja objetivo',
          value: totals.dropsTarget,
          subtitle: `Referencia hasta ${monthLabelMap[cutoffMonth]}`,
        },
      ],
      gaps: [
        {
          key: 'sales-gap',
          title: 'Brecha ventas',
          gap: salesGap,
        },
        {
          key: 'drops-gap',
          title: 'Brecha bajas',
          gap: dropsGap,
        },
      ],
    }
  }, [monthly, year])

  const salesChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        type: 'bar',
        label: 'Ventas real',
        data: rows.map((row) => row.ventas ?? null),
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        borderRadius: 8,
        maxBarThickness: 22,
      },
      {
        type: 'bar',
        label: 'Baja real',
        data: rows.map((row) => row.bajas ?? null),
        backgroundColor: '#b42318',
        borderColor: '#b42318',
        borderRadius: 8,
        maxBarThickness: 22,
      },
      {
        type: 'line',
        label: 'Ventas objetivo',
        data: rows.map((row) => row.ventasObjetivo ?? null),
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
      {
        type: 'line',
        label: 'Baja objetivo',
        data: rows.map((row) => row.bajasObjetivo ?? null),
        borderColor: '#f8c457',
        backgroundColor: '#f8c457',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
      ...(compareYear ? [{
        label: `Ventas ${compareYear}`,
        data: compareRows.map((row) => row.sales),
        type: 'line',
        borderColor: '#374151',
        backgroundColor: '#374151',
        tension: 0.3,
      }] : []),
    ],
  }), [rows, compareYear, compareRows])

  const activeConnectionsChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Conexiones activas', data: rows.map((row) => row.activas ?? null), borderColor: '#e30629', backgroundColor: '#e30629', tension: 0.35 },
      { label: 'Objetivo conexiones', data: rows.map((row) => row.activasObjetivo ?? null), borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.35 },
      ...(compareYear ? [{ label: `Conexiones activas ${compareYear}`, data: compareRows.map((row) => row.activas ?? null), borderColor: '#374151', backgroundColor: '#374151', tension: 0.35 }] : []),
    ],
  }), [rows, compareRows, compareYear])

  const billingChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: `Facturacion ${year}`, data: rows.map((row) => row.billing ?? null), borderColor: '#e30629', backgroundColor: '#e30629', tension: 0.35 },
      ...(compareYear ? [{ label: `Facturacion ${compareYear}`, data: compareRows.map((row) => row.billing ?? null), borderColor: '#374151', backgroundColor: '#374151', tension: 0.35 }] : []),
      ...(year === 2026 ? [{ label: 'Objetivo facturacion', data: rows.map((row) => row.billingTarget ?? null), borderColor: '#14804a', backgroundColor: '#14804a', tension: 0.35 }] : []),
    ],
  }), [rows, compareRows, year, compareYear])

  const activeConnectionsAndBillingChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        type: 'bar',
        label: 'Conexiones activas',
        data: rows.map((row) => row.activas ?? null),
        yAxisID: 'y',
        backgroundColor: 'rgba(227, 6, 41, 0.78)',
        borderColor: '#e30629',
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 26,
      },
      {
        type: 'bar',
        label: 'Objetivo conexiones',
        data: rows.map((row) => row.activasObjetivo ?? null),
        yAxisID: 'y',
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 26,
      },
      {
        type: 'line',
        label: `Facturacion ${year}`,
        data: rows.map((row) => row.billing ?? null),
        yAxisID: 'y1',
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
      ...(year === 2026 ? [{
        type: 'line',
        label: 'Objetivo facturacion',
        data: rows.map((row) => row.billingTarget ?? null),
        yAxisID: 'y1',
        borderColor: '#0f766e',
        backgroundColor: '#0f766e',
        borderDash: [6, 6],
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      }] : []),
    ],
  }), [rows, year])

  const categoryStatusChart = useMemo(() => ({
    labels: enhancedRows.map((row) => row.mes),
    datasets: [
      { label: 'Pendiente', data: enhancedRows.map((row) => row.category?.byStatus.pending || 0), backgroundColor: '#f59e0b' },
      { label: 'Resuelto', data: enhancedRows.map((row) => row.category?.byStatus.resolved || 0), backgroundColor: '#14804a' },
      { label: 'En curso', data: enhancedRows.map((row) => row.category?.byStatus.inProgress || 0), backgroundColor: '#2563eb' },
      { label: 'Seguimiento', data: enhancedRows.map((row) => row.category?.byStatus.followUp || 0), backgroundColor: '#b90e2f' },
      { label: 'Escalado', data: enhancedRows.map((row) => row.category?.byStatus.escalated || 0), backgroundColor: '#7c3aed' },
      { label: 'Postergado', data: enhancedRows.map((row) => row.category?.byStatus.postponed || 0), backgroundColor: '#6b7280' },
    ],
  }), [enhancedRows])

  const categoryStatusRows = useMemo(() => {
    const breakdown = summary?.data?.ticketBreakdown
    if (!breakdown) return []

    return [
      mapCommercialCategoryRow(breakdown.upselling),
      mapCommercialCategoryRow(breakdown.planChange),
      mapCommercialCategoryRow(breakdown.migration),
    ]
  }, [summary])

  const comparisonRows = useMemo(() => {
    const currentMonth = monthly?.data?.find((row) => row.month === month)
    const previousMonth = compareMonthly?.data?.find((row) => row.month === month)
    if (!currentMonth) return []

    const currentCategory = currentMonth.ticketCategories?.[category]
    const previousCategory = previousMonth?.ticketCategories?.[category]

    return [
      { key: 'sales', metric: 'Ventas', current: currentMonth.sales, previous: previousMonth?.sales ?? null },
      { key: 'resolved', metric: `${categoryLabelMap[category]} resuelto`, current: currentCategory?.byStatus.resolved ?? 0, previous: previousCategory?.byStatus.resolved ?? null },
      { key: 'pending', metric: `${categoryLabelMap[category]} pendiente`, current: currentCategory?.byStatus.pending ?? 0, previous: previousCategory?.byStatus.pending ?? null },
      { key: 'total', metric: `${categoryLabelMap[category]} total`, current: currentCategory?.total ?? 0, previous: previousCategory?.total ?? null },
    ]
  }, [monthly, compareMonthly, month, category])

  const categoryDistribution = useMemo(() => ({
    labels: categoryStatusRows.map((row) => row.categoria),
    datasets: [
      { label: 'Total del mes', data: categoryStatusRows.map((row) => row.total), backgroundColor: ['#e30629', '#f59e0b', '#2563eb'] },
    ],
  }), [categoryStatusRows])

  const monthlyTableRows = useMemo(() => enhancedRows.map((row) => ({
    ...row,
    key: row.key,
  })), [enhancedRows])

  const monthlyColumns = useMemo(() => [
    {
      title: 'Mes',
      dataIndex: 'mes',
      key: 'mes',
      filters: buildFilters(monthlyTableRows, 'mes'),
      onFilter: (value, record) => record.mes === value,
    },
    { title: 'Ventas', dataIndex: 'ventas', key: 'ventas', render: formatNumber, sorter: numericSorter('ventas') },
    { title: 'Obj. ventas', dataIndex: 'ventasObjetivo', key: 'ventasObjetivo', render: formatOptionalNumber, sorter: numericSorter('ventasObjetivo') },
    { title: 'Bajas', dataIndex: 'bajas', key: 'bajas', render: formatOptionalNumber, sorter: numericSorter('bajas') },
    { title: 'Facturacion', dataIndex: 'billing', key: 'billing', render: formatOptionalMoney, sorter: numericSorter('billing') },
    { title: 'Upselling', dataIndex: 'upselling', key: 'upselling', render: formatNumber, sorter: numericSorter('upselling') },
  ], [monthlyTableRows])

  const categorySeriesChart = useMemo(() => ({
    labels: enhancedRows.map((row) => row.mes),
    datasets: [
      { label: `${categoryLabelMap[category]} resueltos ${year}`, data: enhancedRows.map((row) => row.category?.byStatus.resolved || 0), borderColor: '#e30629', backgroundColor: '#e30629', tension: 0.35 },
      ...(compareYear ? [{ label: `${categoryLabelMap[category]} resueltos ${compareYear}`, data: compareRows.map((row) => row.category?.byStatus.resolved || 0), borderColor: '#374151', backgroundColor: '#374151', tension: 0.35 }] : []),
      ...(category === 'upselling' ? [{ label: 'Objetivo upselling', data: enhancedRows.map((row) => row.upsellingObjetivo ?? null), borderColor: '#14804a', backgroundColor: '#14804a', tension: 0.35 }] : []),
    ],
  }), [enhancedRows, compareRows, year, compareYear, category])

  const newConnectionsKpiChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        type: 'bar',
        label: 'Dato real',
        data: rows.map((row) => row.ventas ?? null),
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        borderRadius: 8,
        maxBarThickness: 24,
      },
      {
        type: 'line',
        label: 'Objetivo',
        data: rows.map((row) => row.ventasObjetivo ?? null),
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  }), [rows])

  const upsellingKpiChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        type: 'bar',
        label: 'Dato real',
        data: rows.map((row) => row.upselling ?? null),
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
        borderRadius: 8,
        maxBarThickness: 24,
      },
      {
        type: 'line',
        label: 'Objetivo',
        data: rows.map((row) => row.upsellingObjetivo ?? null),
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  }), [rows])

  const processKpis = useMemo(() => {
    const cutoffMonth = year === currentYear ? currentMonth : 12
    const yearRows = (monthly?.data || []).filter((row) => row.month <= cutoffMonth)

    const totals = yearRows.reduce((acc, row) => ({
      sales: acc.sales + Number(row.sales || 0),
      salesTarget: acc.salesTarget + Number(row.salesTarget || 0),
      upselling: acc.upselling + Number(row.upselling || 0),
      upsellingTarget: acc.upsellingTarget + Number(row.upsellingTarget || 0),
    }), {
      sales: 0,
      salesTarget: 0,
      upselling: 0,
      upsellingTarget: 0,
    })

    return [
      {
        key: 'i-com-1',
        code: 'I-COM-1',
        title: 'Nuevas Conexiones',
        chart: newConnectionsKpiChart,
        actual: totals.sales,
        target: totals.salesTarget,
        progress: calculateProgressSummary(totals.sales, totals.salesTarget, 'higher'),
      },
      {
        key: 'i-com-2',
        code: 'I-COM-2',
        title: 'Upselling de planes',
        chart: upsellingKpiChart,
        actual: totals.upselling,
        target: totals.upsellingTarget,
        progress: calculateProgressSummary(totals.upselling, totals.upsellingTarget, 'higher'),
      },
    ]
  }, [monthly, year, newConnectionsKpiChart, upsellingKpiChart])

  const planSeries = useMemo(() => {
    const planNames = topPlanRows.map((row) => row.planName)
    return planNames.length ? planNames : []
  }, [topPlanRows])

  const activePlansAmountChart = useMemo(() => ({
    labels: planMonthlyRows.map((row) => row.label),
    datasets: planSeries.map((planName, index) => ({
      label: planName,
      data: planMonthlyRows.map((row) => row.plans.find((plan) => plan.planName === planName)?.estimatedAmount || 0),
      borderColor: chartPalette[index % chartPalette.length],
      backgroundColor: chartPalette[index % chartPalette.length],
      tension: 0.32,
    })),
  }), [planMonthlyRows, planSeries])

  const activePlansCountChart = useMemo(() => ({
    labels: planMonthlyRows.map((row) => row.label),
    datasets: [
      ...planSeries.map((planName, index) => ({
        label: planName,
        data: planMonthlyRows.map((row) => row.plans.find((plan) => plan.planName === planName)?.connections || 0),
        backgroundColor: chartPalette[index % chartPalette.length],
      })),
      {
        label: 'Otros',
        data: planMonthlyRows.map((row) => row.plans.find((plan) => plan.planId === 'others')?.connections || 0),
        backgroundColor: '#c7d2e3',
      },
    ],
  }), [planMonthlyRows, planSeries])

  const averageTicketChart = useMemo(() => ({
    labels: planMonthlyRows.map((row) => row.label),
    datasets: [
      {
        label: 'Ticket promedio real',
        data: planMonthlyRows.map((row) => row.averageTicket || 0),
        borderColor: '#16213d',
        backgroundColor: '#16213d',
        tension: 0.35,
        yAxisID: 'y',
      },
      {
        label: 'Upselling cerrados',
        data: rows.map((row) => row.upselling ?? 0),
        borderColor: '#e30629',
        backgroundColor: '#e30629',
        tension: 0.35,
        yAxisID: 'y1',
      },
    ],
  }), [planMonthlyRows, rows])

  const topPlansTableRows = useMemo(() => topPlanRows.map((row) => ({
    key: row.planId,
    plan: row.planName,
    conexiones: row.totalConnections,
    montoEstimado: row.totalEstimatedAmount,
    ticketEstimado: row.averageEstimatedTicket,
    precio: row.lastPrice,
  })), [topPlanRows])

  const ticketColumns = useMemo(() => [
    {
      title: 'Categoria',
      dataIndex: 'categoryLabel',
      key: 'categoryLabel',
      filters: buildFilters(ticketRows, 'categoryLabel'),
      onFilter: (value, record) => record.categoryLabel === value,
    },
    {
      title: 'Estado',
      dataIndex: 'statusLabel',
      key: 'statusLabel',
      filters: buildFilters(ticketRows, 'statusLabel'),
      onFilter: (value, record) => record.statusLabel === value,
    },
    {
      title: 'Titulo',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Cliente',
      dataIndex: 'customerId',
      key: 'customerId',
      sorter: (a, b) => Number(a.customerId || 0) - Number(b.customerId || 0),
    },
    {
      title: 'Conexion',
      dataIndex: 'connectionId',
      key: 'connectionId',
      render: formatOptionalNumber,
      sorter: (a, b) => Number(a.connectionId || 0) - Number(b.connectionId || 0),
    },
    {
      title: 'Asignado',
      dataIndex: 'assignedUserId',
      key: 'assignedUserId',
      render: formatOptionalNumber,
      filters: buildFilters(ticketRows, 'assignedUserId'),
      onFilter: (value, record) => String(record.assignedUserId ?? '') === String(value),
    },
    {
      title: 'Fecha',
      dataIndex: 'created',
      key: 'created',
      render: formatDateShort,
      sorter: (a, b) => new Date(a.created) - new Date(b.created),
    },
  ], [ticketRows])

  const tabItems = [
    {
      key: 'resumen',
      label: 'Resumen',
      children: (
        <>
          <Row gutter={[16, 16]}>
            {summaryHighlights.map((item) => (
              <Col key={item.key} xs={24} md={12} xl={6}>
                <Card className="kpi-card-live">
                  <Statistic title={item.title} value={item.format === 'currency' ? formatMoney(item.value) : item.format === 'percent' ? `${item.value ?? '-'}%` : formatOptionalNumber(item.value)} />
                  <div className="kpi-meta">
                    <Text type="secondary">{item.subtitle}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="Evolucion mensual de conexiones activas y facturacion">
                <div className="chart-box"><Bar data={activeConnectionsAndBillingChart} options={commercialOverviewChartOptions} /></div>
                <div className="insights-list" style={{ marginTop: 12 }}>
                  <div className="insight-item">
                    <Text>La serie histórica de conexiones activas se reconstruye hacia atrás con altas (`created`) y salidas (`deleted_from` + `archived_from`) de la API.</Text>
                  </div>
                  <div className="insight-item">
                    <Text>La principal limitación pendiente son las conexiones que pasan a `enabled = 0` sin quedar borradas o archivadas, porque la API no expone todavía la fecha exacta de ese cambio.</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title="Evolucion mensual del proceso">
                <div className="chart-box"><Bar data={salesChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={`Acumulado ${yearToDateSummary.cutoffMonth === 12 && year !== currentYear ? 'anual' : 'YTD'} de ventas y bajas`}>
                <div className="summary-metrics-grid">
                  {yearToDateSummary.items.map((item) => (
                    <div key={item.key} className="summary-metric-item">
                      <Statistic title={item.title} value={formatOptionalNumber(item.value)} />
                      <Text type="secondary">{item.subtitle}</Text>
                    </div>
                  ))}
                </div>
                <div className="summary-breach-grid">
                  {yearToDateSummary.gaps.map((item) => (
                    <div key={item.key} className={`summary-breach-item is-${item.gap.status}`}>
                      <div className="summary-breach-head">
                        <Text strong>{item.title}</Text>
                        <Tag color={statusColor[item.gap.status] || 'default'}>{statusLabel[item.gap.status] || 'Info'}</Tag>
                      </div>
                      <div className="summary-breach-value">{formatSignedNumber(item.gap.deltaValue)}</div>
                      <div className="summary-breach-meta">{formatSignedPercent(item.gap.deltaPercent)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'kpi',
      label: 'KPI',
      children: (
        <>
          {processKpis.map((item) => (
            <Row key={item.key} gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} xl={16}>
                <Card title={`${item.code} ${item.title}`}>
                  <div className="chart-box"><Bar data={item.chart} options={baseChartOptions} /></div>
                </Card>
              </Col>
              <Col xs={24} xl={8}>
                <Card title={`Acumulado anual ${item.code}`}>
                  <div className="process-kpi-card">
                    <div className="process-kpi-card__eyebrow">{item.title}</div>
                    <div className="process-kpi-card__value">{formatOptionalNumber(item.progress.actual)}</div>
                    <div className="process-kpi-card__meta">
                      <span>Objetivo anual</span>
                      <strong>{formatOptionalNumber(item.progress.target)}</strong>
                    </div>
                    <div className={`process-kpi-card__progress is-${item.progress.status}`}>
                      <div className="process-kpi-card__progress-label">
                        <span>Avance</span>
                        <Tag color={statusColor[item.progress.status] || 'default'}>{statusLabel[item.progress.status] || 'Info'}</Tag>
                      </div>
                      <div className="process-kpi-card__progress-value">{formatProgressPercent(item.progress.advancePercent)}</div>
                      <div className="process-kpi-card__progress-meta">
                        Brecha {formatSignedNumber(item.progress.gap.deltaValue)} / {formatSignedPercent(item.progress.gap.deltaPercent)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          ))}
        </>
      ),
    },
    {
      key: 'data',
      label: 'Data',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <Card title="Comparativo del periodo">
                <Table
                  dataSource={comparisonRows}
                  pagination={false}
                  columns={[
                    { title: 'Metrica', dataIndex: 'metric', key: 'metric' },
                    { title: `${monthLabelMap[month]} ${year}`, dataIndex: 'current', key: 'current', render: formatOptionalNumber },
                    { title: compareYear ? `${monthLabelMap[month]} ${compareYear}` : 'Ano comparado', dataIndex: 'previous', key: 'previous', render: formatOptionalNumber },
                    { title: 'Variacion', key: 'delta', render: (_, row) => formatDelta(row.current, row.previous) },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={14}>
              <Card title="Mix comercial del periodo">
                <div className="chart-box"><Bar data={categoryDistribution} options={baseChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Ventas, bajas y comparativo anual">
                <div className="chart-box"><Bar data={salesChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title={`Comparacion anual de ${categoryLabelMap[category]} resuelto`}>
                <div className="chart-box"><Line data={categorySeriesChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title={`Evolucion mensual por estado: ${categoryLabelMap[category]}`}>
                <div className="chart-box"><Bar data={categoryStatusChart} options={stackedChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Detalle mensual del proceso">
                <Table
                  dataSource={monthlyTableRows}
                  columns={monthlyColumns}
                  pagination={{ pageSize: 6 }}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title="Planes activos mas facturados - monto estimado">
                <div className="chart-box"><Line data={activePlansAmountChart} options={currencyChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Evolucion del ticket promedio real">
                <div className="chart-box"><Line data={averageTicketChart} options={ticketVsUpsellingChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Gestiones comerciales por categoria y estado">
                <Table
                  dataSource={categoryStatusRows}
                  pagination={false}
                  columns={[
                    { title: 'Categoria', dataIndex: 'categoria', key: 'categoria' },
                    { title: 'Total', dataIndex: 'total', key: 'total', render: formatNumber },
                    { title: 'Pendiente', dataIndex: 'pending', key: 'pending', render: formatNumber },
                    { title: 'Resuelto', dataIndex: 'resolved', key: 'resolved', render: formatNumber },
                    { title: 'Seguimiento', dataIndex: 'followUp', key: 'followUp', render: formatNumber },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Planes activos por mes - cantidad">
                <div className="chart-box"><Bar data={activePlansCountChart} options={stackedChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Card title="Top planes del parque comercial">
            <Table
              dataSource={topPlansTableRows}
              pagination={false}
              columns={[
                { title: 'Plan', dataIndex: 'plan', key: 'plan' },
                { title: 'Conexiones activas acumuladas', dataIndex: 'conexiones', key: 'conexiones', render: formatNumber, sorter: numericSorter('conexiones') },
                { title: 'Monto estimado acumulado', dataIndex: 'montoEstimado', key: 'montoEstimado', render: formatMoney, sorter: numericSorter('montoEstimado') },
                { title: 'Ticket estimado', dataIndex: 'ticketEstimado', key: 'ticketEstimado', render: formatMoney, sorter: numericSorter('ticketEstimado') },
                { title: 'Precio del plan', dataIndex: 'precio', key: 'precio', render: formatMoney, sorter: numericSorter('precio') },
              ]}
            />
          </Card>
          <Card title="Detalle analitico filtrable">
            <Table
              dataSource={ticketRows.map((row) => ({ ...row, key: row.id }))}
              columns={ticketColumns}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      ),
    },
  ]

  const sectionAlerts = <SectionAlerts errors={[summaryError, monthlyError, compareError, ticketsError, planEvolutionError]} />

  return (
    <PageSection
      title="Comercial"
      subtitle="Proceso comercial reorganizado en Resumen, KPI y Data para separar desempeno de exploracion analitica."
      alerts={sectionAlerts}
      extra={
        <div className="field-row">
          <Select value={year} onChange={setYear} options={[{ value: 2026, label: 'Ano 2026' }, { value: 2025, label: 'Ano 2025' }]} style={{ width: 140 }} />
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 120 }} />
          <Select value={category} onChange={setCategory} options={commercialCategoryOptions} style={{ width: 170 }} />
          <Select value={compareYear} onChange={setCompareYear} allowClear placeholder="Comparar ano" options={[{ value: 2026, label: 'Comparar 2026' }, { value: 2025, label: 'Comparar 2025' }].filter((option) => option.value !== year)} style={{ width: 150 }} />
        </div>
      }
    >
      {loadingSummary || loadingMonthly || loadingCompare || loadingTickets || loadingPlanEvolution ? <CenteredSpinner /> : null}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </PageSection>
  )
}

function CobranzasPage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [paymentMode, setPaymentMode] = useState('amount')
  const [activeTab, setActiveTab] = useState('resumen')
  const { data: summary, loading: loadingSummary, error: summaryError } = useApi(`/api/cobranzas/summary?year=${year}&month=${month}`)
  const { data: monthly, loading: loadingMonthly, error: monthlyError } = useApi(`/api/cobranzas/monthly?year=${year}`)
  const { data: paymentMethods, loading: loadingPaymentMethods, error: paymentMethodsError } = useApi(`/api/cobranzas/payment-methods?year=${year}&month=${month}&mode=${paymentMode}`)
  const { data: localCommercialAnalysis, loading: loadingLocalAnalysis, error: localAnalysisError } = useApi(`/api/cobranzas/local-commercial-analysis?year=${year}&month=${month}&mode=${paymentMode}`)

  const rows = useMemo(() => (monthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    cobranza: row.collections,
    facturacion: row.billing,
    recibos: row.receiptsCount,
    tasa: row.collectionRate,
  })), [monthly])

  const localWeekRows = useMemo(() => (localCommercialAnalysis?.data?.weekly || []).map((row) => ({
    key: row.label,
    ...row,
  })), [localCommercialAnalysis])

  const localHeatmapRows = useMemo(() => (localCommercialAnalysis?.data?.heatmap || []).map((row) => ({
    key: row.label,
    ...row,
  })), [localCommercialAnalysis])

  const localMixRows = useMemo(() => (localCommercialAnalysis?.data?.mix || []).map((row) => ({
    key: row.label,
    metodo: row.label,
    cantidad: row.count,
    monto: row.amount,
    participacion: row.share,
    valor: row.value,
  })), [localCommercialAnalysis])

  const localDetailRows = useMemo(() => (localCommercialAnalysis?.data?.details || []).map((row) => ({
    key: row.key,
    semana: row.week,
    franja: row.timeSlot,
    metodo: row.method,
    cantidad: row.count,
    monto: row.amount,
    participacion: row.percentOfLocal,
  })), [localCommercialAnalysis])

  const paymentMethodMonthRows = useMemo(() => (paymentMethods?.data?.selectedMonth?.methods || []).map((row) => ({
    key: row.label,
    metodo: row.label,
    cantidad: row.count,
    monto: row.amount,
    valor: row.value,
  })), [paymentMethods])

  const paymentMethodMonthlyRows = useMemo(() => (paymentMethods?.data?.monthly || []).map((row) => ({
    key: row.month,
    mes: row.label,
    total: row.total,
    methods: row.methods,
  })), [paymentMethods])

  const collectionsChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Cobranza', data: rows.map((row) => row.cobranza), backgroundColor: '#e30629' },
      { label: 'Facturacion', data: rows.map((row) => row.facturacion), backgroundColor: '#f8c457' },
    ],
  }), [rows])

  const rateLine = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Cobrado sobre emitido %', data: rows.map((row) => row.tasa), borderColor: '#b90e2f', backgroundColor: '#b90e2f', tension: 0.35 },
      { label: 'Objetivo %', data: rows.map(() => 95), borderColor: '#14804a', backgroundColor: '#14804a', tension: 0.35 },
    ],
  }), [rows])

  const paymentMethodPieChart = useMemo(() => ({
    labels: paymentMethodMonthRows.map((row) => row.metodo),
    datasets: [
      {
        label: paymentMode === 'count' ? 'Cantidad de pagos' : 'Monto pagado',
        data: paymentMethodMonthRows.map((row) => row.valor),
        backgroundColor: ['#e30629', '#f59e0b', '#2563eb', '#14804a', '#7c3aed', '#6b7280', '#0f766e'],
      },
    ],
  }), [paymentMethodMonthRows, paymentMode])

  const paymentMethodEvolutionChart = useMemo(() => {
    const methodNames = paymentMethods?.data?.topMethods?.map((row) => row.label) || []
    return {
      labels: paymentMethodMonthlyRows.map((row) => row.mes),
      datasets: methodNames.map((methodName, index) => ({
        label: methodName,
        data: paymentMethodMonthlyRows.map((row) => row.methods.find((item) => item.label === methodName)?.value || 0),
        backgroundColor: chartPalette[index % chartPalette.length],
        borderColor: chartPalette[index % chartPalette.length],
        tension: 0.35,
      })),
    }
  }, [paymentMethodMonthlyRows, paymentMethods])

  const localCommercialWeekChart = useMemo(() => ({
    labels: localWeekRows.map((row) => row.label),
    datasets: [
      { label: 'Efectivo', data: localWeekRows.map((row) => row.efectivo), backgroundColor: '#e30629' },
      { label: 'Tarjeta de Débito', data: localWeekRows.map((row) => row.debito), backgroundColor: '#2563eb' },
      { label: 'Tarjeta de Crédito', data: localWeekRows.map((row) => row.credito), backgroundColor: '#f59e0b' },
    ],
  }), [localWeekRows])

  const localCommercialMixChart = useMemo(() => ({
    labels: localMixRows.map((row) => row.metodo),
    datasets: [
      {
        label: paymentMode === 'count' ? 'Cantidad de pagos' : 'Monto pagado',
        data: localMixRows.map((row) => row.valor),
        backgroundColor: ['#e30629', '#f59e0b', '#2563eb', '#14804a', '#7c3aed', '#6b7280', '#0f766e'],
      },
    ],
  }), [localMixRows, paymentMode])

  const pendingPeriodRows = (summary?.data?.pendingByPeriod || []).map((row) => ({
    key: row.label,
    periodo: row.label,
    pendiente: row.total,
  }))

  const summaryHighlights = [
    {
      key: 'cobranza',
      title: 'Cobranza del mes',
      value: summary?.data?.kpis?.find((item) => item.id === 'collectionsMonth')?.value,
      subtitle: `Recibos del periodo ${monthLabelMap[month]} ${year}`,
      format: 'currency',
    },
    {
      key: 'tasa',
      title: 'Cobrado sobre emitido',
      value: summary?.data?.kpis?.find((item) => item.id === 'collectionRate')?.value,
      subtitle: 'Tasa de recupero mensual',
      format: 'percent',
    },
    {
      key: 'pendiente',
      title: 'Saldo pendiente',
      value: summary?.data?.kpis?.find((item) => item.id === 'pendingBalance')?.value,
      subtitle: 'Cartera abierta actual',
      format: 'currency',
    },
    {
      key: 'compromisos',
      title: 'Compromisos vigentes',
      value: summary?.data?.kpis?.find((item) => item.id === 'openCommitments')?.value,
      subtitle: 'Promesas activas',
    },
  ]

  const monthlyColumns = [
    {
      title: 'Mes',
      dataIndex: 'mes',
      key: 'mes',
      filters: buildFilters(rows, 'mes'),
      onFilter: (value, record) => record.mes === value,
    },
    { title: 'Cobranza', dataIndex: 'cobranza', key: 'cobranza', render: formatMoney, sorter: numericSorter('cobranza') },
    { title: 'Facturacion', dataIndex: 'facturacion', key: 'facturacion', render: formatMoney, sorter: numericSorter('facturacion') },
    { title: 'Recibos', dataIndex: 'recibos', key: 'recibos', render: formatNumber, sorter: numericSorter('recibos') },
    { title: 'Cobrado / emitido', dataIndex: 'tasa', key: 'tasa', render: (value) => `${value}%`, sorter: numericSorter('tasa') },
  ]

  const tabs = [
    {
      key: 'resumen',
      label: 'Resumen',
      children: (
        <>
          <Row gutter={[16, 16]}>
            {summaryHighlights.map((item) => (
              <Col key={item.key} xs={24} md={12} xl={6}>
                <Card className="kpi-card-live">
                  <Statistic title={item.title} value={item.format === 'currency' ? formatOptionalMoney(item.value) : item.format === 'percent' ? `${item.value ?? '-'}%` : formatOptionalNumber(item.value)} />
                  <div className="kpi-meta">
                    <Text type="secondary">{item.subtitle}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <Card title="Cobranza vs facturacion mensual">
                <div className="chart-box"><Bar data={collectionsChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card title="Lectura ejecutiva">
                <div className="insights-list">
                  {(summary?.data?.insights || []).map((item) => (
                    <div key={item} className="insight-item"><Text>{item}</Text></div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'kpi',
      label: 'KPI',
      children: (
        <>
          <KpiGrid items={summary?.data?.kpis || []} />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Cobranza vs facturacion mensual">
                <div className="chart-box"><Bar data={collectionsChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Tasa de cobro mensual">
                <div className="chart-box"><Line data={rateLine} options={baseChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Card title="Detalle mensual de cobranzas">
            <Table dataSource={rows} columns={monthlyColumns} pagination={{ pageSize: 6 }} />
          </Card>
        </>
      ),
    },
    {
      key: 'data',
      label: 'Data',
      children: (
        <>
          <Card title="Analisis de cobros en el local comercial" style={{ marginBottom: 16 }}>
            <Paragraph style={{ marginBottom: 0 }}>
              Cobros presenciales filtrados solo por <strong>Efectivo</strong>, <strong>Tarjeta de Débito</strong> y <strong>Tarjeta de Crédito</strong>,
              con lectura por {paymentMode === 'count' ? 'cantidad de pagos' : 'monto pagado'}.
            </Paragraph>
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <Card title={`Medios de pago del mes (${paymentMode === 'count' ? 'cantidad' : 'monto'})`}>
                <div className="chart-box"><Doughnut data={paymentMethodPieChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={14}>
              <Card title={`Evolucion mensual por metodo de pago (${paymentMode === 'count' ? 'cantidad de pagos' : 'monto pagado'})`}>
                <div className="chart-box"><Bar data={paymentMethodEvolutionChart} options={stackedChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <Card title="Cartera pendiente por periodo">
                <Table
                  size="small"
                  pagination={false}
                  dataSource={pendingPeriodRows}
                  columns={[
                    { title: 'Periodo', dataIndex: 'periodo', key: 'periodo', filters: buildFilters(pendingPeriodRows, 'periodo'), onFilter: (value, record) => record.periodo === value },
                    { title: 'Saldo', dataIndex: 'pendiente', key: 'pendiente', render: formatMoney, sorter: numericSorter('pendiente') },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={14}>
              <Card title="Comparativos del proceso">
                <Table
                  pagination={false}
                  dataSource={rows.map((row) => ({ ...row, key: row.mes }))}
                  columns={[
                    { title: 'Mes', dataIndex: 'mes', key: 'mes' },
                    { title: 'Cobranza', dataIndex: 'cobranza', key: 'cobranza', render: formatMoney },
                    { title: 'Facturacion', dataIndex: 'facturacion', key: 'facturacion', render: formatMoney },
                    { title: 'Tasa', dataIndex: 'tasa', key: 'tasa', render: (value) => `${value}%` },
                  ]}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title={`Distribucion por semana del mes (${paymentMode === 'count' ? 'cantidad' : 'monto'})`}>
                <div className="chart-box"><Bar data={localCommercialWeekChart} options={stackedChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title={`Mix de medios del local (${paymentMode === 'count' ? 'cantidad' : 'monto'})`}>
                <div className="chart-box"><Doughnut data={localCommercialMixChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title={`Concentracion por horario (${paymentMode === 'count' ? 'cantidad' : 'monto'})`}>
                <Table
                  className="compact-heatmap-table"
                  size="small"
                  pagination={false}
                  dataSource={localHeatmapRows}
                  columns={[
                    { title: 'Semana', dataIndex: 'label', key: 'label', width: 86 },
                    ...['08-10', '10-12', '12-14', '14-16', '16-18', '18-20', 'Otro'].map((slot) => ({
                      title: slot,
                      dataIndex: slot,
                      key: slot,
                      render: (value) => renderHeatCell(value, localHeatmapRows, paymentMode),
                      sorter: numericSorter(slot),
                      width: slot === 'Otro' ? 62 : 68,
                      align: 'right',
                    })),
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title={`Mix de medios del local - detalle`}>
                <Table
                  pagination={false}
                  dataSource={localMixRows}
                  columns={[
                    { title: 'Medio', dataIndex: 'metodo', key: 'metodo', filters: buildFilters(localMixRows, 'metodo'), onFilter: (value, record) => record.metodo === value },
                    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', render: formatNumber, sorter: numericSorter('cantidad') },
                    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: formatMoney, sorter: numericSorter('monto') },
                    { title: '% del total local', dataIndex: 'participacion', key: 'participacion', render: (value) => `${value}%`, sorter: numericSorter('participacion') },
                  ]}
                />
              </Card>
            </Col>
          </Row>
          <Card title={`Tabla analitica del local - ${monthLabelMap[month]} ${year}`}>
            <Table
              dataSource={localDetailRows}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: 'Semana', dataIndex: 'semana', key: 'semana', filters: buildFilters(localDetailRows, 'semana'), onFilter: (value, record) => record.semana === value },
                { title: 'Franja horaria', dataIndex: 'franja', key: 'franja', filters: buildFilters(localDetailRows, 'franja'), onFilter: (value, record) => record.franja === value },
                { title: 'Medio', dataIndex: 'metodo', key: 'metodo', filters: buildFilters(localDetailRows, 'metodo'), onFilter: (value, record) => record.metodo === value },
                { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad', render: formatNumber, sorter: numericSorter('cantidad') },
                { title: 'Monto', dataIndex: 'monto', key: 'monto', render: formatMoney, sorter: numericSorter('monto') },
                { title: '% del total local', dataIndex: 'participacion', key: 'participacion', render: (value) => `${value}%`, sorter: numericSorter('participacion') },
              ]}
            />
          </Card>
        </>
      ),
    },
  ]

  const sectionAlerts = <SectionAlerts errors={[summaryError, monthlyError, paymentMethodsError, localAnalysisError]} />

  return (
    <PageSection
      title="Cobranzas"
      subtitle="Proceso reorganizado en Resumen, KPI y Data para mantener una lectura clara, profesional y consistente."
      alerts={sectionAlerts}
      extra={
        <div className="field-row">
          <Select value={year} onChange={setYear} options={[{ value: 2026, label: 'Ano 2026' }, { value: 2025, label: 'Ano 2025' }]} style={{ width: 140 }} />
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 120 }} />
          <Select
            value={paymentMode}
            onChange={setPaymentMode}
            options={[
              { value: 'amount', label: 'Ver por monto' },
              { value: 'count', label: 'Ver por cantidad' },
            ]}
            style={{ width: 160 }}
          />
        </div>
      }
    >
      {loadingSummary || loadingMonthly || loadingPaymentMethods || loadingLocalAnalysis ? <CenteredSpinner /> : null}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
    </PageSection>
  )
}

function PlantaExteriorPage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [activeTab, setActiveTab] = useState('resumen')
  const { data: summary, loading: loadingSummary, error: summaryError } = useApi(`/api/planta-exterior/summary?year=${year}&month=${month}`)
  const { data: monthly, loading: loadingMonthly, error: monthlyError } = useApi(`/api/planta-exterior/monthly?year=${year}`)
  const { data: breaches, loading: loadingBreaches, error: breachesError } = useApi(`/api/planta-exterior/breaches?year=${year}&month=${month}`)

  const rows = useMemo(() => (monthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    creados: row.created,
    realizados: row.resolved,
    demora: row.averageBusinessDays,
    objetivo: row.slaTarget,
    fueraObjetivo: row.delayed,
    tasaFueraObjetivo: row.delayedRate,
    cumplimiento: Number(row.resolved || 0) > 0
      ? Math.round((((Number(row.resolved || 0) - Number(row.delayed || 0)) / Number(row.resolved || 0)) * 100) * 10) / 10
      : null,
    categories: row.categories,
  })), [monthly])

  const summaryHighlights = [
    {
      key: 'realizados',
      title: 'Realizados del mes',
      value: summary?.data?.kpis?.find((item) => item.id === 'plantaResolvedMonth')?.value,
      subtitle: 'Tickets resueltos por modified',
    },
    {
      key: 'demora',
      title: 'Demora promedio',
      value: summary?.data?.kpis?.find((item) => item.id === 'plantaAvgDelay')?.value,
      subtitle: 'Dias habiles promedio',
      format: 'days',
    },
    {
      key: 'vencidos',
      title: 'Fuera de objetivo',
      value: summary?.data?.kpis?.find((item) => item.id === 'plantaDelayedMonth')?.value,
      subtitle: 'Casos > 7 dias habiles',
    },
    {
      key: 'abiertos',
      title: 'Abiertos vencidos',
      value: summary?.data?.kpis?.find((item) => item.id === 'plantaOpenOverdue')?.value,
      subtitle: 'Casos abiertos fuera de SLA',
    },
  ]

  const resolvedChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Realizados', data: rows.map((row) => row.realizados), backgroundColor: '#e30629' },
      { label: 'Ingresados', data: rows.map((row) => row.creados), backgroundColor: '#f8c457' },
    ],
  }), [rows])

  const delayChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Demora promedio', data: rows.map((row) => row.demora), borderColor: '#b90e2f', backgroundColor: '#b90e2f', tension: 0.35 },
      { label: 'Objetivo SLA', data: rows.map((row) => row.objetivo), borderColor: '#14804a', backgroundColor: '#14804a', tension: 0.35 },
    ],
  }), [rows])

  const delayedChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Fuera de objetivo', data: rows.map((row) => row.fueraObjetivo), backgroundColor: '#b42318' },
      { label: '% fuera de objetivo', data: rows.map((row) => row.tasaFueraObjetivo), type: 'line', borderColor: '#374151', backgroundColor: '#374151', tension: 0.35, yAxisID: 'y1' },
    ],
  }), [rows])

  const installationComplianceChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        label: 'Cumplimiento SLA',
        data: rows.map((row) => row.cumplimiento),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
      {
        label: 'Objetivo SLA',
        data: rows.map(() => 80),
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  }), [rows])

  const installationKpiSummary = useMemo(() => {
    const cutoffMonth = year === currentYear ? currentMonth : 12
    const yearRows = rows.filter((row) => Number(row.key) <= cutoffMonth)
    const totals = yearRows.reduce((acc, row) => ({
      realizados: acc.realizados + Number(row.realizados || 0),
      fueraObjetivo: acc.fueraObjetivo + Number(row.fueraObjetivo || 0),
    }), {
      realizados: 0,
      fueraObjetivo: 0,
    })

    const compliance = totals.realizados > 0
      ? Math.round((((totals.realizados - totals.fueraObjetivo) / totals.realizados) * 100) * 10) / 10
      : 0

    return {
      code: 'I-INS-1',
      title: 'Tiempos de instalacion',
      cutoffMonth,
      progress: calculateProgressSummary(compliance, 80, 'higher'),
    }
  }, [rows, year])

  const breachesRows = (breaches?.data || []).map((row) => ({
    ...row,
    key: row.id,
  }))

  const breachColumns = [
    {
      title: 'Ticket',
      dataIndex: 'id',
      key: 'id',
      render: formatNumber,
      sorter: numericSorter('id'),
    },
    {
      title: 'Categoria',
      dataIndex: 'categoryLabel',
      key: 'categoryLabel',
      filters: buildFilters(breachesRows, 'categoryLabel'),
      onFilter: (value, record) => record.categoryLabel === value,
    },
    {
      title: 'Estado',
      dataIndex: 'statusLabel',
      key: 'statusLabel',
      filters: buildFilters(breachesRows, 'statusLabel'),
      onFilter: (value, record) => record.statusLabel === value,
    },
    {
      title: 'Cliente',
      dataIndex: 'customerId',
      key: 'customerId',
      render: formatOptionalNumber,
      sorter: numericSorter('customerId'),
    },
    {
      title: 'Nombre',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (value) => value || '-',
      filters: buildFilters(breachesRows, 'customerName'),
      onFilter: (value, record) => (record.customerName || '-') === value,
    },
    {
      title: 'Conexion',
      dataIndex: 'connectionId',
      key: 'connectionId',
      render: formatOptionalNumber,
      sorter: numericSorter('connectionId'),
    },
    {
      title: 'Creado',
      dataIndex: 'created',
      key: 'created',
      render: formatDateShort,
      sorter: (a, b) => new Date(a.created) - new Date(b.created),
    },
    {
      title: 'Cierre',
      dataIndex: 'modified',
      key: 'modified',
      render: formatDateShort,
      sorter: (a, b) => new Date(a.modified) - new Date(b.modified),
    },
    {
      title: 'Dias habiles',
      dataIndex: 'businessDays',
      key: 'businessDays',
      render: formatNumber,
      sorter: numericSorter('businessDays'),
    },
  ]

  const tabs = [
    {
      key: 'resumen',
      label: 'Resumen',
      children: (
        <>
          <Row gutter={[16, 16]}>
            {summaryHighlights.map((item) => (
              <Col key={item.key} xs={24} md={12} xl={6}>
                <Card className="kpi-card-live">
                  <Statistic title={item.title} value={item.format === 'days' ? `${item.value ?? '-'} dias` : formatOptionalNumber(item.value)} />
                  <div className="kpi-meta">
                    <Text type="secondary">{item.subtitle}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title="Cantidad realizada por mes">
                <div className="chart-box"><Bar data={resolvedChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Lectura ejecutiva">
                <div className="insights-list">
                  {(summary?.data?.insights || []).map((item) => (
                    <div key={item} className="insight-item"><Text>{item}</Text></div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'kpi',
      label: 'KPI',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title="I-INS-1 Tiempos de instalacion">
                <div className="chart-box"><Line data={installationComplianceChart} options={percentChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Acumulado anual I-INS-1">
                <div className="process-kpi-card">
                  <div className="process-kpi-card__eyebrow">{installationKpiSummary.title}</div>
                  <div className="process-kpi-card__value">{formatProgressPercent(installationKpiSummary.progress.actual)}</div>
                  <div className="process-kpi-card__meta">
                    <span>Objetivo anual</span>
                    <strong>{formatProgressPercent(installationKpiSummary.progress.target)}</strong>
                  </div>
                  <div className={`process-kpi-card__progress is-${installationKpiSummary.progress.status}`}>
                    <div className="process-kpi-card__progress-label">
                      <span>Avance</span>
                      <Tag color={statusColor[installationKpiSummary.progress.status] || 'default'}>{statusLabel[installationKpiSummary.progress.status] || 'Info'}</Tag>
                    </div>
                    <div className="process-kpi-card__progress-value">{formatProgressPercent(installationKpiSummary.progress.advancePercent)}</div>
                    <div className="process-kpi-card__progress-meta">
                      Brecha {formatSignedPercent(installationKpiSummary.progress.gap.deltaValue)} / {formatSignedPercent(installationKpiSummary.progress.gap.deltaPercent)}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'data',
      label: 'Data',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Demora promedio por mes">
                <div className="chart-box"><Line data={delayChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Casos fuera de objetivo por mes">
                <div className="chart-box"><Bar data={delayedChart} options={dualAxisChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Card title="Resumen mensual de Planta Exterior" style={{ marginBottom: 16 }}>
            <Table
              dataSource={rows}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Mes', dataIndex: 'mes', key: 'mes', filters: buildFilters(rows, 'mes'), onFilter: (value, record) => record.mes === value },
                { title: 'Ingresados', dataIndex: 'creados', key: 'creados', render: formatNumber, sorter: numericSorter('creados') },
                { title: 'Realizados', dataIndex: 'realizados', key: 'realizados', render: formatNumber, sorter: numericSorter('realizados') },
                { title: 'Cumplimiento SLA', dataIndex: 'cumplimiento', key: 'cumplimiento', render: (value) => value === null || value === undefined ? '-' : `${value}%`, sorter: numericSorter('cumplimiento') },
                { title: 'Demora promedio', dataIndex: 'demora', key: 'demora', render: (value) => `${value} dias`, sorter: numericSorter('demora') },
                { title: 'SLA', dataIndex: 'objetivo', key: 'objetivo', render: (value) => `${value} dias` },
                { title: 'Fuera objetivo', dataIndex: 'fueraObjetivo', key: 'fueraObjetivo', render: formatNumber, sorter: numericSorter('fueraObjetivo') },
              ]}
            />
          </Card>
          <Card title="Casos fuera del objetivo">
            <Table
              dataSource={breachesRows}
              columns={breachColumns}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </>
      ),
    },
  ]

  const sectionAlerts = <SectionAlerts errors={[summaryError, monthlyError, breachesError]} />

  return (
    <PageSection
      title="Planta Exterior"
      subtitle="Instalaciones, Wireless a Fibra y cambio de domicilio con foco en realizados, demora y cumplimiento del SLA de 7 dias habiles."
      alerts={sectionAlerts}
      extra={
        <div className="field-row">
          <Select value={year} onChange={setYear} options={[{ value: 2026, label: 'Ano 2026' }, { value: 2025, label: 'Ano 2025' }]} style={{ width: 140 }} />
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 120 }} />
        </div>
      }
    >
      {loadingSummary || loadingMonthly || loadingBreaches ? <CenteredSpinner /> : null}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
    </PageSection>
  )
}

function SoportePage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [activeTab, setActiveTab] = useState('resumen')
  const [dataFrom, setDataFrom] = useState(getMonthStartInputValue(currentYear, currentMonth))
  const [dataUntil, setDataUntil] = useState(getMonthEndInputValue(currentYear, currentMonth))
  const [recurrenceFrom, setRecurrenceFrom] = useState(getMonthStartInputValue(currentYear, currentMonth))
  const [recurrenceUntil, setRecurrenceUntil] = useState(getMonthEndInputValue(currentYear, currentMonth))
  const { data: summary, loading: loadingSummary, error: summaryError } = useApi(`/api/soporte/summary?year=${year}&month=${month}`)
  const { data: monthly, loading: loadingMonthly, error: monthlyError } = useApi(`/api/soporte/monthly?year=${year}`)
  const { data: incidents, loading: loadingIncidents, error: incidentsError } = useApi(`/api/soporte/incidents?year=${year}&month=${month}&from=${dataFrom}&until=${dataUntil}`)
  const { data: breaches, loading: loadingBreaches, error: breachesError } = useApi(`/api/soporte/breaches?year=${year}&month=${month}&from=${dataFrom}&until=${dataUntil}`)
  const { data: recurrence, loading: loadingRecurrence, error: recurrenceError } = useApi(recurrenceFrom && recurrenceUntil ? `/api/soporte/recurrence?from=${recurrenceFrom}&until=${recurrenceUntil}` : null)

  useEffect(() => {
    setDataFrom(getMonthStartInputValue(year, month))
    setDataUntil(getMonthEndInputValue(year, month))
    setRecurrenceFrom(getMonthStartInputValue(year, month))
    setRecurrenceUntil(getMonthEndInputValue(year, month))
  }, [year, month])

  const rows = useMemo(() => (monthly?.data || []).map((row) => ({
    key: row.month,
    mes: row.label,
    ingresados: row.opened,
    resueltos: row.resolved,
    demora: row.averageHours,
    objetivo: row.slaTarget,
    fueraObjetivo: row.delayed,
    cumplimiento: row.slaCompliance,
    categories: row.categories,
  })), [monthly])

  const summaryHighlights = [
    {
      key: 'resueltos',
      title: 'Resueltos del mes',
      value: summary?.data?.kpis?.find((item) => item.id === 'supportResolved')?.value,
      subtitle: 'Tickets cerrados en el periodo',
    },
    {
      key: 'demora',
      title: 'Demora promedio',
      value: summary?.data?.kpis?.find((item) => item.id === 'supportAvgHours')?.value,
      subtitle: 'Horas promedio de resolucion',
      format: 'hours',
    },
    {
      key: 'cumplimiento',
      title: 'Cumplimiento SLA',
      value: summary?.data?.kpis?.find((item) => item.id === 'supportSlaCompliance')?.value,
      subtitle: 'Resueltos dentro de 48 hs',
      format: 'percent',
    },
    {
      key: 'vencidos',
      title: 'Fuera de SLA',
      value: summary?.data?.kpis?.find((item) => item.id === 'supportDelayedMonth')?.value,
      subtitle: 'Casos cerrados fuera de 48 hs',
    },
  ]

  const volumeChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Ingresados', data: rows.map((row) => row.ingresados), backgroundColor: '#e30629' },
      { label: 'Resueltos', data: rows.map((row) => row.resueltos), backgroundColor: '#14804a' },
    ],
  }), [rows])

  const delayChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Demora promedio (hs)', data: rows.map((row) => row.demora), borderColor: '#b90e2f', backgroundColor: '#b90e2f', tension: 0.35 },
      { label: 'Objetivo SLA (hs)', data: rows.map((row) => row.objetivo), borderColor: '#14804a', backgroundColor: '#14804a', tension: 0.35 },
    ],
  }), [rows])

  const slaChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      { label: 'Fuera de SLA', data: rows.map((row) => row.fueraObjetivo), backgroundColor: '#b42318' },
      { label: 'Cumplimiento SLA %', data: rows.map((row) => row.cumplimiento), type: 'line', borderColor: '#374151', backgroundColor: '#374151', tension: 0.35, yAxisID: 'y1' },
    ],
  }), [rows])

  const supportComplianceChart = useMemo(() => ({
    labels: rows.map((row) => row.mes),
    datasets: [
      {
        label: 'Cumplimiento SLA',
        data: rows.map((row) => row.cumplimiento),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
      {
        label: 'Objetivo SLA',
        data: rows.map(() => 80),
        borderColor: '#14804a',
        backgroundColor: '#14804a',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  }), [rows])

  const supportKpiSummary = useMemo(() => {
    const cutoffMonth = year === currentYear ? currentMonth : 12
    const yearRows = rows.filter((row) => Number(row.key) <= cutoffMonth)
    const totals = yearRows.reduce((acc, row) => ({
      resueltos: acc.resueltos + Number(row.resueltos || 0),
      fueraObjetivo: acc.fueraObjetivo + Number(row.fueraObjetivo || 0),
    }), {
      resueltos: 0,
      fueraObjetivo: 0,
    })

    const compliance = totals.resueltos > 0
      ? Math.round((((totals.resueltos - totals.fueraObjetivo) / totals.resueltos) * 100) * 10) / 10
      : 0

    return {
      code: 'I-SOP-1',
      title: 'Tiempo de respuesta',
      progress: calculateProgressSummary(compliance, 80, 'higher'),
    }
  }, [rows, year])

  const incidentsRows = (incidents?.data || []).map((row) => ({
    key: row.date,
    fecha: row.date,
    tickets: row.tickets,
    clientes: row.customers,
    ticketsPorCliente: row.ticketsPerCustomer,
    reclamos: row.reclamo,
    soporte: row.soporte,
  }))

  const incidentsChart = useMemo(() => ({
    labels: incidentsRows.map((row) => formatDateShort(row.fecha)),
    datasets: [
      { label: 'Tickets reportados', data: incidentsRows.map((row) => row.tickets), backgroundColor: '#e30629' },
      { label: 'Clientes afectados', data: incidentsRows.map((row) => row.clientes), type: 'line', borderColor: '#1d4ed8', backgroundColor: '#1d4ed8', tension: 0.35, yAxisID: 'y1' },
    ],
  }), [incidentsRows])

  const recurrenceBuckets = (recurrence?.data?.buckets || []).map((row) => ({
    key: row.label,
    bucket: row.label,
    customers: row.customers,
  }))

  const recurrenceChart = useMemo(() => ({
    labels: recurrenceBuckets.map((row) => row.bucket),
    datasets: [
      { label: 'Clientes', data: recurrenceBuckets.map((row) => row.customers), backgroundColor: '#e30629' },
    ],
  }), [recurrenceBuckets])

  const recurringCustomersRows = (recurrence?.data?.recurringCustomers || []).map((row) => ({
    key: `${row.customerId}-${row.lastTicket}`,
    cliente: row.customerId,
    nombre: row.customerName,
    tickets: row.ticketCount,
    primerTicket: row.firstTicket,
    ultimoTicket: row.lastTicket,
    inicioServicio: row.serviceStartDate,
    bloqueadoFaltaPago: row.blockedByLackOfPayment,
    estados: row.statuses,
    conexiones: row.connections,
    alerta: row.severity,
  }))

  const categoryRows = (summary?.data?.byCategory || []).map((row) => ({
    key: row.label,
    categoria: row.label,
    resueltos: row.value,
  }))

  const breachesRows = (breaches?.data || []).map((row) => ({
    ...row,
    key: row.id,
  }))

  const breachColumns = [
    {
      title: 'Ticket',
      dataIndex: 'id',
      key: 'id',
      render: formatNumber,
      sorter: numericSorter('id'),
    },
    {
      title: 'Categoria',
      dataIndex: 'categoryLabel',
      key: 'categoryLabel',
      filters: buildFilters(breachesRows, 'categoryLabel'),
      onFilter: (value, record) => record.categoryLabel === value,
    },
    {
      title: 'Estado',
      dataIndex: 'statusLabel',
      key: 'statusLabel',
      filters: buildFilters(breachesRows, 'statusLabel'),
      onFilter: (value, record) => record.statusLabel === value,
    },
    {
      title: 'Cliente',
      dataIndex: 'customerId',
      key: 'customerId',
      render: formatOptionalNumber,
      sorter: numericSorter('customerId'),
    },
    {
      title: 'Conexion',
      dataIndex: 'connectionId',
      key: 'connectionId',
      render: formatOptionalNumber,
      sorter: numericSorter('connectionId'),
    },
    {
      title: 'Creado',
      dataIndex: 'created',
      key: 'created',
      render: formatDateShort,
      sorter: (a, b) => new Date(a.created) - new Date(b.created),
    },
    {
      title: 'Cierre',
      dataIndex: 'modified',
      key: 'modified',
      render: formatDateShort,
      sorter: (a, b) => new Date(a.modified) - new Date(b.modified),
    },
    {
      title: 'Horas',
      dataIndex: 'hoursElapsed',
      key: 'hoursElapsed',
      render: formatNumber,
      sorter: numericSorter('hoursElapsed'),
    },
  ]

  const tabs = [
    {
      key: 'resumen',
      label: 'Resumen',
      children: (
        <>
          <Row gutter={[16, 16]}>
            {summaryHighlights.map((item) => (
              <Col key={item.key} xs={24} md={12} xl={6}>
                <Card className="kpi-card-live">
                  <Statistic title={item.title} value={item.format === 'hours' ? `${item.value ?? '-'} hs` : item.format === 'percent' ? `${item.value ?? '-'}%` : formatOptionalNumber(item.value)} />
                  <div className="kpi-meta">
                    <Text type="secondary">{item.subtitle}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card title="Ingresados y resueltos por mes">
                <div className="chart-box"><Bar data={volumeChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Lectura ejecutiva">
                <div className="insights-list">
                  {(summary?.data?.insights || []).map((item) => (
                    <div key={item} className="insight-item"><Text>{item}</Text></div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'kpi',
      label: 'KPI',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title="I-SOP-1 Tiempo de respuesta">
                <div className="chart-box"><Line data={supportComplianceChart} options={percentChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Acumulado anual I-SOP-1">
                <div className="process-kpi-card">
                  <div className="process-kpi-card__eyebrow">{supportKpiSummary.title}</div>
                  <div className="process-kpi-card__value">{formatProgressPercent(supportKpiSummary.progress.actual)}</div>
                  <div className="process-kpi-card__meta">
                    <span>Objetivo anual</span>
                    <strong>{formatProgressPercent(supportKpiSummary.progress.target)}</strong>
                  </div>
                  <div className={`process-kpi-card__progress is-${supportKpiSummary.progress.status}`}>
                    <div className="process-kpi-card__progress-label">
                      <span>Avance</span>
                      <Tag color={statusColor[supportKpiSummary.progress.status] || 'default'}>{statusLabel[supportKpiSummary.progress.status] || 'Info'}</Tag>
                    </div>
                    <div className="process-kpi-card__progress-value">{formatProgressPercent(supportKpiSummary.progress.advancePercent)}</div>
                    <div className="process-kpi-card__progress-meta">
                      Brecha {formatSignedPercent(supportKpiSummary.progress.gap.deltaValue)} / {formatSignedPercent(supportKpiSummary.progress.gap.deltaPercent)}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'data',
      label: 'Data',
      children: (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card
                title="Recurrencia de reclamos por cliente"
                extra={(
                  <div className="field-row">
                    <Input type="date" value={recurrenceFrom} onChange={(event) => setRecurrenceFrom(event.target.value)} style={{ width: 160 }} />
                    <Input type="date" value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} style={{ width: 160 }} />
                  </div>
                )}
              >
                {loadingRecurrence ? <CenteredSpinner /> : null}
                <Table
                  dataSource={recurringCustomersRows}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 1650 }}
                  columns={[
                    { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', width: 120, render: formatOptionalNumber, sorter: numericSorter('cliente') },
                    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 260, filters: buildFilters(recurringCustomersRows, 'nombre'), onFilter: (value, record) => record.nombre === value, render: (value) => value || '-' },
                    { title: 'Reclamos', dataIndex: 'tickets', key: 'tickets', width: 110, render: formatNumber, sorter: numericSorter('tickets') },
                    { title: 'Primer ticket', dataIndex: 'primerTicket', key: 'primerTicket', width: 145, render: formatDateShort, sorter: (a, b) => new Date(a.primerTicket) - new Date(b.primerTicket) },
                    { title: 'Ultimo ticket', dataIndex: 'ultimoTicket', key: 'ultimoTicket', width: 145, render: formatDateShort, sorter: (a, b) => new Date(a.ultimoTicket) - new Date(b.ultimoTicket) },
                    { title: 'Inicio servicio', dataIndex: 'inicioServicio', key: 'inicioServicio', width: 150, render: formatDateShort, sorter: (a, b) => new Date(a.inicioServicio || 0) - new Date(b.inicioServicio || 0) },
                    { title: 'Bloq. falta pago', dataIndex: 'bloqueadoFaltaPago', key: 'bloqueadoFaltaPago', width: 160, filters: [{ text: 'Si', value: 'Si' }, { text: 'No', value: 'No' }, { text: 'Sin dato', value: 'Sin dato' }], onFilter: (value, record) => formatBlockedStatus(record.bloqueadoFaltaPago) === value, render: (value) => <Tag color={value === true ? 'red' : value === false ? 'green' : 'default'}>{formatBlockedStatus(value)}</Tag> },
                    { title: 'Conexiones', dataIndex: 'conexiones', key: 'conexiones', width: 120, render: formatNumber, sorter: numericSorter('conexiones') },
                    { title: 'Estados', dataIndex: 'estados', key: 'estados', width: 220 },
                    { title: 'Alerta', dataIndex: 'alerta', key: 'alerta', width: 120, filters: buildFilters(recurringCustomersRows, 'alerta'), onFilter: (value, record) => record.alerta === value, render: (value) => <Tag color={value === 'Critico' ? 'red' : value === 'Atencion' ? 'orange' : 'blue'}>{value}</Tag> },
                  ]}
                />
                <div style={{ marginTop: 16 }}>
                  <div className="chart-box"><Bar data={recurrenceChart} options={baseChartOptions} /></div>
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Demora promedio por mes">
                <div className="chart-box"><Line data={delayChart} options={baseChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Cumplimiento y casos fuera de SLA">
                <div className="chart-box"><Bar data={slaChart} options={dualAxisChartOptions} /></div>
              </Card>
            </Col>
          </Row>
          <Card title="Resumen mensual de soporte" style={{ marginBottom: 16 }}>
            <Table
              dataSource={rows}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Mes', dataIndex: 'mes', key: 'mes', filters: buildFilters(rows, 'mes'), onFilter: (value, record) => record.mes === value },
                { title: 'Ingresados', dataIndex: 'ingresados', key: 'ingresados', render: formatNumber, sorter: numericSorter('ingresados') },
                { title: 'Resueltos', dataIndex: 'resueltos', key: 'resueltos', render: formatNumber, sorter: numericSorter('resueltos') },
                { title: 'Demora promedio', dataIndex: 'demora', key: 'demora', render: (value) => `${value} hs`, sorter: numericSorter('demora') },
                { title: 'SLA', dataIndex: 'objetivo', key: 'objetivo', render: (value) => `${value} hs` },
                { title: 'Fuera SLA', dataIndex: 'fueraObjetivo', key: 'fueraObjetivo', render: formatNumber, sorter: numericSorter('fueraObjetivo') },
                { title: 'Cumplimiento', dataIndex: 'cumplimiento', key: 'cumplimiento', render: (value) => `${value}%`, sorter: numericSorter('cumplimiento') },
              ]}
            />
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card
                title="Posibles incidentes por dia"
                extra={(
                  <div className="field-row">
                    <Input type="date" value={dataFrom} onChange={(event) => setDataFrom(event.target.value)} style={{ width: 160 }} />
                    <Input type="date" value={dataUntil} onChange={(event) => setDataUntil(event.target.value)} style={{ width: 160 }} />
                  </div>
                )}
              >
                <div className="chart-box"><Bar data={incidentsChart} options={dualAxisChartOptions} /></div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Resueltos por categoria">
                <Table
                  dataSource={categoryRows}
                  pagination={false}
                  columns={[
                    { title: 'Categoria', dataIndex: 'categoria', key: 'categoria', filters: buildFilters(categoryRows, 'categoria'), onFilter: (value, record) => record.categoria === value },
                    { title: 'Resueltos', dataIndex: 'resueltos', key: 'resueltos', render: formatNumber, sorter: numericSorter('resueltos') },
                  ]}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card title="Incidentes diarios">
                <Table
                  dataSource={incidentsRows}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: formatDateShort, sorter: (a, b) => new Date(a.fecha) - new Date(b.fecha) },
                    { title: 'Tickets', dataIndex: 'tickets', key: 'tickets', render: formatNumber, sorter: numericSorter('tickets') },
                    { title: 'Clientes', dataIndex: 'clientes', key: 'clientes', render: formatNumber, sorter: numericSorter('clientes') },
                    { title: 'Tickets por cliente', dataIndex: 'ticketsPorCliente', key: 'ticketsPorCliente', render: formatNumber, sorter: numericSorter('ticketsPorCliente') },
                    { title: 'Reclamo', dataIndex: 'reclamos', key: 'reclamos', render: formatNumber, sorter: numericSorter('reclamos') },
                    { title: 'Soporte', dataIndex: 'soporte', key: 'soporte', render: formatNumber, sorter: numericSorter('soporte') },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Casos fuera de SLA">
                <Table
                  dataSource={breachesRows}
                  columns={breachColumns}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 980 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
  ]

  const sectionAlerts = <SectionAlerts errors={[summaryError, monthlyError, incidentsError, breachesError, recurrenceError]} />

  return (
    <PageSection
      title="Soporte"
      subtitle="Proceso de soporte reorganizado en Resumen, KPI y Data para seguir SLA de 48 hs y detectar incidentes."
      alerts={sectionAlerts}
      extra={
        <div className="field-row">
          <Select value={year} onChange={setYear} options={[{ value: 2026, label: 'Ano 2026' }, { value: 2025, label: 'Ano 2025' }]} style={{ width: 140 }} />
          <Select value={month} onChange={setMonth} options={monthOptions} style={{ width: 120 }} />
        </div>
      }
    >
      {loadingSummary || loadingMonthly || loadingIncidents || loadingBreaches ? <CenteredSpinner /> : null}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
    </PageSection>
  )
}

function PageSection({ title, subtitle, extra, children, alerts }) {
  return (
    <section className="page-section">
      <div className="page-section__head">
        <div>
          <span className="page-section__eyebrow">{title}</span>
          <Title level={3}>{title}</Title>
          <Paragraph className="page-section__subtitle">{subtitle}</Paragraph>
        </div>
        {extra}
      </div>
      {alerts ? <div className="status-stack">{alerts}</div> : null}
      {children}
    </section>
  )
}

function KpiGrid({ items }) {
  if (!items.length) {
    return <SectionEmpty description="Todavia no hay indicadores disponibles para esta vista." />
  }

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.id} xs={24} sm={12} xl={8} xxl={4}>
          <Card className="kpi-card-live">
            <Statistic title={item.label} value={formatValue(item)} />
            <div className="kpi-meta">
              {item.target ? <Text type="secondary">Objetivo: {item.format === 'currency' ? formatMoney(item.target) : item.format === 'percent' ? `${item.target}%` : item.format === 'hours' ? `${item.target} hs` : decimal.format(item.target)}</Text> : <span />}
              <Tag color={statusColor[item.status] || 'default'}>{item.progress ? `${item.progress}%` : statusLabel[item.status] || 'Info'}</Tag>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function useApi(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: null })

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null })
      return undefined
    }
    let active = true
    setState((prev) => ({ ...prev, loading: true }))

    const request = async (attempt = 0) => {
      try {
        const res = await fetch(`${apiBaseUrl}${path}`)
        const contentType = res.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await res.json() : null

        if (!res.ok) {
          throw new Error(data?.error || 'No se pudo completar la consulta al backend.')
        }

        if (!data) {
          throw new Error('El backend devolvio una respuesta no valida.')
        }

        return data
      } catch (error) {
        if (attempt >= 1) throw error
        await new Promise((resolve) => setTimeout(resolve, 900))
        return request(attempt + 1)
      }
    }

    request()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error })
      })
    return () => {
      active = false
    }
  }, [path])

  return state
}

function CenteredSpinner() {
  return (
    <div className="spinner-row">
      <Spin />
    </div>
  )
}

function SectionAlerts({ errors = [], info }) {
  const visibleErrors = errors.filter(Boolean)
  if (!visibleErrors.length && !info) return null

  return (
    <>
      {info ? <Alert type="info" showIcon message={info} /> : null}
      {visibleErrors.map((error, index) => (
        <Alert
          key={`${error.message}-${index}`}
          type="error"
          showIcon
          message="No se pudo cargar una parte del tablero."
          description={error.message}
        />
      ))}
    </>
  )
}

function SectionEmpty({ description }) {
  return (
    <div className="empty-state">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
    </div>
  )
}

function formatValue(item) {
  if (item.format === 'currency') return formatMoney(item.value)
  if (item.format === 'percent') return `${item.value}%`
  if (item.format === 'days') return `${item.value} dias`
  if (item.format === 'hours') return `${item.value} hs`
  return decimal.format(item.value)
}

function formatMoney(value) {
  return money.format(Number(value || 0))
}

function formatNumber(value) {
  return decimal.format(Number(value || 0))
}

function formatOptionalNumber(value) {
  if (value === null || value === undefined) return '-'
  return formatNumber(value)
}

function formatOptionalMoney(value) {
  if (value === null || value === undefined) return '-'
  return formatMoney(value)
}

function formatDateShort(value) {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleDateString('es-AR')
}

function formatDateLong(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAxisCurrency(value) {
  const numeric = Number(value || 0)
  if (Math.abs(numeric) >= 1000000) {
    return `$${(numeric / 1000000).toFixed(1)}M`
  }
  if (Math.abs(numeric) >= 1000) {
    return `$${(numeric / 1000).toFixed(0)}k`
  }
  return `$${numeric.toFixed(0)}`
}

function getMonthStartInputValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function getMonthEndInputValue(year, month) {
  const lastDay = new Date(year, month, 0).getDate()
  const todayDate = new Date()
  if (year === todayDate.getFullYear() && month === todayDate.getMonth() + 1) {
    return `${year}-${String(month).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function formatDelta(current, previous) {
  if (previous === null || previous === undefined || Number(previous) === 0) return '-'
  const delta = ((Number(current || 0) - Number(previous || 0)) / Number(previous)) * 100
  const rounded = Math.round(delta * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function formatSignedNumber(value) {
  const numeric = Number(value || 0)
  if (numeric === 0) return '0'
  return `${numeric > 0 ? '+' : ''}${decimal.format(numeric)}`
}

function formatSignedPercent(value) {
  const numeric = Math.round(Number(value || 0) * 10) / 10
  if (numeric === 0) return '0%'
  return `${numeric > 0 ? '+' : ''}${numeric}%`
}

function formatBlockedStatus(value) {
  if (value === true) return 'Si'
  if (value === false) return 'No'
  return 'Sin dato'
}

function formatProgressPercent(value) {
  return `${(Math.round(Number(value || 0) * 10) / 10).toFixed(1)}%`
}

function evaluatePerformanceGap(actual, target, direction = 'higher') {
  const safeActual = Number(actual || 0)
  const safeTarget = Number(target || 0)
  const deltaValue = safeActual - safeTarget
  const deltaPercent = safeTarget > 0 ? ((safeActual - safeTarget) / safeTarget) * 100 : 0

  let status = 'warn'

  if (direction === 'higher') {
    if (deltaPercent >= 0) status = 'good'
    else if (deltaPercent >= -10) status = 'warn'
    else status = 'bad'
  } else {
    if (deltaPercent <= 0) status = 'good'
    else if (deltaPercent <= 10) status = 'warn'
    else status = 'bad'
  }

  return {
    deltaValue,
    deltaPercent,
    status,
  }
}

function calculateProgressSummary(actual, target, direction = 'higher') {
  const safeActual = Number(actual || 0)
  const safeTarget = Number(target || 0)
  const advancePercent = safeTarget > 0 ? (safeActual / safeTarget) * 100 : 0
  const gap = evaluatePerformanceGap(safeActual, safeTarget, direction)

  let status = 'warn'
  if (direction === 'higher') {
    if (advancePercent >= 100) status = 'good'
    else if (advancePercent >= 85) status = 'warn'
    else status = 'bad'
  } else {
    if (advancePercent <= 100) status = 'good'
    else if (advancePercent <= 110) status = 'warn'
    else status = 'bad'
  }

  return {
    actual: safeActual,
    target: safeTarget,
    advancePercent,
    gap,
    status,
  }
}

function renderHeatCell(value, rows, mode) {
  const numericValue = Number(value || 0)
  const max = Math.max(...rows.map((row) => Object.entries(row)
    .filter(([key]) => ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20', 'Otro'].includes(key))
    .reduce((acc, [, itemValue]) => Math.max(acc, Number(itemValue || 0)), 0)), 0)
  const opacity = max > 0 ? Math.max(0.08, numericValue / max) : 0
  const formatted = mode === 'count' ? formatNumber(numericValue) : formatMoney(numericValue)

  return (
    <div
      className="heat-cell"
      style={{
        background: `rgba(227, 6, 41, ${opacity})`,
        color: numericValue > max * 0.45 ? '#fff' : '#1f2937',
        borderRadius: 8,
        padding: '5px 6px',
        textAlign: 'right',
        fontWeight: 600,
      }}
    >
      {formatted}
    </div>
  )
}

function buildFilters(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter((value) => value !== null && value !== undefined && value !== '')))
    .map((value) => ({ text: String(value), value: String(value) }))
}

function numericSorter(key) {
  return (a, b) => Number(a[key] ?? 0) - Number(b[key] ?? 0)
}

function mapCommercialCategoryRow(category) {
  return {
    key: category.id,
    categoria: category.label,
    total: category.total,
    pending: category.byStatus.pending,
    resolved: category.byStatus.resolved,
    inProgress: category.byStatus.inProgress,
    followUp: category.byStatus.followUp,
    escalated: category.byStatus.escalated,
    postponed: category.byStatus.postponed,
  }
}

const statusColor = {
  good: 'green',
  warn: 'orange',
  bad: 'red',
  info: 'magenta',
}

const statusLabel = {
  good: 'OK',
  warn: 'Atencion',
  bad: 'Critico',
  info: 'Info',
}

const pageMetaMap = {
  directorio: {
    label: 'Directorio',
    title: 'Control ejecutivo de la operacion comercial',
    description: 'Resumen general para seguir crecimiento, facturacion y tendencia mensual con una lectura mas clara y profesional.',
  },
  comercial: {
    label: 'Comercial',
    title: 'Seguimiento comercial con comparativos y foco operativo',
    description: 'Vista orientada a ventas, upselling y conversion para detectar desvio, oportunidad y ritmo del proceso.',
  },
  cobranzas: {
    label: 'Cobranzas',
    title: 'Cobranza, medios de pago y cartera pendiente',
    description: 'Lectura ejecutiva para revisar recaudacion, mezcla de medios y concentracion de deuda sin perder el detalle analitico.',
  },
  'planta-exterior': {
    label: 'Planta Exterior',
    title: 'Monitoreo tecnico con tiempos y cumplimiento de objetivo',
    description: 'Tablero orientado a volumen operativo, demoras y casos fuera de objetivo para ordenar la lectura tecnica.',
  },
  soporte: {
    label: 'Soporte',
    title: 'Mesa de soporte con SLA, incidentes y recurrencia',
    description: 'Vista profesional para seguir carga operativa, cumplimiento y clientes criticos desde una sola pantalla.',
  },
}

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 10,
        boxHeight: 10,
        color: '#41526d',
        padding: 18,
        font: {
          size: 12,
          weight: '600',
        },
      },
    },
    tooltip: {
      backgroundColor: '#16213d',
      titleColor: '#ffffff',
      bodyColor: '#f8fbff',
      padding: 12,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#5a6b88',
        font: {
          size: 11,
          weight: '600',
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(90, 107, 136, 0.14)',
      },
      border: {
        display: false,
      },
      ticks: {
        color: '#5a6b88',
        font: {
          size: 11,
        },
      },
    },
  },
}

const stackedChartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      ...baseChartOptions.scales.x,
      stacked: true,
    },
    y: {
      ...baseChartOptions.scales.y,
      stacked: true,
    },
  },
}

const dualAxisChartOptions = {
  ...baseChartOptions,
  scales: {
    y: {
      ...baseChartOptions.scales.y,
      beginAtZero: true,
      title: { display: true, text: 'Casos' },
    },
    y1: {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: {
        color: '#5a6b88',
      },
      title: { display: true, text: '% fuera de objetivo' },
    },
    x: baseChartOptions.scales.x,
  },
}

const currencyChartOptions = {
  ...baseChartOptions,
  scales: {
    ...baseChartOptions.scales,
    y: {
      ...baseChartOptions.scales.y,
      ticks: {
        ...baseChartOptions.scales.y.ticks,
        callback: (value) => formatAxisCurrency(value),
      },
    },
  },
}

const commercialOverviewChartOptions = {
  ...baseChartOptions,
  scales: {
    x: baseChartOptions.scales.x,
    y: {
      ...baseChartOptions.scales.y,
      beginAtZero: true,
      title: {
        display: true,
        text: 'Conexiones activas',
      },
    },
    y1: {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: {
        color: '#5a6b88',
        callback: (value) => formatAxisCurrency(value),
      },
      title: {
        display: true,
        text: 'Facturacion',
      },
    },
  },
}

const percentChartOptions = {
  ...baseChartOptions,
  scales: {
    x: baseChartOptions.scales.x,
    y: {
      ...baseChartOptions.scales.y,
      beginAtZero: true,
      min: 0,
      max: 100,
      title: {
        display: true,
        text: 'Cumplimiento %',
      },
      ticks: {
        ...baseChartOptions.scales.y.ticks,
        callback: (value) => `${value}%`,
      },
    },
  },
}

const ticketVsUpsellingChartOptions = {
  ...baseChartOptions,
  scales: {
    x: baseChartOptions.scales.x,
    y: {
      ...baseChartOptions.scales.y,
      title: { display: true, text: 'Ticket promedio' },
      ticks: {
        ...baseChartOptions.scales.y.ticks,
        callback: (value) => formatAxisCurrency(value),
      },
    },
    y1: {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Upselling cerrados' },
      ticks: {
        color: '#5a6b88',
      },
    },
  },
}

const monthOptions = [
  { value: 1, label: 'Ene' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dic' },
]

const monthLabelMap = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
}

const commercialCategoryOptions = [
  { value: 'upselling', label: 'Upselling' },
  { value: 'planChange', label: 'Cambio de abono' },
  { value: 'migration', label: 'Wireless a fibra' },
]

const categoryLabelMap = {
  upselling: 'Upselling',
  planChange: 'Cambio de abono',
  migration: 'Wireless a fibra',
}

const chartPalette = ['#e30629', '#f59e0b', '#2563eb', '#14804a', '#7c3aed', '#6b7280', '#0f766e']
