export type BillType = 'income' | 'expense'

export interface Bill {
    id: string
    user_id: string
    name: string
    amount: number
    due_date: string // YYYY-MM-DD
    type: BillType
    paid: boolean
    category_id?: string | null
    notes?: string | null
    created_at?: string

    // JOIN
    categories?: {
        id: string
        name: string
    } | null
}

export interface CreateBillInput {
    name: string
    amount: number
    due_date: string
    type: BillType
    category_id?: string | null
    notes?: string | null
}

export interface UpdateBillInput extends Partial<CreateBillInput> {
    paid?: boolean
}
