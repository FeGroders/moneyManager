import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowUpDown,
  Plus,
  Trash2,
  Pencil,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Calendar,
  Tag,
  ChevronDown,
  Wallet,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactionsService'
import { categoriesService } from '@/services/categoriesService'
import { accountsService } from '@/services/accountsService'
import type { Transaction } from '@/types/transaction'
import type { Category } from '@/types/category'
import type { Account } from '@/types/account'

const transactionSchema = z.object({
  name: z.string().optional().nullable(),
  amount: z
    .number({ invalid_type_error: 'Valor inválido.' })
    .positive('O valor deve ser maior que zero.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  category_id: z.string().optional().nullable(),
  account_id: z.string().min(1, 'Selecione uma conta.'),
  type: z.enum(['income', 'expense']),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

export function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  
  // Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0], // Hoje
      amount: 0,
      name: '',
      category_id: '',
    },
  })

  const formType = watch('type')
  const formCategoryId = watch('category_id')
  const formAccountId = watch('account_id')

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

  const fetchTransactionsAndCategories = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg('')

    try {
      const [cats, accs] = await Promise.all([
        categoriesService.getAll(),
        user ? accountsService.getAll(user.id) : Promise.resolve([]),
      ])
      setCategories(cats)
      setAccounts(accs)
    } catch (err: any) {
      console.error('Erro categorias/contas:', err)
      setErrorMsg(prev => prev ? `${prev} | ${err.message}` : err.message)
    }

    try {
      const txns = await getTransactions(user.id)
      setTransactions(txns)
    } catch (err: any) {
      console.error("Erro transações:", err)
      setErrorMsg(prev => prev ? `${prev} | Erro Movimentações: ${err.message}` : `Erro Movimentações: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTransactionsAndCategories()
  }, [fetchTransactionsAndCategories])

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openCreateModal()
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  function openCreateModal() {
    setEditingTransaction(null)
    const cashAccount = accounts.find((a) => a.type === 'cash')
    reset({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: '' as any,
      name: '',
      category_id: '',
      account_id: cashAccount?.id || '',
    })
    setIsCategoryDropdownOpen(false)
    setIsAccountDropdownOpen(false)
    setIsModalOpen(true)
  }

  function openEditModal(txn: Transaction) {
    setEditingTransaction(txn)
    reset({
      type: txn.type,
      date: txn.date,
      amount: txn.amount,
      name: txn.name || '',
      category_id: txn.category_id || '',
      account_id: txn.account_id || '',
    })
    setIsCategoryDropdownOpen(false)
    setIsAccountDropdownOpen(false)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingTransaction(null)
  }

  async function onSubmit(data: TransactionFormValues) {
    if (!user) return
    try {
      const payload = {
        ...data,
        name: data.name?.trim() || null,
        category_id: data.category_id || null,
        account_id: data.account_id || null,
      }

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, user.id, payload)
      } else {
        await createTransaction(user.id, payload)
      }

      closeModal()
      fetchTransactionsAndCategories()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return

    try {
      setDeletingId(id)
      await deleteTransaction(id, user.id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Filtrar categorias com base no tipo selecionado no modal
  const filteredCategories = categories.filter((c) => c.type === formType)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ArrowUpDown size={28} />
            Movimentações
          </h1>
          <p className="page-subtitle">
            Gerencie suas entradas e saídas.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          Nova Movimentação
        </button>
      </div>

      {errorMsg && <div className="alert alert-error mb-16">{errorMsg}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="loading-spinner" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <ArrowUpDown size={48} className="empty-icon" />
          <p className="empty-title">Nenhuma movimentação registrada</p>
          <p className="empty-sub">
            Adicione suas despesas e receitas para acompanhar seu saldo.
          </p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Nova Movimentação
          </button>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className={`transaction-item ${deletingId === txn.id ? 'txn-deleting' : ''}`}
            >
              <div className="txn-left">
                <div className={`txn-icon ${txn.type === 'income' ? 'txn-icon-income' : 'txn-icon-expense'}`}>
                  {txn.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>
                <div className="txn-details">
                  <span className="txn-name">
                    {txn.name || (txn.type === 'income' ? 'Nova Entrada' : 'Nova Saída')}
                  </span>
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
                    {txn.accounts && (
                      <span className="txn-category" style={{ color: 'var(--color-primary-light)' }}>
                        <Wallet size={12} />
                        {txn.accounts.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="txn-right">
                <span className={`txn-amount ${txn.type === 'income' ? 'text-success' : ''}`}>
                  {txn.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(txn.amount)}
                </span>
                <div className="txn-actions">
                  <button
                    className="btn-icon"
                    onClick={() => openEditModal(txn)}
                    title="Editar"
                    disabled={deletingId === txn.id}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDelete(txn.id)}
                    title="Excluir"
                    disabled={deletingId === txn.id}
                  >
                    {deletingId === txn.id ? (
                      <div className="btn-spinner-sm" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova/Editar Movimentação */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
              {/* Tipo (Income / Expense) */}
              <div className="form-group">
                <div className="type-selector">
                  <button
                    type="button"
                    className={`type-btn ${formType === 'expense' ? 'type-btn-active type-expense' : ''}`}
                    onClick={() => setValue('type', 'expense')}
                  >
                    <ArrowDownCircle size={18} />
                    Saída
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${formType === 'income' ? 'type-btn-active type-income' : ''}`}
                    onClick={() => setValue('type', 'income')}
                  >
                    <ArrowUpCircle size={18} />
                    Entrada
                  </button>
                </div>
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
                {errors.amount && (
                  <span className="form-error">{errors.amount.message}</span>
                )}
              </div>

              {/* Data */}
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  className={`form-input ${errors.date ? 'input-error' : ''}`}
                  {...register('date')}
                />
                {errors.date && (
                  <span className="form-error">{errors.date.message}</span>
                )}
              </div>

              {/* Categoria */}
              <div className="form-group" ref={categoryDropdownRef}>
                <label className="form-label">Categoria (Opcional)</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  >
                    <span>
                      {formCategoryId
                        ? filteredCategories.find((c) => c.id === formCategoryId)?.name || '-- Nenhuma --'
                        : '-- Nenhuma --'}
                    </span>
                    <ChevronDown size={18} className={`select-icon ${isCategoryDropdownOpen ? 'open' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="custom-select-dropdown">
                      <div
                        className={`custom-select-option ${!formCategoryId ? 'selected' : ''}`}
                        onClick={() => {
                          setValue('category_id', '')
                          setIsCategoryDropdownOpen(false)
                        }}
                      >
                        -- Nenhuma --
                      </div>
                      {filteredCategories.map((c) => (
                        <div
                          key={c.id}
                          className={`custom-select-option ${formCategoryId === c.id ? 'selected' : ''}`}
                          onClick={() => {
                            setValue('category_id', c.id)
                            setIsCategoryDropdownOpen(false)
                          }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Hidden input to ensure register works if needed */}
                <input type="hidden" {...register('category_id')} />

                {filteredCategories.length === 0 && (
                  <span className="form-error" style={{ color: 'var(--color-muted)' }}>
                    {`Nenhuma categoria de ${formType === 'expense' ? 'saída' : 'entrada'} encontrada.`}
                  </span>
                )}
              </div>

              {/* Conta */}
              <div className="form-group" ref={accountDropdownRef}>
                <label className="form-label">Conta *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className={`form-input custom-select-trigger ${!formAccountId ? 'input-error' : ''}`}
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  >
                    <span>
                      {formAccountId
                        ? accounts.find((a) => a.id === formAccountId)?.name || 'Selecione uma conta'
                        : 'Selecione uma conta'}
                    </span>
                    <ChevronDown size={18} className={`select-icon ${isAccountDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isAccountDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {accounts.map((a) => (
                        <div
                          key={a.id}
                          className={`custom-select-option ${formAccountId === a.id ? 'selected' : ''}`}
                          onClick={() => { setValue('account_id', a.id); setIsAccountDropdownOpen(false) }}
                        >
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="hidden" {...register('account_id')} />
                {accounts.length === 0 && (
                  <span className="form-error" style={{ color: 'var(--color-muted)' }}>
                    Cadastre contas na Carteira para vinculá-las.
                  </span>
                )}
              </div>

              {/* Nome */}
              <div className="form-group">
                <label className="form-label">Descrição (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Supermercado, Salário..."
                  {...register('name')}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="btn-spinner" />
                  ) : editingTransaction ? (
                    'Salvar'
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
