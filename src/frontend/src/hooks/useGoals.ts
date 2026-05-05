import { useState, useEffect, useCallback } from 'react'
import type { Goal } from '../types'
import * as goalsApi from '../api/goals'

export const useGoals = (profileId?: string) => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await goalsApi.getGoals(profileId)
      setGoals(data)
      setError(null)
    } catch {
      setError('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const createGoal = async (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  return { goals, loading, error, refetch: fetchGoals, createGoal, updateGoal, deleteGoal }
}
