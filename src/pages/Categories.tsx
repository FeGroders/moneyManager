import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tag, ArrowUpCircle, ArrowDownCircle, X, Check, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { categoriesService } from '@/services/categoriesService'
import type { Category, CategoryFormData } from '@/types/category'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Máximo 50 caracteres'),
  type: z.enum(['income', 'expense'], { required_error: 'Selecione o tipo' }),
})

type FormData = z.infer<typeof categorySchema>

// ─── Componente do modal de criação/edição ─────────────────────────
interface CategoryModalProps {
  editing: Category | null
  onClose: () => void
  onSave: (data: FormData) => Promise<void>
}

function CategoryModal({ editing, onClose, onSave }: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: editing
      ? { name: editing.name, type: editing.type }
      : { name: '', type: 'expense' },
  })

  const selectedType = watch('type')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editing ? 'Editar categoria' : 'Nova categoria'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="modal-form">
          {/* Nome */}
          <div className="form-group">
            <label htmlFor="cat-name" className="form-label">Nome</label>
            <input
              id="cat-name"
              type="text"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              placeholder="Ex: Alimentação, Salário..."
              maxLength={50}
              {...register('name')}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div className="type-selector">
              <button
                type="button"
                id="type-expense"
                className={`type-btn type-expense ${selectedType === 'expense' ? 'type-btn-active' : ''}`}
                onClick={() => setValue('type', 'expense', { shouldValidate: true })}
              >
                <ArrowDownCircle size={18} />
                Saída
              </button>
              <button
                type="button"
                id="type-income"
                className={`type-btn type-income ${selectedType === 'income' ? 'type-btn-active' : ''}`}
                onClick={() => setValue('type', 'income', { shouldValidate: true })}
              >
                <ArrowUpCircle size={18} />
                Entrada
              </button>
            </div>
            {errors.type && <span className="form-error">{errors.type.message}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-category"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="btn-spinner" /> : <><Check size={16} /> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal de categorias ───────────────────────────────
export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await categoriesService.getAll()
      setCategories(data)
    } catch {
      setError('Erro ao carregar categorias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(cat: Category) { setEditing(cat); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  async function handleSave(data: FormData) {
    if (editing) {
      await categoriesService.update(editing.id, data as CategoryFormData)
    } else {
      await categoriesService.create(data as CategoryFormData)
    }
    closeModal()
    load()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await categoriesService.remove(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Erro ao excluir categoria.')
    } finally {
      setDeletingId(null)
    }
  }

  const income  = categories.filter((c) => c.type === 'income')
  const expense = categories.filter((c) => c.type === 'expense')

  return (
    <div className="page">
      {/* Cabeçalho da página */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Tag size={24} />
            Categorias
          </h1>
          <p className="page-subtitle">Organize suas entradas e saídas por categoria</p>
        </div>
        <button id="btn-new-category" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Nova categoria
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>
          <div className="loading-spinner" />
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <Tag size={48} className="empty-icon" />
          <p className="empty-title">Nenhuma categoria ainda</p>
          <p className="empty-sub">Crie sua primeira categoria para começar</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Criar categoria
          </button>
        </div>
      ) : (
        <div className="categories-grid">
          {/* Saídas */}
          {expense.length > 0 && (
            <section className="category-section">
              <h2 className="category-section-title expense-title">
                <ArrowDownCircle size={18} />
                Saídas <span className="cat-count">{expense.length}</span>
              </h2>
              <ul className="category-list">
                {expense.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    cat={cat}
                    deleting={deletingId === cat.id}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => handleDelete(cat.id)}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Entradas */}
          {income.length > 0 && (
            <section className="category-section">
              <h2 className="category-section-title income-title">
                <ArrowUpCircle size={18} />
                Entradas <span className="cat-count">{income.length}</span>
              </h2>
              <ul className="category-list">
                {income.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    cat={cat}
                    deleting={deletingId === cat.id}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => handleDelete(cat.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {modalOpen && (
        <CategoryModal
          editing={editing}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ─── Item da lista ─────────────────────────────────────────────────
interface CategoryItemProps {
  cat: Category
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function CategoryItem({ cat, deleting, onEdit, onDelete }: CategoryItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className={`category-item ${deleting ? 'cat-deleting' : ''}`}>
      <div className="cat-info">
        <span className={`cat-badge ${cat.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
          {cat.type === 'income' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
        </span>
        <span className="cat-name">{cat.name}</span>
      </div>

      <div className="cat-actions">
        {confirmDelete ? (
          <>
            <span className="cat-confirm-text">Excluir?</span>
            <button
              className="btn-icon btn-icon-danger"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Confirmar exclusão"
            >
              {deleting ? <span className="btn-spinner-sm" /> : <Check size={15} />}
            </button>
            <button
              className="btn-icon"
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancelar"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-icon"
              onClick={onEdit}
              aria-label="Editar"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setConfirmDelete(true)}
              aria-label="Excluir"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}
