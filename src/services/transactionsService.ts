import { supabase } from '@/lib/supabase'
import type {
    Transaction,
    CreateTransactionInput,
    UpdateTransactionInput
} from '@/types/transaction'

/**
 * Busca todas as movimentações do usuário, ordenadas por data descrescente (mais recentes primeiro).
 * Também faz JOIN com a tabela de categorias para trazer o nome da categoria atrelada.
 */
export async function getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      categories (
        id,
        name
      )
    `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Erro ao buscar transações:', error)
        throw new Error(error.message || 'Não foi possível carregar as movimentações.')
    }

    return data as Transaction[]
}

/**
 * Cria uma nova movimentação.
 */
export async function createTransaction(userId: string, data: CreateTransactionInput): Promise<Transaction> {
    const { data: newTransaction, error } = await supabase
        .from('transactions')
        .insert([
            {
                user_id: userId,
                name: data.name,
                amount: data.amount,
                date: data.date,
                category_id: data.category_id,
                type: data.type,
            },
        ])
        .select()
        .single()

    if (error) {
        console.error('Erro ao criar transação:', error)
        throw new Error(error.message || 'Não foi possível registrar a movimentação.')
    }

    return newTransaction as Transaction
}

/**
 * Atualiza uma movimentação existente.
 */
export async function updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionInput
): Promise<Transaction> {
    const { data: updatedTransaction, error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId) // Segurança extra
        .select()
        .single()

    if (error) {
        console.error('Erro ao atualizar transação:', error)
        throw new Error(error.message || 'Não foi possível editar a movimentação.')
    }

    return updatedTransaction as Transaction
}

/**
 * Deleta uma movimentação.
 */
export async function deleteTransaction(id: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId) // Segurança extra

    if (error) {
        console.error('Erro ao excluir transação:', error)
        throw new Error(error.message || 'Não foi possível excluir a movimentação.')
    }
}
