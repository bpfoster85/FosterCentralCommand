import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '../types'
import * as profilesApi from '../api/profiles'
import { usePolling } from './usePolling'

const POLL_INTERVAL_MS = 60_000

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await profilesApi.getProfiles()
      setProfiles(data)
      setError(null)
    } catch {
      if (!silent) setError('Failed to load profiles')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  usePolling(() => fetchProfiles(true), POLL_INTERVAL_MS)

  const createProfile = async (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'totalStars'>) => {
    const profile = await profilesApi.createProfile(data)
    setProfiles(prev => [...prev, profile])
    return profile
  }

  const updateProfile = async (id: string, data: Partial<Profile>) => {
    const updated = await profilesApi.updateProfile(id, data)
    setProfiles(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  const deleteProfile = async (id: string) => {
    await profilesApi.deleteProfile(id)
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  const adjustStars = async (id: string, delta: number) => {
    const updated = await profilesApi.adjustProfileStars(id, delta)
    setProfiles(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  return { profiles, loading, error, refetch: fetchProfiles, createProfile, updateProfile, deleteProfile, adjustStars }
}
