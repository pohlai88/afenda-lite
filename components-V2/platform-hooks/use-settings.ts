'use client'

// React Imports
import { useContext } from 'react'

// Context Imports
import { SettingsContext } from '@/components-V2/platform-context/settingsContext'

export const useSettings = () => {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }

  return context
}
