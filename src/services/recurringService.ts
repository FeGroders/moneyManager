import { supabase } from '@/lib/supabase'
import { createTransaction } from './transactionsService'
import type { RecurringTransaction, CreateRecurringInput, UpdateRecurringInput } from '@/types/recurring'

/**
 * Busca todas as recorrentes do usuário
 */
export async function getRecurrings(userId: string): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
      *,
      categories ( id, name ),
      accounts   ( id, name )
    `)
        .eq('user_id', userId)
        .order('day_of_month', { ascending: true })

    if (error) throw new Error(error.message)
    return data as RecurringTransaction[]
}

/**
 * Cria uma nova recorrente
 */
export async function createRecurring(userId: string, data: CreateRecurringInput): Promise<RecurringTransaction> {
    const { data: created, error } = await supabase
        .from('recurring_transactions')
        .insert([{ ...data, user_id: userId }])
        .select(`
      *,
      categories ( id, name ),
      accounts   ( id, name )
    `)
        .single()

    if (error) throw new Error(error.message)
    return created as RecurringTransaction
}

/**
 * Atualiza uma recorrente
 */
export async function updateRecurring(id: string, userId: string, data: UpdateRecurringInput): Promise<RecurringTransaction> {
    const { data: updated, error } = await supabase
        .from('recurring_transactions')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
      *,
      categories ( id, name ),
      accounts   ( id, name )
    `)
        .single()

    if (error) throw new Error(error.message)
    return updated as RecurringTransaction
}

/**
 * Remove uma recorrente
 */
export async function deleteRecurring(id: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw new Error(error.message)
}

/**
 * Processa as recorrentes do mês atual.
 * Para cada recorrente ativa cujo dia já chegou, cria a transação
 * caso ainda não exista um log para o mês/ano corrente.
 */
export async function processRecurrings(userId: string): Promise<void> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-indexed
    const today = now.getDate()

    // Busca recorrentes ativas com dia <= hoje
    const { data: recurrings, error: recErr } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .lte('day_of_month', today)

    if (recErr || !recurrings || recurrings.length === 0) return

    const recurringIds = recurrings.map((r: RecurringTransaction) => r.id)

    // Busca logs existentes no mês atual para esses recorrentes
    const { data: existingLogs } = await supabase
        .from('recurring_logs')
        .select('recurring_id')
        .in('recurring_id', recurringIds)
        .eq('year', year)
        .eq('month', month)

    const alreadyProcessed = new Set((existingLogs ?? []).map((l: { recurring_id: string }) => l.recurring_id))

    // Para cada recorrente ainda não processada, cria transação e log
    for (const rec of recurrings as RecurringTransaction[]) {
        if (alreadyProcessed.has(rec.id)) continue

        // Monta a data no dia correto do mês atual
        const lastDay = new Date(year, month, 0).getDate()
        const txDay = Math.min(rec.day_of_month, lastDay)
        const txDate = `${year}-${String(month).padStart(2, '0')}-${String(txDay).padStart(2, '0')}`

        try {
            const txn = await createTransaction(userId, {
                name: rec.name,
                amount: rec.amount,
                type: rec.type,
                category_id: rec.category_id,
                account_id: rec.account_id,
                date: txDate,
            })

            // Registra o log
            await supabase.from('recurring_logs').insert([{
                recurring_id: rec.id,
                year,
                month,
                transaction_id: txn.id,
            }])
        } catch (err) {
            console.error(`Erro ao processar recorrente ${rec.name}:`, err)
        }
    }
}
