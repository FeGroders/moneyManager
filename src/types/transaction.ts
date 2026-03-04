export type TransactionType = 'income' | 'expense'

export interface Transaction {
    id: string
    user_id: string
    name: string | null
    amount: number
    date: string // YYYY-MM-DD
    category_id: string | null
    account_id: string | null
    type: TransactionType
    created_at?: string

    // Relacionamentos (preenchido quando fazemos JOIN)
    categories?: {
        id: string
        name: string
    } | null
    accounts?: {
        id: string
        name: string
    } | null
}

export interface CreateTransactionInput {
    name?: string | null
    amount: number
    date: string
    category_id?: string | null
    account_id?: string | null
    type: TransactionType
}

export interface UpdateTransactionInput {
    name?: string | null
    amount?: number
    date?: string
    category_id?: string | null
    account_id?: string | null
    type?: TransactionType
}
