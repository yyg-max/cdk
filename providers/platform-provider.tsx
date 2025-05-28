"use client"

import React, { createContext, useContext } from 'react'
import { usePlatformData, type Project, type StatsData, type CategoryData } from '@/hooks/use-platform-data'

interface PlatformContextType {
  // 数据
  stats: StatsData | null
  categories: CategoryData[]
  projectsByCategory: Record<string, Project[]>
  featuredProjects: Project[]
  
  // 加载状态
  isStatsLoading: boolean
  isCategoriesLoading: boolean
  isProjectsLoading: boolean
  isFeaturedLoading: boolean
  isLoading: boolean
  
  // 方法
  refreshData: () => void
}

const PlatformContext = createContext<PlatformContextType | null>(null)

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platformData = usePlatformData()
  
  return (
    <PlatformContext.Provider value={platformData}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatformContext() {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatformContext must be used within a PlatformProvider')
  }
  return context
} 