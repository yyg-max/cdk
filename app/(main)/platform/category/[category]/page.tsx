"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { ProjectCard } from "@/components/platform/project-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { Project, ProjectCategory } from "@/components/project/read/types"

/**
 * 分类中文名称映射
 * 将英文分类枚举值映射为用户友好的中文显示名称
 */
const CATEGORY_NAMES: Record<ProjectCategory, string> = {
  AI: '人工智能',
  SOFTWARE: '软件工具',
  GAME: '游戏娱乐',
  EDUCATION: '教育学习',
  RESOURCE: '资源分享',
  LIFE: '生活服务',
  OTHER: '其他',
} as const

/**
 * 分页数据接口
 * 定义分页相关的状态信息
 */
interface PaginationData {
  /** 当前页码 */
  currentPage: number
  /** 总页数 */
  totalPages: number
  /** 总记录数 */
  totalCount: number
  /** 是否有下一页 */
  hasNext: boolean
  /** 是否有上一页 */
  hasPrev: boolean
}

/**
 * 项目分类页面组件
 * 
 * 展示特定分类下的所有项目，支持分页浏览
 * 路由格式：/platform/category/[category]?page=1
 * 
 * @returns React 函数组件
 * 
 * @example
 * 访问路径：/platform/category/AI?page=2
 * 显示AI分类下第2页的项目列表
 */
export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const category = params.category as string
  const page = parseInt(searchParams.get('page') || '1')
  
  const [projects, setProjects] = useState<Project[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取分类项目
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const queryParams = new URLSearchParams()
        queryParams.append('category', category.toUpperCase())
        queryParams.append('status', 'ACTIVE')
        queryParams.append('isPublic', 'true')
        queryParams.append('limit', '24')
        queryParams.append('page', page.toString())
        queryParams.append('sortBy', 'createdAt')
        queryParams.append('sortOrder', 'desc')
        
        const response = await fetch(`/api/projects/search?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error('获取项目失败')
        }
        
        const data = await response.json()
        if (data.success && data.data) {
          setProjects(data.data.projects || [])
          setPagination(data.data.pagination)
        } else {
          throw new Error('数据格式错误')
        }
      } catch (error) {
        console.error('获取项目错误:', error)
        setError('加载失败，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }

    if (category) {
      fetchProjects()
    }
  }, [category, page])

  /**
   * 处理分页导航
   * 更新URL参数实现页面跳转，保持分类和页码状态
   * 
   * @param newPage - 目标页码
   */
  const handlePageChange = (newPage: number) => {
    router.push(`/platform/category/${category}?page=${newPage}`)
  }

  // 检查分类是否有效
  if (!CATEGORY_NAMES[category?.toUpperCase() as ProjectCategory]) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            分类不存在
          </h1>
          <Link href="/platform">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回平台首页
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/platform">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回平台
              </Button>
            </Link>
            
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {CATEGORY_NAMES[category.toUpperCase() as ProjectCategory]}
              </h1>
              {pagination && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  共 {pagination.totalCount} 个项目
                </p>
              )}
            </div>
          </div>
          
          <Badge variant="outline" className="text-sm">
            {category.toUpperCase()}
          </Badge>
        </div>

        {/* 项目列表 */}
        {isLoading ? (
          <ProjectListSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-slate-500 dark:text-slate-400 mb-4">
              {error}
            </div>
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {projects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  variant="compact" 
                />
              ))}
            </div>

            {/* 分页 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* 页码按钮 */}
                  {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    
                    if (pagination.totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                    } else if (page >= pagination.totalPages - 3) {
                      pageNum = pagination.totalPages - 6 + i
                    } else {
                      pageNum = page - 3 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-8"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNext}
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            
            {/* 分页信息 */}
            {pagination && (
              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                第 {pagination.currentPage} 页，共 {pagination.totalPages} 页，
                总计 {pagination.totalCount} 个项目
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-500 dark:text-slate-400 mb-4">
              该分类暂无活跃项目
            </div>
            <Link href="/platform">
              <Button variant="outline">
                浏览其他分类
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 项目列表骨架屏组件
 * 
 * 在项目数据加载时显示的占位符界面
 * 模拟真实项目卡片的布局结构
 * 
 * @returns React 函数组件
 */
function ProjectListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array(24).fill(0).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          
          <div className="flex gap-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
} 