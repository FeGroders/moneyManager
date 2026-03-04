export type CategoryType = 'income' | 'expense'

export interface Category {
    id: string
    user_id: string
    name: string
    type: CategoryType
    created_at: string
    updated_at: string
}

export interface CategoryFormData {
    name: string
    type: CategoryType
}
