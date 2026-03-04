import { supabase } from '@/lib/supabase'
import type {
    Transaction,
    CreateTransactionInput,
    UpdateTransactionInput
} from '@/types/transaction'

/**
 * Atualiza o saldo de uma conta de forma atômica via RPC.
 * delta positivo = aumenta saldo | delta negativo = diminui saldo
 */
async function updateAccountBalance(accountId: string, delta: number) {
    const { error } = await supabase.rpc('increment_account_balance', {
        p_account_id: accountId,
        p_delta: delta,
    })
    if (error) console.error('Erro ao atualizar saldo da conta:', error)
}

/**
 * Calcula o delta de saldo que uma transação representa.
 * Income = +amount | Expense = -amount
 */
function balanceDelta(type: 'income' | 'expense', amount: number) {
    return type === 'income' ? amount : -amount
}

/**
 * Busca todas as movimentações do usuário, ordenadas por data descrescente.
 */
export async function getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
      *,
      categories (
        id,
        name
      ),
      accounts (
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
 * Cria uma nova movimentação e atualiza o saldo da conta vinculada.
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
                account_id: data.account_id,
                type: data.type,
            },
        ])
        .select()
        .single()

    if (error) {
        console.error('Erro ao criar transação:', error)
        throw new Error(error.message || 'Não foi possível registrar a movimentação.')
    }

    // Atualiza saldo da conta vinculada
    if (data.account_id) {
        await updateAccountBalance(data.account_id, balanceDelta(data.type, data.amount))
    }

    return newTransaction as Transaction
}

/**
 * Atualiza uma movimentação existente.
 * Reverte o efeito anterior no saldo e aplica o novo.
 */
export async function updateTransaction(
    id: string,
    userId: string,
    data: UpdateTransactionInput
): Promise<Transaction> {
    // 1. Busca a transação antiga para saber o efeito anterior no saldo
    const { data: oldTxn, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (fetchError) throw new Error(fetchError.message)

    // 2. Atualiza a transação
    const { data: updatedTransaction, error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) {
        console.error('Erro ao atualizar transação:', error)
        throw new Error(error.message || 'Não foi possível editar a movimentação.')
    }

    // 3. Reverte o efeito da transação antiga na conta antiga (se houver)
    if (oldTxn.account_id) {
        await updateAccountBalance(oldTxn.account_id, -balanceDelta(oldTxn.type, oldTxn.amount))
    }

    // 4. Aplica o efeito da nova transação na conta nova (se houver)
    const newAccountId = data.account_id !== undefined ? data.account_id : oldTxn.account_id
    const newType = data.type || oldTxn.type
    const newAmount = data.amount !== undefined ? data.amount : oldTxn.amount

    if (newAccountId) {
        await updateAccountBalance(newAccountId, balanceDelta(newType, newAmount))
    }

    return updatedTransaction as Transaction
}

/**
 * Deleta uma movimentação e reverte seu efeito no saldo da conta.
 */
export async function deleteTransaction(id: string, userId: string): Promise<void> {
    // 1. Busca a transação para saber o efeito no saldo
    const { data: txn, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (fetchError) throw new Error(fetchError.message)

    // 2. Deleta a transação
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) {
        console.error('Erro ao excluir transação:', error)
        throw new Error(error.message || 'Não foi possível excluir a movimentação.')
    }

    // 3. Reverte o efeito no saldo da conta
    if (txn.account_id) {
        await updateAccountBalance(txn.account_id, -balanceDelta(txn.type, txn.amount))
    }
}
