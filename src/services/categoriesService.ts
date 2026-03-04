import { supabase } from '@/lib/supabase'
import type { Category, CategoryFormData } from '@/types/category'

export const categoriesService = {
    async getAll(): Promise<Category[]> {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true })

        if (error) throw error
        return data ?? []
    },

    async create(payload: CategoryFormData): Promise<Category> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Não autenticado')

        const { data, error } = await supabase
            .from('categories')
            .insert({ ...payload, user_id: user.id })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, payload: CategoryFormData): Promise<Category> {
        const { data, error } = await supabase
            .from('categories')
            .update(payload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)

        if (error) throw error
    },
}
