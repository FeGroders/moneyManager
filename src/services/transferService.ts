import { supabase } from '@/lib/supabase'
import { createTransaction } from './transactionsService'

export interface TransferInput {
    fromAccountId: string
    toAccountId: string
    amount: number
    date: string
    description?: string | null
}

/**
 * Cria dois lançamentos vinculados (despesa na origem + receita no destino)
 * com o mesmo transfer_id para identificação como transferência.
 */
export async function createTransfer(userId: string, input: TransferInput): Promise<void> {
    if (input.fromAccountId === input.toAccountId) {
        throw new Error('A conta de origem e destino devem ser diferentes.')
    }
    if (input.amount <= 0) {
        throw new Error('O valor da transferência deve ser maior que zero.')
    }

    // Gera um UUID para vincular as duas transações
    const { data: uuidData, error: uuidError } = await supabase.rpc('gen_random_uuid' as any)
    const transferId: string = uuidError || !uuidData
        ? crypto.randomUUID()
        : uuidData as string

    const baseName = input.description?.trim() || 'Transferência'

    // Busca os nomes das contas para a descrição
    const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name')
        .in('id', [input.fromAccountId, input.toAccountId])

    const fromName = accounts?.find((a) => a.id === input.fromAccountId)?.name || 'Conta'
    const toName = accounts?.find((a) => a.id === input.toAccountId)?.name || 'Conta'

    // 1. Cria despesa na conta de origem
    const expenseTxn = await createTransaction(userId, {
        name: `${baseName} → ${toName}`,
        amount: input.amount,
        date: input.date,
        type: 'expense',
        account_id: input.fromAccountId,
        category_id: null,
    })

    // 2. Cria receita na conta de destino
    await createTransaction(userId, {
        name: `${baseName} ← ${fromName}`,
        amount: input.amount,
        date: input.date,
        type: 'income',
        account_id: input.toAccountId,
        category_id: null,
    })

    // 3. Vincula ambas com o transfer_id
    await supabase
        .from('transactions')
        .update({ transfer_id: transferId })
        .in('id', [expenseTxn.id])

    // Para a segunda, fazemos um select para pegar o id recente
    // (já que createTransaction não retorna o transfer_id linkado)
    const { data: recent } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('account_id', input.toAccountId)
        .eq('type', 'income')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (recent?.id) {
        await supabase
            .from('transactions')
            .update({ transfer_id: transferId })
            .eq('id', recent.id)
    }
}
