import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  Plus,
  Trash2,
  Pencil,
  X,
  CreditCard,
  Banknote,
  Landmark,
  PiggyBank,
  ChevronDown,
  ArrowLeftRight,
  GripVertical
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { accountsService } from '@/services/accountsService'
import { createTransfer } from '@/services/transferService'
import type { Account } from '@/types/account'

const accountSchema = z.object({
  name: z.string().min(1, 'O nome da conta é obrigatório.'),
  type: z.enum(['cash', 'checking', 'credit_card', 'savings']),
  balance: z.number({ invalid_type_error: 'Saldo inválido.' }),
})

type AccountFormValues = z.infer<typeof accountSchema>

const accountTypeLabels: Record<Account['type'], string> = {
  cash: 'Dinheiro Físico',
  checking: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  savings: 'Poupança / Investimento',
}

const accountTypeIcons: Record<Account['type'], React.ReactNode> = {
  cash: <Banknote size={24} />,
  checking: <Landmark size={24} />,
  credit_card: <CreditCard size={24} />,
  savings: <PiggyBank size={24} />,
}

// cash is excluded — it's auto-created and cannot be manually added
const accountTypeOptions: { value: Account['type']; label: string }[] = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'savings', label: 'Poupança / Investimento' },
]

export function WalletPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Custom select
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<Account['type']>('checking')
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Credit card extra fields
  const [creditLimit, setCreditLimit] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')

  // Transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [transferDesc, setTransferDesc] = useState('')
  const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false)
  const [isToDropdownOpen, setIsToDropdownOpen] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const fromDropdownRef = useRef<HTMLDivElement>(null)
  const toDropdownRef = useRef<HTMLDivElement>(null)

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<AccountFormValues>({
      resolver: zodResolver(accountSchema),
      defaultValues: { name: '', type: 'checking', balance: 0 },
    })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false)
      }
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(e.target as Node)) {
        setIsFromDropdownOpen(false)
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(e.target as Node)) {
        setIsToDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg('')
    try {
      let data = await accountsService.getAll(user.id)
      // Auto-create the Dinheiro (cash) account if none exists
      if (!data.find((a) => a.type === 'cash')) {
        try {
          await accountsService.create(user.id, { name: 'Dinheiro', type: 'cash', balance: 0 })
        } catch (createErr: any) {
          // Ignore duplicate key error (unique constraint) — can happen in Strict Mode
          if (!createErr.message?.includes('duplicate key') && !createErr.message?.includes('unique')) {
            throw createErr
          }
        }
        data = await accountsService.getAll(user.id)
      }
      setAccounts(data)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  function openCreateModal() {
    setEditingAccount(null)
    setSelectedType('checking')
    setIsTypeDropdownOpen(false)
    setCreditLimit('')
    setClosingDay('')
    setDueDay('')
    reset({ name: '', type: 'checking', balance: 0 })
    setIsModalOpen(true)
  }

  function openEditModal(acc: Account) {
    setEditingAccount(acc)
    setSelectedType(acc.type)
    setIsTypeDropdownOpen(false)
    setCreditLimit(acc.credit_limit != null ? String(acc.credit_limit) : '')
    setClosingDay(acc.closing_day != null ? String(acc.closing_day) : '')
    setDueDay(acc.due_day != null ? String(acc.due_day) : '')
    const formBalance = acc.type === 'credit_card' ? Math.abs(Number(acc.balance)) : Number(acc.balance)
    reset({ name: acc.name, type: acc.type, balance: formBalance })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingAccount(null)
    setIsTypeDropdownOpen(false)
  }

  function selectType(type: Account['type']) {
    setSelectedType(type)
    setValue('type', type)
    setIsTypeDropdownOpen(false)
  }

  async function onSubmit(data: AccountFormValues) {
    if (!user) return
    
    let finalBalance = data.balance
    if (data.type === 'credit_card') {
      finalBalance = -Math.abs(data.balance)
    }

    const ccFields = data.type === 'credit_card' ? {
      credit_limit: parseFloat(creditLimit) || 0,
      closing_day: parseInt(closingDay) || undefined,
      due_day: parseInt(dueDay) || undefined,
    } : { credit_limit: undefined, closing_day: undefined, due_day: undefined }
    try {
      if (editingAccount) {
        await accountsService.update(editingAccount.id, user.id, { ...data, balance: finalBalance, ...ccFields })
      } else {
        await accountsService.create(user.id, { ...data, balance: finalBalance, ...ccFields })
      }
      closeModal()
      fetchAccounts()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return
    try {
      setDeletingId(id)
      await accountsService.delete(id, user.id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDragEnd() {
    if (!user || draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newAccounts = [...accounts]
    const [moved] = newAccounts.splice(draggedIndex, 1)
    newAccounts.splice(dragOverIndex, 0, moved)

    setAccounts(newAccounts) // optimistic update
    setDraggedIndex(null)
    setDragOverIndex(null)

    try {
      const updates = newAccounts.map((acc, i) => ({ id: acc.id, order_index: i }))
      await accountsService.updateOrder(user.id, updates)
    } catch (err: any) {
      setErrorMsg('Erro ao reordenar: ' + err.message)
      fetchAccounts() // revert on error
    }
  }

  const totalBalance = accounts.reduce((acc, a) => {
    const bal = Number(a.balance)
    const actualBal = (a.type === 'credit_card' && bal > 0) ? -bal : bal
    return acc + actualBal
  }, 0)

  function openTransferModal() {
    const cashAcc = accounts.find((a) => a.type === 'cash')
    setTransferFrom(cashAcc?.id || '')
    setTransferTo('')
    setTransferAmount('')
    setTransferDate(new Date().toISOString().split('T')[0])
    setTransferDesc('')
    setTransferError('')
    setIsFromDropdownOpen(false)
    setIsToDropdownOpen(false)
    setIsTransferModalOpen(true)
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const amt = parseFloat(transferAmount)
    if (!transferFrom || !transferTo || isNaN(amt) || amt <= 0) {
      setTransferError('Preencha todos os campos corretamente.')
      return
    }
    if (transferFrom === transferTo) {
      setTransferError('A conta de origem e destino devem ser diferentes.')
      return
    }
    try {
      setIsTransferring(true)
      setTransferError('')
      await createTransfer(user.id, {
        fromAccountId: transferFrom,
        toAccountId: transferTo,
        amount: amt,
        date: transferDate,
        description: transferDesc || null,
      })
      setIsTransferModalOpen(false)
      fetchAccounts()
    } catch (err: any) {
      setTransferError(err.message)
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Wallet size={28} />Carteira</h1>
          <p className="page-subtitle">Gerencie suas contas, cartões e saldo atual.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={openTransferModal}>
            <ArrowLeftRight size={18} />
            Transferência
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />Nova Conta
          </button>
        </div>
      </div>

      <div className="dashboard-card mb-8">
        <div className="card-title" style={{ marginBottom: 8 }}>Saldo Total Disponível</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: totalBalance >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
        </div>
      </div>

      {errorMsg && <div className="alert alert-error mb-16">{errorMsg}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}><div className="loading-spinner" /></div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <Wallet size={48} className="empty-icon" />
          <p className="empty-title">Nenhuma conta cadastrada</p>
          <p className="empty-sub">Adicione sua conta corrente, poupança ou dinheiro na carteira para começar.</p>
          <button className="btn btn-primary" onClick={openCreateModal}><Plus size={18} />Nova Conta</button>
        </div>
      ) : (
        <div className="transactions-list">
          {accounts.map((acc, idx) => {
            const bal = Number(acc.balance)
            const displayBal = (acc.type === 'credit_card' && bal > 0) ? -bal : bal
            
            return (
            <div
              key={acc.id}
              className={`transaction-item account-card-clickable ${deletingId === acc.id ? 'txn-deleting' : ''}`}
              onClick={() => navigate(`/wallet/${acc.id}`)}
              style={{
                position: 'relative',
                opacity: draggedIndex === idx ? 0.5 : 1,
                borderTop: dragOverIndex === idx && draggedIndex !== null && draggedIndex > idx ? '2px solid var(--color-primary)' : '',
                borderBottom: dragOverIndex === idx && draggedIndex !== null && draggedIndex < idx ? '2px solid var(--color-primary)' : '',
                transition: 'border 0.2s',
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDraggedIndex(idx)
              }}
              onDragOver={(e) => {
                e.preventDefault() // necessary to allow dropping
                if (draggedIndex !== null && draggedIndex !== idx) setDragOverIndex(idx)
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault()
                handleDragEnd()
              }}
              onDragEnd={() => {
                setDraggedIndex(null)
                setDragOverIndex(null)
              }}
            >
              <div className="txn-left">
                <div style={{ marginRight: 8, cursor: 'grab', color: 'var(--color-muted)' }} onClick={(e) => e.stopPropagation()}>
                  <GripVertical size={20} />
                </div>
                <div className="txn-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-primary-light)' }}>
                  {accountTypeIcons[acc.type]}
                </div>
                <div className="txn-details">
                  <span className="txn-name">{acc.name}</span>
                  <div className="txn-meta">
                    <span className="txn-category">{accountTypeLabels[acc.type]}</span>
                  </div>
                </div>
              </div>
              <div className="txn-right">
                <span className={`txn-amount ${displayBal >= 0 && acc.type !== 'credit_card' ? 'text-success' : ''}`} style={displayBal < 0 ? { color: 'var(--color-error)' } : {}}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayBal)}
                </span>
                {acc.type !== 'cash' && (
                  <div className="txn-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openEditModal(acc)} title="Editar" disabled={deletingId === acc.id}><Pencil size={18} /></button>
                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(acc.id)} title="Excluir" disabled={deletingId === acc.id}>
                      {deletingId === acc.id ? <div className="btn-spinner-sm" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingAccount ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="form-label">Nome da Conta *</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Ex: Nubank, Carteira Física..."
                  {...register('name')}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              {/* Custom Type Select */}
              <div className="form-group" ref={typeDropdownRef}>
                <label className="form-label">Tipo de Conta *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className="form-input custom-select-trigger"
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  >
                    <span>{accountTypeLabels[selectedType]}</span>
                    <ChevronDown size={18} className={`select-icon ${isTypeDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isTypeDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {accountTypeOptions.map((opt) => (
                        <div
                          key={opt.value}
                          className={`custom-select-option ${selectedType === opt.value ? 'selected' : ''}`}
                          onClick={() => selectType(opt.value)}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="hidden" {...register('type')} />
                {errors.type && <span className="form-error">{errors.type.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {selectedType === 'credit_card' ? 'Fatura Atual (valor devido)' : 'Saldo Atual'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={`form-input ${errors.balance ? 'input-error' : ''}`}
                  placeholder={selectedType === 'credit_card' ? 'Valor da fatura atual (negativo)' : '0,00'}
                  {...register('balance', { valueAsNumber: true })}
                />
                {errors.balance && <span className="form-error">{errors.balance.message}</span>}
              </div>

              {/* Campos extras para cartão de crédito */}
              {selectedType === 'credit_card' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Limite do Cartão</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="Ex: 5000,00"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Dia de Fechamento</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        className="form-input"
                        placeholder="Ex: 10"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dia de Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        className="form-input"
                        placeholder="Ex: 20"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <div className="btn-spinner" /> : editingAccount ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {isTransferModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><ArrowLeftRight size={20} />Transferência entre Contas</h2>
              <button className="modal-close" onClick={() => setIsTransferModalOpen(false)}><X size={20} /></button>
            </div>

            <form className="modal-form" onSubmit={handleTransfer}>
              {transferError && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>{transferError}</div>
              )}

              {/* De (Origem) */}
              <div className="form-group" ref={fromDropdownRef}>
                <label className="form-label">De (Origem) *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className={`form-input custom-select-trigger ${!transferFrom ? 'input-error' : ''}`}
                    onClick={() => { setIsFromDropdownOpen(!isFromDropdownOpen); setIsToDropdownOpen(false) }}
                  >
                    <span>{transferFrom ? accounts.find((a) => a.id === transferFrom)?.name || 'Selecione' : 'Selecione a conta'}</span>
                    <ChevronDown size={18} className={`select-icon ${isFromDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isFromDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {accounts.filter((a) => a.id !== transferTo).map((a) => (
                        <div
                          key={a.id}
                          className={`custom-select-option ${transferFrom === a.id ? 'selected' : ''}`}
                          onClick={() => { setTransferFrom(a.id); setIsFromDropdownOpen(false) }}
                        >
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Para (Destino) */}
              <div className="form-group" ref={toDropdownRef}>
                <label className="form-label">Para (Destino) *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className={`form-input custom-select-trigger ${!transferTo ? 'input-error' : ''}`}
                    onClick={() => { setIsToDropdownOpen(!isToDropdownOpen); setIsFromDropdownOpen(false) }}
                  >
                    <span>{transferTo ? accounts.find((a) => a.id === transferTo)?.name || 'Selecione' : 'Selecione a conta'}</span>
                    <ChevronDown size={18} className={`select-icon ${isToDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isToDropdownOpen && (
                    <div className="custom-select-dropdown">
                      {accounts.filter((a) => a.id !== transferFrom).map((a) => (
                        <div
                          key={a.id}
                          className={`custom-select-option ${transferTo === a.id ? 'selected' : ''}`}
                          onClick={() => { setTransferTo(a.id); setIsToDropdownOpen(false) }}
                        >
                          {a.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="form-group">
                <label className="form-label">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="0,00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                />
              </div>

              {/* Data */}
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  className="form-input"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                />
              </div>

              {/* Descrição */}
              <div className="form-group">
                <label className="form-label">Descrição (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Pagamento de cartão, Reserva..."
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsTransferModalOpen(false)} disabled={isTransferring}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isTransferring}>
                  {isTransferring ? <div className="btn-spinner" /> : <><ArrowLeftRight size={16} />Transferir</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
