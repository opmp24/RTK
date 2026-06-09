import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name')

        if (cancelled) return

        if (error) {
          setError(error.message)
        } else if (data) {
          setCategories(data as Category[])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar categorías')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCategories()

    return () => { cancelled = true }
  }, [])

  return { categories, loading, error }
}
