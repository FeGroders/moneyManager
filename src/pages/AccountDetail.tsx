import { useState, useEffect, useCallback, useRef } from 'react'
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
  Receipt,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
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
import { createTransfer } from '@/services/transferService'
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

/** Calcula a próxima data para um dia do mês a partir de hoje */
function nextDateForDay(day: number): Date {
  const today = new Date()
  const candidate = new Date(today.getFullYear(), today.getMonth(), day)
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1)
  return candidate
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [account, setAccount] = useState<Account | null>(null)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Adjustment modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  // Pay Invoice modal state
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [payFromId, setPayFromId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [isPayDropdownOpen, setIsPayDropdownOpen] = useState(false)
  const payDropdownRef = useRef<HTMLDivElement>(null)

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
      setAllAccounts(accs)
      setTransactions(allTxns.filter((t) => t.account_id === id))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (payDropdownRef.current && !payDropdownRef.current.contains(e.target as Node)) {
        setIsPayDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openAdjust() {
    if (!account) return
    if (account.type === 'credit_card') {
      const fatura = Math.abs(Number(account.balance))
      setAdjustTarget(fatura > 0 ? String(fatura) : '')
    } else {
      setAdjustTarget(String(account.balance))
    }
    setAdjustError('')
    setIsAdjustOpen(true)
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !account) return

    let newBalance = parseFloat(adjustTarget)
    if (isNaN(newBalance)) {
      setAdjustError('Informe um valor numérico válido.')
      return
    }

    if (account.type === 'credit_card') {
      // Para cartão, o usuário digita a fatura (ex: 500), mas o saldo real deve ser negativo (-500)
      newBalance = -Math.abs(newBalance);
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

  function openPayInvoice() {
    if (!account) return
    const fatura = Math.abs(Number(account.balance))
    setPayAmount(fatura > 0 ? fatura.toFixed(2) : '')
    const defaultFrom = allAccounts.find(a => a.id !== account.id && a.type !== 'credit_card')
    setPayFromId(defaultFrom?.id || '')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayError('')
    setIsPayDropdownOpen(false)
    setIsPayOpen(true)
  }

  async function handlePayInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !account) return
    const amt = parseFloat(payAmount)
    if (!payFromId || isNaN(amt) || amt <= 0) {
      setPayError('Preencha todos os campos corretamente.')
      return
    }
    try {
      setPaying(true)
      setPayError('')
      // Transferência: conta origem → cartão (crédito no cartão, zerando/reduzindo fatura)
      await createTransfer(user.id, {
        fromAccountId: payFromId,
        toAccountId: account.id,
        amount: amt,
        date: payDate,
        description: 'Pagamento de Fatura',
      })
      setIsPayOpen(false)
      fetchData()
    } catch (err: any) {
      setPayError(err.message)
    } finally {
      setPaying(false)
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

  const isCreditCard = account.type === 'credit_card'
  const bal = Number(account.balance)

  // Para cartão de crédito:
  // Fatura a pagar = saldo absoluto. Exibiremos como valor negativo para indicar dívida.
  const faturaEmAberto = Math.abs(bal)                  // valor da dívida
  const faturaAtual = faturaEmAberto > 0 ? -faturaEmAberto : 0 // exibição sempre negativa

  const creditLimit = Number(account.credit_limit) || 0
  // Disponível = limite - valor comprometido (fatura em aberto)
  const disponivel = creditLimit > 0 ? Math.max(creditLimit - faturaEmAberto, 0) : 0
  const usedPct = creditLimit > 0 ? Math.min((faturaEmAberto / creditLimit) * 100, 100) : 0
  const limitBarColor = usedPct > 80 ? 'var(--color-error)' : usedPct > 50 ? '#f59e0b' : 'var(--color-success)'

  const nextClosing = account.closing_day ? nextDateForDay(account.closing_day) : null
  const nextDue = account.due_day ? nextDateForDay(account.due_day) : null
  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  const payableAccounts = allAccounts.filter(a => a.id !== account.id && a.type !== 'credit_card')

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

      {/* ── Credit Card Panel ──────────────────────────────────────── */}
      {isCreditCard ? (
        <div className="cc-panel">
          {/* Header */}
          <div className="cc-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="cc-icon">
                <CreditCard size={24} />
              </div>
              <div>
                <h1 className="cc-name">{account.name}</h1>
                <p className="cc-type">Cartão de Crédito</p>
              </div>
            </div>
            <div className="cc-header-actions">
              <button className="btn btn-ghost btn-sm" onClick={openAdjust}>
                <SlidersHorizontal size={16} />
                Ajustar Fatura
              </button>
              <button className="btn btn-primary btn-sm" onClick={openPayInvoice}>
                <Receipt size={16} />
                Pagar Fatura
              </button>
            </div>
          </div>

          {/* Fatura + Limite */}
          <div className="cc-stats-grid">
            <div className="cc-stat">
              <p className="cc-stat-label">Fatura Atual</p>
              <p className="cc-stat-value" style={{ color: faturaAtual < 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                {fmt(faturaAtual)}
              </p>
            </div>
            {creditLimit > 0 && (
              <>
                <div className="cc-stat">
                  <p className="cc-stat-label">Limite Disponível</p>
                  <p className="cc-stat-value" style={{ color: 'var(--color-success)' }}>{fmt(disponivel)}</p>
                </div>
                <div className="cc-stat">
                  <p className="cc-stat-label">Limite Total</p>
                  <p className="cc-stat-value">{fmt(creditLimit)}</p>
                </div>
              </>
            )}
            {nextClosing && (
              <div className="cc-stat">
                <p className="cc-stat-label">Próximo Fechamento</p>
                <p className="cc-stat-value cc-stat-date">{fmtDate(nextClosing)}</p>
              </div>
            )}
            {nextDue && (
              <div className="cc-stat">
                <p className="cc-stat-label">Próximo Vencimento</p>
                <p className="cc-stat-value cc-stat-date">{fmtDate(nextDue)}</p>
              </div>
            )}
          </div>

          {/* Barra de limite */}
          {creditLimit > 0 && (
            <div className="cc-limit-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="cc-limit-label">
                  {usedPct > 80
                    ? <><AlertTriangle size={13} style={{ color: 'var(--color-error)', marginRight: 4, verticalAlign: 'middle' }} />Limite quase esgotado</>
                    : <><CheckCircle2 size={13} style={{ color: 'var(--color-success)', marginRight: 4, verticalAlign: 'middle' }} />Limite utilizado</>
                  }
                </span>
                <span className="cc-limit-pct">{usedPct.toFixed(0)}%</span>
              </div>
              <div className="cc-limit-bar">
                <div className="cc-limit-bar-fill" style={{ width: `${usedPct}%`, background: limitBarColor }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Regular Account Header ──────────────────────────────── */
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
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="dashboard-card" style={{ background: 'rgba(16,217,136,0.07)', borderColor: 'rgba(16,217,136,0.2)' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 6 }}>{isCreditCard ? 'Créditos / Pagamentos' : 'Total de Entradas'}</p>
          <p style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.3rem' }}>{fmt(totalIncome)}</p>
        </div>
        <div className="dashboard-card" style={{ background: 'rgba(255,92,122,0.07)', borderColor: 'rgba(255,92,122,0.2)' }}>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: 6 }}>{isCreditCard ? 'Gastos no Cartão' : 'Total de Saídas'}</p>
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
          {isCreditCard ? 'Gastos — Últimos 6 Meses' : 'Desempenho — Últimos 6 Meses'}
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
              {!isCreditCard && (
                <Bar dataKey="net" name="net" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.net >= 0 ? 'rgba(124,58,237,0.8)' : 'rgba(255,92,122,0.4)'} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#10d988', display: 'inline-block' }} />
            {isCreditCard ? 'Pagamentos' : 'Entradas'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff5c7a', display: 'inline-block' }} />
            {isCreditCard ? 'Gastos' : 'Saídas'}
          </span>
          {!isCreditCard && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(124,58,237,0.8)', display: 'inline-block' }} />
              Saldo Líquido
            </span>
          )}
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

      {/* ── Adjust Balance Modal ──────────────────────────────────── */}
      {isAdjustOpen && (
        <div className="modal-backdrop" onClick={() => setIsAdjustOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><SlidersHorizontal size={20} />{isCreditCard ? 'Ajustar Fatura' : 'Ajustar Saldo'}</h2>
              <button className="modal-close" onClick={() => setIsAdjustOpen(false)}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleAdjust}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Informe o {isCreditCard ? 'valor atual da fatura' : 'saldo correto'}. A diferença será lançada automaticamente como uma movimentação de <strong style={{ color: '#fff' }}>Ajuste</strong>.
              </p>

              <div className="form-group">
                <label className="form-label">
                  {isCreditCard ? 'Fatura Atual' : 'Saldo Atual'}: <span style={{ color: isCreditCard ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 600 }}>{isCreditCard ? fmt(faturaAtual) : fmt(account.balance)}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="Novo valor..."
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value)}
                  autoFocus
                />
              </div>

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

      {/* ── Pay Invoice Modal ─────────────────────────────────────── */}
      {isPayOpen && (
        <div className="modal-backdrop" onClick={() => setIsPayOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><Receipt size={20} />Pagar Fatura</h2>
              <button className="modal-close" onClick={() => setIsPayOpen(false)}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handlePayInvoice}>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Selecione a conta de débito e o valor a pagar. O saldo da conta de origem será reduzido e a fatura do cartão será quitada.
              </p>

              {payError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{payError}</div>}

              {/* Conta de débito */}
              <div className="form-group" ref={payDropdownRef}>
                <label className="form-label">Pagar com (Conta de Débito) *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsPayDropdownOpen(!isPayDropdownOpen)}
                  >
                    <span>{payFromId ? payableAccounts.find(a => a.id === payFromId)?.name || 'Selecione' : 'Selecione a conta'}</span>
                    <ChevronDown size={18} className={`select-icon ${isPayDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isPayDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {payableAccounts.length === 0 ? (
                        <div className="custom-select-option" style={{ color: 'var(--color-muted)', cursor: 'default' }}>
                          Nenhuma conta disponível
                        </div>
                      ) : payableAccounts.map((a) => (
                        <div
                          key={a.id}
                          className={`custom-select-option ${payFromId === a.id ? 'selected' : ''}`}
                          onClick={() => { setPayFromId(a.id); setIsPayDropdownOpen(false) }}
                        >
                          {a.name} <span style={{ color: 'var(--color-muted)', marginLeft: 8, fontSize: '0.8rem' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(a.balance))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="form-group">
                <label className="form-label">Valor a Pagar *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="0,00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                <span className="form-hint">Fatura atual: {fmt(faturaAtual)}</span>
              </div>

              {/* Data */}
              <div className="form-group">
                <label className="form-label">Data do Pagamento *</label>
                <input
                  type="date"
                  className="form-input"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsPayOpen(false)} disabled={paying}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={paying}>
                  {paying ? <div className="btn-spinner" /> : <><Receipt size={16} />Confirmar Pagamento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
