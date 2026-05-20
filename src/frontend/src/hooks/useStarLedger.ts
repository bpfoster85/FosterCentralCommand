import { useState, useCallback } from 'react'
import type { StarLedgerEntry } from '../types'
import * as auditApi from '../api/audit'

export const useStarLedger = () => {
  const [entries, setEntries] = useState<StarLedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (silent: boolean = false, profileId?: string | null) => {
    try {
      if (!silent) setLoading(true)
      const data = await auditApi.getStarLedger(300, profileId)
      setEntries(data)
      setError(null)
    } catch {
      if (!silent) setError('Failed to load audit log')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  return { entries, loading, error, refetch: fetchEntries }
}
