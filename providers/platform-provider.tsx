"use client"

import React, { createContext, useContext } from 'react'
import { usePlatformData, type StatsData, type CategoryData } from '@/hooks/use-platform-data'
import type { Project } from '@/components/project/read/types'

/**
 * 平台上下文类型定义
 * 
 * 提供探索广场所需的所有数据和状态管理
 */
interface PlatformContextType {
  // 数据
  /** 平台统计数据 */
  stats: StatsData | null
  /** 分类数据列表 */
  categories: CategoryData[]
  /** 按分类组织的项目数据 */
  projectsByCategory: Record<string, Project[]>
  /** 特色项目列表 */
  featuredProjects: Project[]
  
  // 加载状态
  /** 统计数据加载状态 */
  isStatsLoading: boolean
  /** 分类数据加载状态 */
  isCategoriesLoading: boolean
  /** 项目数据加载状态 */
  isProjectsLoading: boolean
  /** 特色项目加载状态 */
  isFeaturedLoading: boolean
  /** 总体加载状态 */
  isLoading: boolean
  
  // 方法
  /** 刷新所有数据 */
  refreshData: () => void
}

const PlatformContext = createContext<PlatformContextType | null>(null)

/**
 * 平台数据提供者组件
 * 
 * 为整个探索广场模块提供统一的数据状态管理，包括：
 * - 平台统计信息
 * - 项目分类数据
 * - 按分类组织的项目列表
 * - 特色项目轮播数据
 * 
 * @param props - 组件属性
 * @param props.children - 子组件
 * @returns React Context Provider
 * 
 * @example
 * ```tsx
 * <PlatformProvider>
 *   <CategoryCarousel />
 *   <SearchFilterBar />
 *   <WelcomeBanner />
 * </PlatformProvider>
 * ```
 */
export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platformData = usePlatformData()
  
  return (
    <PlatformContext.Provider value={platformData}>
      {children}
    </PlatformContext.Provider>
  )
}

/**
 * 使用平台上下文的Hook
 * 
 * 用于在组件中访问平台数据和状态
 * 必须在 PlatformProvider 内部使用
 * 
 * @returns 平台上下文数据
 * @throws 如果在 PlatformProvider 外部使用则抛出错误
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { stats, isLoading, refreshData } = usePlatformContext()
 *   // 使用数据...
 * }
 * ```
 */
export function usePlatformContext() {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatformContext must be used within a PlatformProvider')
  }
  return context
} 