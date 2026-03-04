import { useState, useEffect, useCallback } from 'react'
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
import type { Transaction } from '@/types/transaction'
import type { Category } from '@/types/category'

const transactionSchema = z.object({
  name: z.string().optional().nullable(),
  amount: z
    .number({ invalid_type_error: 'Valor inválido.' })
    .positive('O valor deve ser maior que zero.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  category_id: z.string().optional().nullable(),
  type: z.enum(['income', 'expense']),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

export function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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

  const fetchTransactionsAndCategories = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg('')

    try {
      const cats = await categoriesService.getAll()
      setCategories(cats)
    } catch (err: any) {
      console.error("Erro categorias:", err)
      setErrorMsg(prev => prev ? `${prev} | Erro Categorias: ${err.message}` : `Erro Categorias: ${err.message}`)
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
    reset({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: '' as any, // Para não aparecer 0 no input
      name: '',
      category_id: '',
    })
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
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingTransaction(null)
  }

  async function onSubmit(data: TransactionFormValues) {
    if (!user) return
    try {
      // Normalizando os dados vazios para null para o banco
      const payload = {
        ...data,
        name: data.name?.trim() || null,
        category_id: data.category_id || null,
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
              <div className="form-group">
                <label className="form-label">Categoria (Opcional)</label>
                <select
                  className="form-input"
                  {...register('category_id')}
                >
                  <option value="">-- Nenhuma --</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {filteredCategories.length === 0 && (
                  <span className="form-error" style={{ color: 'var(--color-muted)' }}>
                    {`Nenhuma categoria de ${formType === 'expense' ? 'saída' : 'entrada'} encontrada.`}
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
