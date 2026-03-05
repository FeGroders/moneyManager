export interface Account {
    id: string
    user_id: string
    name: string
    type: 'cash' | 'checking' | 'credit_card' | 'savings'
    balance: number
    created_at: string
    // Campos exclusivos de cartão de crédito
    credit_limit?: number
    closing_day?: number   // Dia de fechamento da fatura (1–28)
    due_day?: number       // Dia de vencimento da fatura (1–28)
    order_index?: number
}
