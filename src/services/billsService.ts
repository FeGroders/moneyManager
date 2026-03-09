import { supabase } from '@/lib/supabase'
import type { Bill, CreateBillInput, UpdateBillInput } from '@/types/bill'

export async function getBills(userId: string): Promise<Bill[]> {
    const { data, error } = await supabase
        .from('bills')
        .select(`*, categories(id, name)`)
        .eq('user_id', userId)
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data as Bill[]
}

export async function createBill(userId: string, input: CreateBillInput): Promise<Bill> {
    const { data, error } = await supabase
        .from('bills')
        .insert([{ ...input, user_id: userId }])
        .select(`*, categories(id, name)`)
        .single()

    if (error) throw new Error(error.message)
    return data as Bill
}

export async function updateBill(id: string, userId: string, input: UpdateBillInput): Promise<Bill> {
    const { data, error } = await supabase
        .from('bills')
        .update(input)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`*, categories(id, name)`)
        .single()

    if (error) throw new Error(error.message)
    return data as Bill
}

export async function deleteBill(id: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw new Error(error.message)
}
