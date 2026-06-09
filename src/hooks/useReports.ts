import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { config } from '@/lib/config'
import type { Report, ReportFormData } from '@/types'

export function useReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastSubmitRef = useRef(0)

  const fetchReports = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: fetchError } = await supabase
      .from('reports')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    if (!data) {
      setReports([])
      setLoading(false)
      return
    }

    let voteCounts = new Map<string, { up: number; down: number }>()
    let userVoteMap = new Map<string, 'up' | 'down'>()

    const { data: votes } = await supabase
      .from('report_votes')
      .select('report_id, vote')

    if (votes) {
      votes.forEach(v => {
        const current = voteCounts.get(v.report_id) ?? { up: 0, down: 0 }
        current[v.vote as 'up' | 'down']++
        voteCounts.set(v.report_id, current)
      })
    }

    if (user) {
      const { data: userVotes } = await supabase
        .from('report_votes')
        .select('report_id, vote')
        .eq('user_id', user.id)

      if (userVotes) {
        userVotes.forEach(v => userVoteMap.set(v.report_id, v.vote as 'up' | 'down'))
      }
    }

    const enriched = (data as unknown as Report[]).map(r => ({
      ...r,
      vote_count: voteCounts.get(r.id) ?? { up: 0, down: 0 },
      user_vote: userVoteMap.get(r.id) ?? null,
    }))

    setReports(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchReports()

    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes',
        { event: '*', schema: 'rtk', table: 'reports' },
        () => { if (!cancelled) fetchReports() }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [fetchReports])

  const checkCooldown = () => {
    const elapsed = Date.now() - lastSubmitRef.current
    if (elapsed < config.cooldown.seconds * 1000) {
      const remaining = Math.ceil((config.cooldown.seconds * 1000 - elapsed) / 1000)
      throw new Error(`Debes esperar ${remaining}s antes de reportar otra vez`)
    }
  }

  const createReport = async (data: ReportFormData) => {
    checkCooldown()
    lastSubmitRef.current = Date.now()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('No autenticado')

    let photo_url: string | null = null

    if (data.photo) {
      const ext = data.photo.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(config.storage.bucket)
        .upload(path, data.photo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(config.storage.bucket)
        .getPublicUrl(path)
      photo_url = publicUrl
    }

    const { error } = await supabase.from('reports').insert({
      user_id: user.id,
      category_id: data.category_id,
      lat: data.lat,
      lng: data.lng,
      address: data.address ?? null,
      description: data.description ?? null,
      photo_url,
    })

    if (error) throw error

    await fetchReports()
  }

  const updateReport = async (reportId: string, data: { description?: string; photo?: File | null; category_id?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    let photo_url: string | undefined

    if (data.photo) {
      const ext = data.photo.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(config.storage.bucket)
        .upload(path, data.photo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(config.storage.bucket)
        .getPublicUrl(path)
      photo_url = publicUrl
    }

    const updates: Record<string, unknown> = {}
    if (data.description !== undefined) updates.description = data.description
    if (photo_url !== undefined) updates.photo_url = photo_url
    if (data.category_id !== undefined) updates.category_id = data.category_id

    if (Object.keys(updates).length === 0) return

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', reportId)

    if (error) throw error

    await fetchReports()
  }

  const voteOnReport = async (reportId: string, vote: 'up' | 'down') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error } = await supabase
      .from('report_votes')
      .upsert(
        { report_id: reportId, user_id: user.id, vote },
        { onConflict: 'report_id,user_id', ignoreDuplicates: false }
      )

    if (error) throw error

    await fetchReports()
  }

  const deleteReport = async (reportId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id)

    if (error) throw error

    await fetchReports()
  }

  return { reports, loading, error, createReport, updateReport, voteOnReport, deleteReport }
}
