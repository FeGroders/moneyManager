import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Activity, PieChart as PieChartIcon, BarChart2, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getTransactions } from '@/services/transactionsService'
import type { Transaction } from '@/types/transaction'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const INCOME_COLOR = '#10b981' // Green
const EXPENSE_COLOR = '#ef4444' // Red
const COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#6366f1']

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        setLoading(true)
        const txns = await getTransactions(user.id)
        setTransactions(txns)
      } catch (err) {
        console.error('Erro ao carregar transações no dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // --- Processamento de Dados para os Gráficos ---
  const now = new Date()
  const startOfCurrentMonth = startOfMonth(now)
  const endOfCurrentMonth = endOfMonth(now)

  // 1. Gráfico de Pizza: Entradas vs Saídas (Mês Atual)
  const pieData = useMemo(() => {
    let income = 0
    let expense = 0

    transactions.forEach(t => {
      const tDate = parseISO(t.date)
      if (isWithinInterval(tDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
        if (t.type === 'income') income += Number(t.amount)
        if (t.type === 'expense') expense += Number(t.amount)
      }
    })

    return [
      { name: 'Entradas', value: income, color: INCOME_COLOR },
      { name: 'Saídas', value: expense, color: EXPENSE_COLOR },
    ].filter(i => i.value > 0) // Esconde categorias se ambas zeradas
  }, [transactions, startOfCurrentMonth, endOfCurrentMonth])

  // 2. Gráfico de Barras: Seis Últimos Meses (Entradas/Saídas)
  const barData = useMemo(() => {
    const dataMap: Record<string, { monthDate: Date; income: number; expense: number }> = {}

    // Inicializa os últimos 6 meses com 0
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const key = format(monthStart, 'yyyy-MM')
      dataMap[key] = { monthDate: monthStart, income: 0, expense: 0 }
    }

    transactions.forEach(t => {
      const tDate = parseISO(t.date)
      const key = format(tDate, 'yyyy-MM')
      if (dataMap[key]) {
        if (t.type === 'income') dataMap[key].income += Number(t.amount)
        if (t.type === 'expense') dataMap[key].expense += Number(t.amount)
      }
    })

    // Converte de Record para Array ordenado formatado para o Recharts
    return Object.values(dataMap)
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
      .map(entry => ({
        name: format(entry.monthDate, 'MMM', { locale: ptBR }),
        'Entradas': entry.income,
        'Saídas': entry.expense,
      }))
  }, [transactions, now])

  // 3. Gráfico de Rosca (Donut): Despesas do Mês Atual Agrupadas por Categoria
  const donutData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {}

    transactions.forEach(t => {
      const tDate = parseISO(t.date)
      if (t.type === 'expense' && isWithinInterval(tDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
        const catName = t.categories?.name || 'Sem Categoria'
        if (!expensesByCategory[catName]) expensesByCategory[catName] = 0
        expensesByCategory[catName] += Number(t.amount)
      }
    })

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Maior despesa primeiro
  }, [transactions, startOfCurrentMonth, endOfCurrentMonth])

  // Funções Utilitárias para formatar R$ no Tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const renderTooltipFormatter = (value: any) => [formatCurrency(Number(value))]

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TrendingUp size={28} />
            Dashboard
          </h1>
          <p className="page-subtitle">
            Visão geral financeira de {format(now, 'MMMM', { locale: ptBR })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/transactions?new=true')}>
          <Plus size={18} />
          Nova Movimentação
        </button>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="loading-spinner" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <Activity size={48} className="empty-icon" />
          <p className="empty-title">Sem movimentações suficientes</p>
          <p className="empty-sub">
            Adicione dados na tela de Movimentações para gerar os seus gráficos!
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          
          {/* Card 1: Resumo do Mês (PieChart) */}
          <div className="dashboard-card">
            <h2 className="card-title">
              <PieChartIcon size={18} /> Balanço do Mês Atual
            </h2>
            {pieData.length === 0 ? (
              <p className="no-data-msg">Sem transações no mês atual.</p>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={renderTooltipFormatter} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Card 2: Histórico (BarChart) */}
          <div className="dashboard-card col-span-2">
            <h2 className="card-title">
              <BarChart2 size={18} /> Histórico dos Últimos 6 Meses
            </h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d2d3a" />
                  <XAxis dataKey="name" stroke="#a0a0ab" tickLine={false} axisLine={false} />
                  <YAxis stroke="#a0a0ab" tickLine={false} axisLine={false} tickFormatter={(val: number) => `R$ ${val}`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    formatter={renderTooltipFormatter}
                    contentStyle={{ backgroundColor: '#181820', border: '1px solid #2d2d3a', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="Entradas" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Categoria (DonutChart) */}
          <div className="dashboard-card col-span-2">
             <h2 className="card-title">
              <Activity size={18} /> Despesas por Categoria (Mês Atual)
            </h2>
            {donutData.length === 0 ? (
              <p className="no-data-msg">Sem despesas no mês atual.</p>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {donutData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={renderTooltipFormatter} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  )
}
