import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getRecurrings,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '@/services/recurringService'
import { accountsService } from '@/services/accountsService'
import { categoriesService } from '@/services/categoriesService'
import type { RecurringTransaction, CreateRecurringInput } from '@/types/recurring'
import type { Account } from '@/types/account'
import type { Category } from '@/types/category'

const EMPTY_FORM: CreateRecurringInput = {
  name: '',
  amount: 0,
  type: 'expense',
  category_id: null,
  account_id: null,
  day_of_month: 1,
  active: true,
}

export function RecurrentsPage() {
  const { user } = useAuth()
  const [recurrings, setRecurrings] = useState<RecurringTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateRecurringInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Custom Select States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const accountDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false)
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const [recs, accs, cats] = await Promise.all([
        getRecurrings(user.id),
        accountsService.getAll(user.id),
        categoriesService.getAll(),
      ])
      setRecurrings(recs)
      setAccounts(accs)
      setCategories(cats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar recorrentes')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsCategoryDropdownOpen(false)
    setIsAccountDropdownOpen(false)
    setModalOpen(true)
  }

  function openEdit(rec: RecurringTransaction) {
    setEditingId(rec.id)
    setForm({
      name: rec.name,
      amount: rec.amount,
      type: rec.type,
      category_id: rec.category_id,
      account_id: rec.account_id,
      day_of_month: rec.day_of_month,
      active: rec.active,
    })
    setFormError(null)
    setIsCategoryDropdownOpen(false)
    setIsAccountDropdownOpen(false)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
    setFormError(null)
    setIsCategoryDropdownOpen(false)
    setIsAccountDropdownOpen(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!form.name.trim()) { setFormError('Informe a descrição.'); return }
    if (!form.amount || form.amount <= 0) { setFormError('Informe um valor positivo.'); return }
    if (!form.day_of_month || form.day_of_month < 1 || form.day_of_month > 31) {
      setFormError('Dia do mês deve estar entre 1 e 31.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const updated = await updateRecurring(editingId, user.id, form)
        setRecurrings(prev => prev.map(r => r.id === editingId ? updated : r))
      } else {
        const created = await createRecurring(user.id, form)
        setRecurrings(prev => [...prev, created].sort((a, b) => a.day_of_month - b.day_of_month))
      }
      setModalOpen(false)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!user || !deleteId) return
    setDeleting(true)
    try {
      await deleteRecurring(deleteId, user.id)
      setRecurrings(prev => prev.filter(r => r.id !== deleteId))
      setDeleteId(null)
    } catch (e: unknown) {
      console.error('Erro ao deletar:', e)
    } finally {
      setDeleting(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === form.type || !c.type)
  const incomes = recurrings.filter(r => r.type === 'income')
  const expenses = recurrings.filter(r => r.type === 'expense')

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const ordinal = (d: number) => {
    if (d === 1) return 'Todo dia 1°'
    return `Todo dia ${d}`
  }

  if (loading) {
    return (
      <div className="recurring-loading">
        <Loader2 size={28} className="recurring-spinner" />
        <span>Carregando recorrentes…</span>
      </div>
    )
  }

  return (
    <div className="recurring-page">
      {/* Header */}
      <div className="recurring-header">
        <div className="recurring-title-group">
          <RefreshCw size={22} className="recurring-title-icon" />
          <div>
            <h1 className="recurring-title">Recorrentes</h1>
            <p className="recurring-subtitle">Cobranças e receitas mensais automáticas</p>
          </div>
        </div>
        <button className="btn-primary recurring-add-btn" onClick={openCreate}>
          <Plus size={18} />
          Nova Recorrente
        </button>
      </div>

      {error && (
        <div className="recurring-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="recurring-sections">
        {/* Saídas */}
        <section className="recurring-section">
          <div className="recurring-section-header expense-header">
            <TrendingDown size={18} />
            <h2>Saídas Recorrentes</h2>
            <span className="recurring-count">{expenses.length}</span>
          </div>

          {expenses.length === 0 ? (
            <div className="recurring-empty">
              <p>Nenhuma saída recorrente cadastrada.</p>
            </div>
          ) : (
            <div className="recurring-list">
              {expenses.map(rec => (
                <RecurringCard
                  key={rec.id}
                  rec={rec}
                  formatCurrency={formatCurrency}
                  ordinal={ordinal}
                  onEdit={() => openEdit(rec)}
                  onDelete={() => setDeleteId(rec.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Entradas */}
        <section className="recurring-section">
          <div className="recurring-section-header income-header">
            <TrendingUp size={18} />
            <h2>Entradas Recorrentes</h2>
            <span className="recurring-count">{incomes.length}</span>
          </div>

          {incomes.length === 0 ? (
            <div className="recurring-empty">
              <p>Nenhuma entrada recorrente cadastrada.</p>
            </div>
          ) : (
            <div className="recurring-list">
              {incomes.map(rec => (
                <RecurringCard
                  key={rec.id}
                  rec={rec}
                  formatCurrency={formatCurrency}
                  ordinal={ordinal}
                  onEdit={() => openEdit(rec)}
                  onDelete={() => setDeleteId(rec.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal recurring-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Recorrente' : 'Nova Recorrente'}</h2>
              <button className="modal-close" onClick={closeModal} disabled={saving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {/* Tipo */}
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={`type-btn ${form.type === 'expense' ? 'type-btn-expense-active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, type: 'expense', category_id: null }))}
                  >
                    <TrendingDown size={16} /> Saída
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${form.type === 'income' ? 'type-btn-income-active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, type: 'income', category_id: null }))}
                  >
                    <TrendingUp size={16} /> Entrada
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div className="form-group">
                <label className="form-label" htmlFor="rec-name">Descrição</label>
                <input
                  id="rec-name"
                  className="form-input"
                  type="text"
                  placeholder="Ex: Netflix, Salário, Aluguel…"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {/* Valor e Dia */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="rec-amount">Valor (R$)</label>
                  <div className="input-icon-wrap">
                    <DollarSign size={16} className="input-icon" />
                    <input
                      id="rec-amount"
                      className="form-input input-with-icon"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0,00"
                      value={form.amount || ''}
                      onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="rec-day">Dia do Mês</label>
                  <div className="input-icon-wrap">
                    <Calendar size={16} className="input-icon" />
                    <input
                      id="rec-day"
                      className="form-input input-with-icon"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1–31"
                      value={form.day_of_month || ''}
                      onChange={e => setForm(f => ({ ...f, day_of_month: parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Categoria */}
              <div className="form-group" ref={categoryDropdownRef}>
                <label className="form-label" htmlFor="rec-category">Categoria</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  >
                    <span>
                      {form.category_id
                        ? filteredCategories.find(c => c.id === form.category_id)?.name || '— Sem categoria —'
                        : '— Sem categoria —'}
                    </span>
                    <ChevronDown size={18} className={`select-icon ${isCategoryDropdownOpen ? 'open' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="custom-select-dropdown">
                      <div
                        className={`custom-select-option ${!form.category_id ? 'selected' : ''}`}
                        onClick={() => {
                          setForm(f => ({ ...f, category_id: null }))
                          setIsCategoryDropdownOpen(false)
                        }}
                      >
                        — Sem categoria —
                      </div>
                      {filteredCategories.map(c => (
                        <div
                          key={c.id}
                          className={`custom-select-option ${form.category_id === c.id ? 'selected' : ''}`}
                          onClick={() => {
                            setForm(f => ({ ...f, category_id: c.id }))
                            setIsCategoryDropdownOpen(false)
                          }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conta */}
              <div className="form-group" ref={accountDropdownRef}>
                <label className="form-label" htmlFor="rec-account">Conta</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  >
                    <span>
                      {form.account_id
                        ? accounts.find(a => a.id === form.account_id)?.name || '— Sem conta —'
                        : '— Sem conta —'}
                    </span>
                    <ChevronDown size={18} className={`select-icon ${isAccountDropdownOpen ? 'open' : ''}`} />
                  </button>

                  {isAccountDropdownOpen && (
                    <div className="custom-select-dropdown">
                      <div
                        className={`custom-select-option ${!form.account_id ? 'selected' : ''}`}
                        onClick={() => {
                          setForm(f => ({ ...f, account_id: null }))
                          setIsAccountDropdownOpen(false)
                        }}
                      >
                        — Sem conta —
                      </div>
                      {accounts.map(a => (
                        <div
                          key={a.id}
                          className={`custom-select-option ${form.account_id === a.id ? 'selected' : ''}`}
                          onClick={() => {
                            setForm(f => ({ ...f, account_id: a.id }))
                            setIsAccountDropdownOpen(false)
                          }}
                        >
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ativo */}
              <div className="form-group form-group-inline">
                <label className="toggle-label" htmlFor="rec-active">
                  <span>Ativa</span>
                  <span className="toggle-hint">Recorrentes inativas não geram transações automáticas</span>
                </label>
                <label className="toggle-switch">
                  <input
                    id="rec-active"
                    type="checkbox"
                    checked={form.active ?? true}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {formError && (
                <div className="form-error">
                  <AlertCircle size={15} />
                  {formError}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : null}
                  {editingId ? 'Salvar Alterações' : 'Criar Recorrente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Delete */}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteId(null)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Excluir Recorrente</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)} disabled={deleting}>
                <X size={20} />
              </button>
            </div>
            <p className="confirm-text">
              Tem certeza que deseja excluir esta recorrente? As transações já geradas <strong>não</strong> serão removidas.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface RecurringCardProps {
  rec: RecurringTransaction
  formatCurrency: (v: number) => string
  ordinal: (d: number) => string
  onEdit: () => void
  onDelete: () => void
}

function RecurringCard({ rec, formatCurrency, ordinal, onEdit, onDelete }: RecurringCardProps) {
  const isExpense = rec.type === 'expense'
  return (
    <div className={`recurring-card ${!rec.active ? 'recurring-card-inactive' : ''}`}>
      <div className={`recurring-card-icon ${isExpense ? 'icon-expense' : 'icon-income'}`}>
        {isExpense ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
      </div>

      <div className="recurring-card-body">
        <div className="recurring-card-name">
          {rec.name}
          {!rec.active && <span className="badge-inactive">Inativa</span>}
        </div>
        <div className="recurring-card-meta">
          <span className="recurring-card-day">
            <Calendar size={13} />
            {ordinal(rec.day_of_month)}
          </span>
          {rec.categories && (
            <span className="recurring-card-tag">{rec.categories.name}</span>
          )}
          {rec.accounts && (
            <span className="recurring-card-tag">{rec.accounts.name}</span>
          )}
        </div>
      </div>

      <div className={`recurring-card-amount ${isExpense ? 'amount-expense' : 'amount-income'}`}>
        {isExpense ? '−' : '+'}{formatCurrency(rec.amount)}
      </div>

      <div className="recurring-card-actions">
        <button className="icon-btn" onClick={onEdit} title="Editar">
          <Pencil size={16} />
        </button>
        <button className="icon-btn icon-btn-danger" onClick={onDelete} title="Excluir">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
