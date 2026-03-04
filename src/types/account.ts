export interface Account {
    id: string
    user_id: string
    name: string
    type: 'cash' | 'checking' | 'credit_card' | 'savings'
    balance: number
    created_at: string
}
