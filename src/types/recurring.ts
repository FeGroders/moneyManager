import type { TransactionType } from './transaction'

export interface RecurringTransaction {
    id: string
    user_id: string
    name: string
    amount: number
    type: TransactionType
    category_id: string | null
    account_id: string | null
    day_of_month: number
    active: boolean
    created_at: string

    // Relacionamentos (preenchido via JOIN)
    categories?: { id: string; name: string } | null
    accounts?: { id: string; name: string } | null
}

export interface CreateRecurringInput {
    name: string
    amount: number
    type: TransactionType
    category_id?: string | null
    account_id?: string | null
    day_of_month: number
    active?: boolean
}

export interface UpdateRecurringInput {
    name?: string
    amount?: number
    type?: TransactionType
    category_id?: string | null
    account_id?: string | null
    day_of_month?: number
    active?: boolean
}

export interface RecurringLog {
    id: string
    recurring_id: string
    year: number
    month: number
    transaction_id: string | null
    executed_at: string
}
