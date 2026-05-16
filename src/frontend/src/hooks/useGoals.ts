import { useState, useEffect, useCallback } from 'react'
import type { Goal } from '../types'
import * as goalsApi from '../api/goals'
import { usePolling } from './usePolling'

const POLL_INTERVAL_MS = 60_000

export const useGoals = (profileId?: string) => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await goalsApi.getGoals(profileId)
      setGoals(data)
      setError(null)
    } catch {
      if (!silent) setError('Failed to load goals')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [profileId])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  usePolling(() => fetchGoals(true), POLL_INTERVAL_MS)

  const createGoal = async (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'starsApplied' | 'isAchieved'>) => {
    const goal = await goalsApi.createGoal(data)
    setGoals(prev => [...prev, goal])
    return goal
  }

  const updateGoal = async (id: string, data: Partial<Pick<Goal, 'title' | 'emoji' | 'starTarget'>>) => {
    const updated = await goalsApi.updateGoal(id, data)
    setGoals(prev => prev.map(g => g.id === id ? updated : g))
    return updated
  }

  const deleteGoal = async (id: string) => {
    await goalsApi.deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const spendStars = async (goalId: string, profileId: string, amount: number) => {
    const updated = await goalsApi.spendStarsOnGoal(goalId, profileId, amount)
    setGoals(prev => prev.map(g => g.id === goalId ? updated : g))
    return updated
  }

  const winGoal = async (goalId: string) => {
    const updated = await goalsApi.winGoal(goalId)
    setGoals(prev => prev.map(g => g.id === goalId ? updated : g))
    return updated
  }

  return { goals, loading, error, refetch: fetchGoals, createGoal, updateGoal, deleteGoal, spendStars, winGoal }
}
