import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/account'

export const accountsService = {
    async getAll(userId: string): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .order('order_index', { ascending: true })
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
    },

    async updateOrder(userId: string, accountsData: { id: string, order_index: number }[]): Promise<void> {
        const promises = accountsData.map(acc =>
            supabase
                .from('accounts')
                .update({ order_index: acc.order_index })
                .eq('id', acc.id)
                .eq('user_id', userId)
        )
        const results = await Promise.all(promises)
        for (const res of results) {
            if (res.error) throw new Error(res.error.message)
        }
    }
}
