"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from "sonner"
import type { Project } from '@/components/project/read/types'

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

// 重试函数
const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // 对于500和其他服务器错误，尝试重试
      if (response.status >= 500) {
        // 最后一次尝试时记录详细错误信息
        if (i === retries - 1) {
          console.error(`服务器错误 (${response.status})，所有重试失败`);
          
          // 尝试读取错误响应内容
          try {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const errorData = await response.json();
              console.error("服务器错误详情:", errorData);
            } else {
              // 非JSON响应，可能是HTML错误页面
              const errorText = await response.text();
              console.error("服务器返回非JSON响应:", 
                errorText.length > 100 ? errorText.substring(0, 100) + "..." : errorText);
            }
          } catch (parseError) {
            console.error("无法解析错误响应:", parseError);
          }
          
          return response;
        }
        
        // 记录日志但不中断重试循环
        console.warn(`服务器错误 (${response.status})，第 ${i+1}/${retries} 次尝试重试...`);
        await new Promise(r => setTimeout(r, delay * Math.pow(1.5, i))); // 指数退避策略
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // 最后一次尝试失败，记录详细错误
      if (i === retries - 1) {
        console.error(`网络请求失败，已重试 ${retries} 次:`, error);
        throw error;
      }
      
      console.warn(`网络请求失败，第 ${i+1}/${retries} 次尝试重试...`, error);
      await new Promise(r => setTimeout(r, delay * Math.pow(1.5, i)));
    }
  }
  
  throw lastError;
};

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

  const [error, setError] = useState<string | null>(null)

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetchWithRetry('/api/projects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats' }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`获取统计数据失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        setStats(data.data)
      } else {
        throw new Error('获取统计数据失败: 返回数据格式错误');
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
      // 显示用户友好的错误消息
      setStats({ totalProjects: 0, activeProjects: 0, totalUsers: 0, totalClaims: 0 });
      setError('获取统计数据失败');
      toast.error('获取统计数据失败，已加载默认内容');
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // 获取分类数据
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetchWithRetry('/api/projects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCategories' }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`获取分类失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        setCategories(data.data)
      } else {
        throw new Error('获取分类数据失败: 返回数据格式错误');
      }
    } catch (error) {
      console.error('获取分类数据错误:', error);
      // 提供默认分类，这样UI不会完全崩溃
      setCategories([
        { name: 'AI', count: 0 },
        { name: 'SOFTWARE', count: 0 },
        { name: 'GAME', count: 0 },
        { name: 'EDUCATION', count: 0 },
        { name: 'RESOURCE', count: 0 },
        { name: 'LIFE', count: 0 },
        { name: 'OTHER', count: 0 },
      ]);
      setError('获取分类数据失败');
      toast.error('获取分类数据失败，已加载默认内容');
    } finally {
      setIsCategoriesLoading(false)
    }
  }, [])

  // 获取所有分类的项目数据
  const fetchProjectsByCategory = useCallback(async () => {
    try {
      // 获取活跃且公开的项目，按创建时间倒序排列
      const response = await fetchWithRetry('/api/projects/search?status=ACTIVE&isPublic=true&limit=100&sortBy=createdAt&sortOrder=desc')
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`获取项目失败: ${response.status} ${errorText}`);
      }
      
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
      } else {
        throw new Error('获取项目数据失败: 返回数据格式错误');
      }
    } catch (error) {
      console.error('获取项目数据错误:', error);
      // 提供空数据结构
      setProjectsByCategory({
        AI: [],
        SOFTWARE: [],
        GAME: [],
        EDUCATION: [],
        RESOURCE: [],
        LIFE: [],
        OTHER: [],
      });
      setError('获取项目数据失败');
      toast.error('获取项目数据失败，已加载默认内容');
    } finally {
      setIsProjectsLoading(false)
    }
  }, [])

  /**
   * 获取特色项目
   * 
   * 算法逻辑：
   * 1. 从每个分类中选取最新的1个活跃项目
   * 2. 如果某个分类没有项目，跳过该分类  
   * 3. 如果总数不足5个，从剩余的活跃项目中按时间顺序补充
   * 4. 最终保证特色项目总数不超过5个
   * 
   * 这样可以确保特色项目具有分类多样性，同时保证项目的时效性
   */
  const fetchFeaturedProjects = useCallback(async () => {
    try {
      // 获取活跃且公开的项目，按创建时间倒序排列，获取足够多的数据用于分类筛选
      const response = await fetchWithRetry('/api/projects/search?status=ACTIVE&isPublic=true&limit=200&sortBy=createdAt&sortOrder=desc')
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`获取特色项目失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json()
      if (data.success && data.data?.projects) {
        // 过滤掉过期的项目
        const validProjects = data.data.projects.filter((project: Project) => {
          return !project.endTime || new Date(project.endTime) > new Date()
        })
        
        // 按分类整理项目，每个分类取最新的1个项目
        const categorizedFeatured: Record<string, Project[]> = {
          AI: [],
          SOFTWARE: [],
          GAME: [],
          EDUCATION: [],
          RESOURCE: [],
          LIFE: [],
          OTHER: [],
        }
        
        // 遍历所有项目，为每个分类收集最新的项目
        validProjects.forEach((project: Project) => {
          if (categorizedFeatured[project.category] && categorizedFeatured[project.category].length === 0) {
            categorizedFeatured[project.category].push(project)
          }
        })
        
        // 从每个分类中收集特色项目（每个分类最多1个）
        const featuredList: Project[] = []
        const categories = ['AI', 'SOFTWARE', 'GAME', 'EDUCATION', 'RESOURCE', 'LIFE', 'OTHER']
        
        // 先从每个分类中取一个项目
        categories.forEach((category) => {
          if (categorizedFeatured[category].length > 0 && featuredList.length < 5) {
            featuredList.push(categorizedFeatured[category][0])
          }
        })
        
        // 如果不足5个，从剩余的活跃项目中按时间顺序补充
        if (featuredList.length < 5) {
          const featuredIds = new Set(featuredList.map((p: Project) => p.id))
          const remainingProjects = validProjects.filter((p: Project) => !featuredIds.has(p.id))
          
          for (const project of remainingProjects) {
            if (featuredList.length >= 5) break
            featuredList.push(project)
          }
        }
        
        // 确保最终数量不超过5个
        setFeaturedProjects(featuredList.slice(0, 5))
      } else {
        throw new Error('获取特色项目失败: 返回数据格式错误');
      }
    } catch (error) {
      console.error('获取特色项目错误:', error);
      // 提供空数组
      setFeaturedProjects([]);
      setError('获取特色项目失败');
      toast.error('获取项目数据失败，请稍后刷新页面重试');
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

    error,
  }
} 