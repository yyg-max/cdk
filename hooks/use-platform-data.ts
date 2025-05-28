import { useState, useEffect, useCallback } from 'react'

// 项目类型定义
export interface Project {
  id: string
  name: string
  description: string
  category: 'AI' | 'SOFTWARE' | 'GAME' | 'EDUCATION' | 'RESOURCE' | 'LIFE' | 'OTHER'
  tags: { id: string; name: string }[]
  distributionMode: string
  totalQuota: number
  claimedCount: number
  remainingQuota: number
  creator: {
    id: string
    name: string
    nickname?: string
    image?: string
  }
  createdAt: string
  updatedAt: string
  hasPassword: boolean
  requireLinuxdo: boolean
  minTrustLevel: number
  startTime: string
  endTime: string | null
  status: string
}

// 统计数据接口
export interface StatsData {
  totalProjects: number
  activeProjects: number
  totalUsers: number
  totalClaims: number
}

// 分类数据接口
export interface CategoryData {
  name: string
  count: number
}

// 平台数据hook
export function usePlatformData() {
  // 统计数据
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  
  // 分类数据
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  
  // 项目数据 - 按分类组织
  const [projectsByCategory, setProjectsByCategory] = useState<Record<string, Project[]>>({})
  const [isProjectsLoading, setIsProjectsLoading] = useState(true)
  
  // 特色项目（用于轮播）
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true)

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats' }),
      })
      
      if (!response.ok) throw new Error('获取统计数据失败')
      
      const data = await response.json()
      if (data.success && data.data) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('获取统计数据错误:', error)
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // 获取分类数据
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCategories' }),
      })
      
      if (!response.ok) throw new Error('获取分类失败')
      
      const data = await response.json()
      if (data.success && data.data) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('获取分类数据错误:', error)
    } finally {
      setIsCategoriesLoading(false)
    }
  }, [])

  // 获取所有分类的项目数据
  const fetchProjectsByCategory = useCallback(async () => {
    try {
      // 获取活跃且公开的项目，按创建时间倒序排列
      const response = await fetch('/api/projects/search?status=ACTIVE&isPublic=true&limit=100&sortBy=createdAt&sortOrder=desc')
      
      if (!response.ok) throw new Error('获取项目失败')
      
      const data = await response.json()
      if (data.success && data.data?.projects) {
        // 按分类整理项目
        const categorizedProjects: Record<string, Project[]> = {
          AI: [],
          SOFTWARE: [],
          GAME: [],
          EDUCATION: [],
          RESOURCE: [],
          LIFE: [],
          OTHER: [],
        }
        
        data.data.projects.forEach((project: Project) => {
          if (categorizedProjects[project.category]) {
            categorizedProjects[project.category].push(project)
          }
        })
        
        // 限制每个分类最多10个项目（最新的）
        Object.keys(categorizedProjects).forEach((category) => {
          categorizedProjects[category] = categorizedProjects[category].slice(0, 10)
        })
        
        setProjectsByCategory(categorizedProjects)
      }
    } catch (error) {
      console.error('获取项目数据错误:', error)
    } finally {
      setIsProjectsLoading(false)
    }
  }, [])

  // 获取特色项目
  const fetchFeaturedProjects = useCallback(async () => {
    try {
      // 获取最新的活跃项目作为特色项目
      const response = await fetch('/api/projects/search?status=ACTIVE&isPublic=true&limit=8&sortBy=createdAt&sortOrder=desc')
      
      if (!response.ok) throw new Error('获取特色项目失败')
      
      const data = await response.json()
      if (data.success && data.data?.projects) {
        // 过滤掉过期的项目
        const validProjects = data.data.projects.filter((project: Project) => {
          return !project.endTime || new Date(project.endTime) > new Date()
        })
        
        setFeaturedProjects(validProjects.slice(0, 5)) // 最多5个特色项目
      }
    } catch (error) {
      console.error('获取特色项目错误:', error)
    } finally {
      setIsFeaturedLoading(false)
    }
  }, [])

  // 初始化数据获取
  useEffect(() => {
    // 并行获取所有数据
    Promise.all([
      fetchStats(),
      fetchCategories(),
      fetchProjectsByCategory(),
      fetchFeaturedProjects(),
    ])
  }, [fetchStats, fetchCategories, fetchProjectsByCategory, fetchFeaturedProjects])

  // 刷新所有数据
  const refreshData = useCallback(() => {
    setIsStatsLoading(true)
    setIsCategoriesLoading(true)
    setIsProjectsLoading(true)
    setIsFeaturedLoading(true)
    
    Promise.all([
      fetchStats(),
      fetchCategories(),
      fetchProjectsByCategory(),
      fetchFeaturedProjects(),
    ])
  }, [fetchStats, fetchCategories, fetchProjectsByCategory, fetchFeaturedProjects])

  return {
    // 数据
    stats,
    categories,
    projectsByCategory,
    featuredProjects,
    
    // 加载状态
    isStatsLoading,
    isCategoriesLoading,
    isProjectsLoading,
    isFeaturedLoading,
    isLoading: isStatsLoading || isCategoriesLoading || isProjectsLoading || isFeaturedLoading,
    
    // 方法
    refreshData,
    fetchStats,
    fetchCategories,
    fetchProjectsByCategory,
    fetchFeaturedProjects,
  }
} 