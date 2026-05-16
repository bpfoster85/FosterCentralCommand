import { useState, useEffect, useCallback } from 'react'
import type { Chore } from '../types'
import * as choresApi from '../api/chores'
import type { ChoreCreatePayload, ChoreUpdatePayload } from '../api/chores'
import { usePolling } from './usePolling'

const POLL_INTERVAL_MS = 60_000

export const useChores = (profileId?: string) => {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChores = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await choresApi.getChores(profileId)
      setChores(data)
      setError(null)
    } catch {
      if (!silent) setError('Failed to load chores')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [profileId])

  useEffect(() => { fetchChores() }, [fetchChores])

  usePolling(() => fetchChores(true), POLL_INTERVAL_MS)

  const createChore = async (data: ChoreCreatePayload) => {
    const chore = await choresApi.createChore(data)
    setChores(prev => [...prev, chore])
    return chore
  }

  const updateChore = async (id: string, data: ChoreUpdatePayload) => {
    const updated = await choresApi.updateChore(id, data)
    setChores(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  const deleteChore = async (id: string) => {
    await choresApi.deleteChore(id)
    setChores(prev => prev.filter(c => c.id !== id))
  }

  const toggleCompleteOnDate = async (id: string, date: string) => {
    const updated = await choresApi.toggleChoreCompleteOnDate(id, date)
    setChores(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  const toggleApprovalOnDate = async (id: string, date: string) => {
    const updated = await choresApi.toggleChoreApprovalOnDate(id, date)
    setChores(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  return { chores, loading, error, refetch: fetchChores, createChore, updateChore, deleteChore, toggleCompleteOnDate, toggleApprovalOnDate }
}
