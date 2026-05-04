import React from 'react'
import { useProfiles } from '../hooks/useProfiles'
import ListsWidget from '../components/lists/ListsWidget'

const ListsPage: React.FC = () => {
  const { profiles } = useProfiles()

  return (
    <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
      <ListsWidget profiles={profiles} />
    </div>
  )
}

export default ListsPage
