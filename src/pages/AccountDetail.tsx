import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Landmark,
  PiggyBank,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Tag,
  Wallet,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { accountsService } from '@/services/accountsService'
import { getTransactions, createTransaction } from '@/services/transactionsService'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'

const accountTypeLabels: Record<Account['type'], string> = {
  cash: 'Dinheiro Físico',
  checking: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  savings: 'Poupança / Investimento',
}

const accountTypeIcons: Record<Account['type'], React.ReactNode> = {
  cash: <Banknote size={22} />,
  checking: <Landmark size={22} />,
  credit_card: <CreditCard size={22} />,
  savings: <PiggyBank size={22} />,
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface MonthData {
  month: string
  income: number
  expense: number
  net: number
}

function buildMonthlyData(transactions: Transaction[]): MonthData[] {
  const now = new Date()
  const result: MonthData[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear() !== now.getFullYear() ? d.getFullYear() : ''}`

    const monthTxns = transactions.filter((t) => t.date.startsWith(key))
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    result.push({ month: label.trim(), income, expense, net: income - expense })
  }

  return result
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  return (
    <div style={{
      background: '#111221', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem',
    }}>
      <p style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name === 'income' ? 'Entradas' : p.name === 'expense' ? 'Saídas' : 'Saldo'}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  const fetchData = useCallback(async () => {
    if (!user || !id) return
    setLoading(true)
    setErrorMsg('')
    try {
      const [accs, allTxns] = await Promise.all([
        accountsService.getAll(user.id),
        getTransactions(user.id),
      ])
      const found = accs.find((a) => a.id === id)
      if (!found) {
        setErrorMsg('Conta não encontrada.')
        return
      }
      setAccount(found)
      setTransactions(allTxns.filter((t) => t.account_id === id))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => { fetchData() }, [fetchData])

  function openAdjust() {
    if (!account) return
    setAdjustTarget(String(account.balance))
    setAdjustError('')
    setIsAdjustOpen(true)
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !account) return

    const newBalance = parseFloat(adjustTarget)
    if (isNaN(newBalance)) {
      setAdjustError('Informe um valor numérico válido.')
      return
    }

    const delta = newBalance - Number(account.balance)
    if (delta === 0) {
      setAdjustError('O saldo informado é igual ao atual. Nenhum ajuste necessário.')
      return
    }

    try {
      setAdjusting(true)
      setAdjustError('')
      await createTransaction(user.id, {
        name: 'Ajuste',
        amount: Math.abs(delta),
        date: new Date().toISOString().split('T')[0],
        type: delta > 0 ? 'income' : 'expense',
        account_id: account.id,
        category_id: null,
      })
      setIsAdjustOpen(false)
      fetchData()
    } catch (err: any) {
      setAdjustError(err.message)
    } finally {
      setAdjusting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  if (errorMsg || !account) {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/wallet')}>
          <ArrowLeft size={16} /> Voltar para Carteira
        </button>
        <div className="alert alert-error" style={{ marginTop: 24 }}>{errorMsg || 'Conta não encontrada.'}</div>
      </div>
    )
  }

  const monthlyData = buildMonthlyData(transactions)
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // Preview delta while user types
  const previewTarget = parseFloat(adjustTarget)
  const previewDelta = !isNaN(previewTarget) ? previewTarget - Number(account.balance) : null

  return (
    <div className="page">
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/wallet')}
        style={{ marginBottom: 24 }}
      >
        <ArrowLeft size={16} />
        Voltar para Carteira
      </button>

      {/* Account Header */}
      <div className="dashboard-card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="txn-icon" style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,58,237,0.18)', color: 'var(--color-primary-light)', flexShrink: 0 }}>
            {accountTypeIcons[account.type]}
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{account.name}</h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: 2 }}>{accountTypeLabels[account.type]}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 4 }}>Saldo Atual</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: account.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {fmt(account.balance)}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={openAdjust} style={{ flexShrink: 0 }}>
            <SlidersHorizontal size={16} />
            Ajustar Saldo
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="dashboard-card" style={{ background: 'rgba(16,217,136,0.07)', borderColor: 'rgba(16,217,136,0.2)' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 6 }}>Total de Entradas</p>
          <p style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.3rem' }}>{fmt(totalIncome)}</p>
        </div>
        <div className="dashboard-card" style={{ background: 'rgba(255,92,122,0.07)', borderColor: 'rgba(255,92,122,0.2)' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 6 }}>Total de Saídas</p>
          <p style={{ color: 'var(--color-error)', fontWeight: 700, fontSize: '1.3rem' }}>{fmt(totalExpense)}</p>
        </div>
        <div className="dashboard-card">
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 6 }}>Transações</p>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.3rem' }}>{transactions.length}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="dashboard-card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <Wallet size={18} style={{ color: 'var(--color-primary-light)' }} />
          Desempenho — Últimos 6 Meses
        </div>
        {transactions.length === 0 ? (
          <p className="no-data-msg">Nenhuma transação vinculada a esta conta.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="income" name="income" fill="#10d988" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill="#ff5c7a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="net" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.net >= 0 ? 'rgba(124,58,237,0.8)' : 'rgba(255,92,122,0.4)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#10d988', display: 'inline-block' }} />Entradas</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff5c7a', display: 'inline-block' }} />Saídas</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(124,58,237,0.8)', display: 'inline-block' }} />Saldo Líquido</span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card-title" style={{ marginBottom: 16, fontSize: '1.05rem', fontWeight: 600, color: '#e4e6f0' }}>
        Histórico de Transações
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <Wallet size={40} className="empty-icon" />
          <p className="empty-title">Nenhuma transação nesta conta</p>
          <p className="empty-sub">Vincule movimentações a esta conta ao criá-las.</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((txn) => (
            <div key={txn.id} className="transaction-item">
              <div className="txn-left">
                <div className={`txn-icon ${txn.type === 'income' ? 'txn-icon-income' : 'txn-icon-expense'}`}>
                  {txn.type === 'income' ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                </div>
                <div className="txn-details">
                  <span className="txn-name">{txn.name || (txn.type === 'income' ? 'Entrada' : 'Saída')}</span>
                  <div className="txn-meta">
                    <span className="txn-date">
                      <Calendar size={12} />
                      {new Date(txn.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {txn.categories && (
                      <span className="txn-category">
                        <Tag size={12} />
                        {txn.categories.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="txn-right">
                <span className={`txn-amount ${txn.type === 'income' ? 'text-success' : ''}`}
                  style={txn.type === 'expense' ? { color: 'var(--color-error)' } : {}}>
                  {txn.type === 'income' ? '+' : '-'} {fmt(txn.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust Balance Modal */}
      {isAdjustOpen && (
        <div className="modal-backdrop" onClick={() => setIsAdjustOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><SlidersHorizontal size={20} />Ajustar Saldo</h2>
              <button className="modal-close" onClick={() => setIsAdjustOpen(false)}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleAdjust}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Informe o saldo <strong style={{ color: '#fff' }}>correto</strong> da conta. A diferença será lançada automaticamente como uma movimentação de <strong style={{ color: '#fff' }}>Ajuste</strong>.
              </p>

              <div className="form-group">
                <label className="form-label">
                  Saldo Atual: <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{fmt(account.balance)}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="Novo saldo..."
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Preview do ajuste */}
              {previewDelta !== null && previewDelta !== 0 && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: previewDelta > 0 ? 'rgba(16,217,136,0.1)' : 'rgba(255,92,122,0.1)',
                  border: `1px solid ${previewDelta > 0 ? 'rgba(16,217,136,0.3)' : 'rgba(255,92,122,0.3)'}`,
                  fontSize: '0.88rem',
                  marginBottom: 8,
                }}>
                  {previewDelta > 0 ? (
                    <span style={{ color: 'var(--color-success)' }}>
                      ➕ Será criada uma <strong>entrada</strong> de {fmt(previewDelta)} (Ajuste)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-error)' }}>
                      ➖ Será criada uma <strong>saída</strong> de {fmt(Math.abs(previewDelta))} (Ajuste)
                    </span>
                  )}
                </div>
              )}

              {adjustError && <div className="alert alert-error" style={{ marginBottom: 8 }}>{adjustError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsAdjustOpen(false)} disabled={adjusting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={adjusting}>
                  {adjusting ? <div className="btn-spinner" /> : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
