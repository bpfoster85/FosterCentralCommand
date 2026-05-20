import apiClient from './apiClient'
import type { StarLedgerEntry } from '../types'

export const getStarLedger = (limit: number = 200, profileId?: string | null) =>
  apiClient.get<StarLedgerEntry[]>('/audit/star-ledger', {
    params: {
      limit,
      profileId: profileId || undefined,
    },
  }).then(r => r.data)
