import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/account'

export const accountsService = {
    async getAll(userId: string): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching accounts:', error)
            throw new Error(error.message)
        }

        return data as Account[]
    },

    async create(userId: string, account: Omit<Account, 'id' | 'user_id' | 'created_at'>): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .insert([{ ...account, user_id: userId }])
            .select()
            .single()

        if (error) throw new Error(error.message)
        return data as Account
    },

    async update(id: string, userId: string, account: Partial<Omit<Account, 'id' | 'user_id' | 'created_at'>>): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .update(account)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw new Error(error.message)
        return data as Account
    },

    async delete(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw new Error(error.message)
    }
}
