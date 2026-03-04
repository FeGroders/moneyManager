export type TransactionType = 'income' | 'expense'

export interface Transaction {
    id: string
    user_id: string
    name: string | null
    amount: number
    date: string // YYYY-MM-DD
    category_id: string | null
    type: TransactionType
    created_at?: string

    // Relacionamento (preenchido quando fazemos JOIN com a tabela de categorias)
    categories?: {
        id: string
        name: string
    } | null
}

export interface CreateTransactionInput {
    name?: string | null
    amount: number
    date: string
    category_id?: string | null
    type: TransactionType
}

export interface UpdateTransactionInput {
    name?: string | null
    amount?: number
    date?: string
    category_id?: string | null
    type?: TransactionType
}
