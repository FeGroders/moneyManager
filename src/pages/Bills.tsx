import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  X,
  Calendar,
  Tag,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { getBills, createBill, updateBill, deleteBill } from '@/services/billsService'
import { categoriesService } from '@/services/categoriesService'
import type { Bill } from '@/types/bill'
import type { Category } from '@/types/category'

const billSchema = z.object({
  name: z.string().min(1, 'Informe uma descrição.'),
  amount: z
    .number({ invalid_type_error: 'Valor inválido.' })
    .positive('O valor deve ser maior que zero.'),
  due_date: z.string().min(1, 'A data de vencimento é obrigatória.'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type BillFormValues = z.infer<typeof billSchema>

function getStatus(bill: Bill): 'paid' | 'overdue' | 'pending' {
  if (bill.paid) return 'paid'
  const today = new Date().toISOString().split('T')[0]
  if (bill.due_date < today) return 'overdue'
  return 'pending'
}

const STATUS_LABEL = {
  paid: 'Pago',
  overdue: 'Vencido',
  pending: 'Pendente',
}

const STATUS_COLOR = {
  paid: 'var(--color-success)',
  overdue: 'var(--color-error)',
  pending: 'var(--color-muted)',
}

const STATUS_BG = {
  paid: 'rgba(16,217,136,0.1)',
  overdue: 'rgba(255,92,122,0.1)',
  pending: 'rgba(255,255,255,0.05)',
}

export function BillsPage() {
  const { user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Filter tab
  const [tab, setTab] = useState<'pending' | 'paid' | 'all'>('pending')

  // Category dropdown (modal)
  const [isCatOpen, setIsCatOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      type: 'expense',
      due_date: new Date().toISOString().split('T')[0],
      amount: '' as any,
      name: '',
      category_id: '',
      notes: '',
    },
  })

  const formType = watch('type')
  const formCategoryId = watch('category_id')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg('')
    try {
      const [b, cats] = await Promise.all([getBills(user.id), categoriesService.getAll()])
      setBills(b)
      setCategories(cats)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingBill(null)
    reset({
      type: 'expense',
      due_date: new Date().toISOString().split('T')[0],
      amount: '' as any,
      name: '',
      category_id: '',
      notes: '',
    })
    setIsCatOpen(false)
    setIsModalOpen(true)
  }

  function openEdit(bill: Bill) {
    setEditingBill(bill)
    reset({
      type: bill.type,
      due_date: bill.due_date,
      amount: bill.amount,
      name: bill.name,
      category_id: bill.category_id || '',
      notes: bill.notes || '',
    })
    setIsCatOpen(false)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingBill(null)
  }

  async function onSubmit(data: BillFormValues) {
    if (!user) return
    try {
      const payload = {
        ...data,
        name: data.name.trim(),
        category_id: data.category_id || null,
        notes: data.notes?.trim() || null,
      }
      if (editingBill) {
        const updated = await updateBill(editingBill.id, user.id, payload)
        setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
      } else {
        const created = await createBill(user.id, payload)
        setBills(prev => [...prev, created].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      }
      closeModal()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    if (!window.confirm('Excluir esta conta?')) return
    try {
      setDeletingId(id)
      await deleteBill(id, user.id)
      setBills(prev => prev.filter(b => b.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function togglePaid(bill: Bill) {
    if (!user) return
    const action = bill.paid ? 'marcar como pendente' : 'marcar como paga'
    if (!window.confirm(`Deseja ${action} a conta "${bill.name}"?`)) return
    try {
      setTogglingId(bill.id)
      const updated = await updateBill(bill.id, user.id, { paid: !bill.paid })
      setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const filteredCategories = categories.filter(c => c.type === formType)

  const displayedBills = useMemo(() => {
    if (tab === 'all') return bills
    if (tab === 'paid') return bills.filter(b => b.paid)
    return bills.filter(b => !b.paid)
  }, [bills, tab])

  const counts = useMemo(() => ({
    pending: bills.filter(b => !b.paid).length,
    paid: bills.filter(b => b.paid).length,
    overdue: bills.filter(b => getStatus(b) === 'overdue').length,
  }), [bills])

  const totalPending = useMemo(() =>
    bills.filter(b => !b.paid && b.type === 'expense').reduce((s, b) => s + Number(b.amount), 0),
    [bills]
  )
  const totalReceivable = useMemo(() =>
    bills.filter(b => !b.paid && b.type === 'income').reduce((s, b) => s + Number(b.amount), 0),
    [bills]
  )

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={28} />
            Contas
          </h1>
          <p className="page-subtitle">Gerencie suas contas a pagar e a receber.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      {errorMsg && <div className="alert alert-error mb-16">{errorMsg}</div>}

      {/* Resumo */}
      {!loading && bills.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '6px' }}>A Pagar</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-error)' }}>{fmt(totalPending)}</p>
            {counts.overdue > 0 && (
              <p style={{ fontSize: '0.72rem', color: 'var(--color-error)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={11} /> {counts.overdue} vencida{counts.overdue > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div style={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '6px' }}>A Receber</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>{fmt(totalReceivable)}</p>
          </div>
          <div style={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '6px' }}>Pendentes</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{counts.pending}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && bills.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {([['pending', 'Pendentes'], ['paid', 'Pagas'], ['all', 'Todas']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: tab === key ? 'var(--color-primary)' : 'var(--color-border)',
                background: tab === key ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: tab === key ? 'var(--color-primary-light)' : 'var(--color-muted)',
              }}
            >
              {label}
              {key === 'pending' && counts.pending > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: counts.overdue > 0 ? 'var(--color-error)' : 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                }}>
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="loading-spinner" />
        </div>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} className="empty-icon" />
          <p className="empty-title">Nenhuma conta registrada</p>
          <p className="empty-sub">Adicione contas a pagar e a receber para não perder os prazos.</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} />
            Nova Conta
          </button>
        </div>
      ) : displayedBills.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={48} className="empty-icon" />
          <p className="empty-title">Nenhuma conta aqui</p>
          <p className="empty-sub">Tudo em dia por aqui!</p>
        </div>
      ) : (
        <div className="transactions-list">
          {displayedBills.map(bill => {
            const status = getStatus(bill)
            return (
              <div
                key={bill.id}
                className="transaction-item"
                style={{ opacity: deletingId === bill.id ? 0.5 : 1 }}
              >
                {/* Botão marcar pago */}
                <button
                  onClick={() => togglePaid(bill)}
                  disabled={togglingId === bill.id}
                  title={bill.paid ? 'Marcar como pendente' : 'Marcar como pago'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: bill.paid ? 'var(--color-success)' : 'var(--color-muted)',
                    flexShrink: 0,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {togglingId === bill.id
                    ? <div className="btn-spinner-sm" />
                    : bill.paid
                      ? <CheckCircle2 size={22} />
                      : <Circle size={22} />
                  }
                </button>

                <div className="txn-left" style={{ flex: 1 }}>
                  <div className={`txn-icon ${bill.type === 'income' ? 'txn-icon-income' : 'txn-icon-expense'}`}>
                    {bill.type === 'income' ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                  </div>
                  <div className="txn-details">
                    <span className="txn-name" style={{ textDecoration: bill.paid ? 'line-through' : 'none', opacity: bill.paid ? 0.6 : 1 }}>
                      {bill.name}
                    </span>
                    <div className="txn-meta">
                      <span className="txn-date">
                        <Calendar size={12} />
                        Vence {new Date(bill.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {bill.categories && (
                        <span className="txn-category">
                          <Tag size={12} />
                          {bill.categories.name}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: STATUS_COLOR[status],
                        background: STATUS_BG[status],
                        borderRadius: '6px',
                        padding: '2px 7px',
                      }}>
                        {status === 'overdue' && <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />}
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="txn-right">
                  <span className={`txn-amount ${bill.type === 'income' ? 'text-success' : ''}`}
                    style={{ opacity: bill.paid ? 0.5 : 1 }}>
                    {bill.type === 'income' ? '+' : '-'} {fmt(bill.amount)}
                  </span>
                  <div className="txn-actions">
                    <button className="btn-icon" onClick={() => openEdit(bill)} title="Editar" disabled={deletingId === bill.id}>
                      <Pencil size={18} />
                    </button>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(bill.id)} title="Excluir" disabled={deletingId === bill.id}>
                      {deletingId === bill.id ? <div className="btn-spinner-sm" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingBill ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Tipo */}
              <div className="form-group">
                <div className="type-selector">
                  <button
                    type="button"
                    className={`type-btn ${formType === 'expense' ? 'type-btn-active type-expense' : ''}`}
                    onClick={() => { setValue('type', 'expense'); setValue('category_id', '') }}
                  >
                    <ArrowDownCircle size={18} />
                    A Pagar
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${formType === 'income' ? 'type-btn-active type-income' : ''}`}
                    onClick={() => { setValue('type', 'income'); setValue('category_id', '') }}
                  >
                    <ArrowUpCircle size={18} />
                    A Receber
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Ex: Aluguel, Fatura, Salário..."
                  {...register('name')}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              {/* Valor */}
              <div className="form-group">
                <label className="form-label">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`form-input ${errors.amount ? 'input-error' : ''}`}
                  placeholder="0,00"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <span className="form-error">{errors.amount.message}</span>}
              </div>

              {/* Data de Vencimento */}
              <div className="form-group">
                <label className="form-label">Data de Vencimento *</label>
                <input
                  type="date"
                  className={`form-input ${errors.due_date ? 'input-error' : ''}`}
                  {...register('due_date')}
                />
                {errors.due_date && <span className="form-error">{errors.due_date.message}</span>}
              </div>

              {/* Categoria */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Categoria (Opcional)</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsCatOpen(v => !v)}
                  >
                    <span>
                      {formCategoryId
                        ? filteredCategories.find(c => c.id === formCategoryId)?.name || '-- Nenhuma --'
                        : '-- Nenhuma --'}
                    </span>
                    <ChevronDown size={18} className={`select-icon ${isCatOpen ? 'open' : ''}`} />
                  </button>
                  {isCatOpen && (
                    <div className="custom-select-dropdown">
                      <div
                        className={`custom-select-option ${!formCategoryId ? 'selected' : ''}`}
                        onClick={() => { setValue('category_id', ''); setIsCatOpen(false) }}
                      >
                        -- Nenhuma --
                      </div>
                      {filteredCategories.map(c => (
                        <div
                          key={c.id}
                          className={`custom-select-option ${formCategoryId === c.id ? 'selected' : ''}`}
                          onClick={() => { setValue('category_id', c.id); setIsCatOpen(false) }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="hidden" {...register('category_id')} />
              </div>

              {/* Observações */}
              <div className="form-group">
                <label className="form-label">Observações (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Detalhes adicionais..."
                  {...register('notes')}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <div className="btn-spinner" /> : editingBill ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
