"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  InputButton,
  InputButtonAction,
  InputButtonProvider,
  InputButtonSubmit,
  InputButtonInput,
} from '@/components/animate-ui/buttons/input'
import { ProjectCard } from "./project-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, ChevronDown } from "lucide-react"
import { Project } from "@/hooks/use-platform-data"

interface SearchPagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNext: boolean
}

export function SearchFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 获取URL中的查询参数
  const keyword = searchParams.get('keyword') || ''
  const category = searchParams.get('category') || ''
  
  // 本地状态
  const [searchInput, setSearchInput] = useState(keyword)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Project[]>([])
  const [showResults, setShowResults] = useState(false)
  const [pagination, setPagination] = useState<SearchPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 搜索函数
  const performSearch = async (page = 1, append = false) => {
    if (!searchInput.trim()) {
      setShowResults(false)
      setSearchResults([])
      setPagination(null)
      setCurrentPage(1)
      router.push('/platform')
      return
    }
    
    if (!append) {
      setIsSearching(true)
      setShowResults(true)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('keyword', searchInput)
      queryParams.append('status', 'ACTIVE')
      queryParams.append('isPublic', 'true')
      queryParams.append('limit', '24')
      queryParams.append('page', page.toString())
      queryParams.append('sortBy', 'createdAt')
      queryParams.append('sortOrder', 'desc')
      
      if (category) {
        queryParams.append('category', category)
      }
      
      const response = await fetch(`/api/projects/search?${queryParams.toString()}`)
      
      if (!response.ok) throw new Error('搜索失败')
      
      const data = await response.json()
      if (data.success && data.data?.projects) {
        if (append) {
          // 追加到现有结果
          setSearchResults(prev => [...prev, ...data.data.projects])
        } else {
          // 替换现有结果
          setSearchResults(data.data.projects)
        }
        setPagination(data.data.pagination)
        setCurrentPage(page)
        
        // 更新URL但不重新加载页面
        if (!append) {
          const urlParams = new URLSearchParams()
          urlParams.append('keyword', searchInput)
          if (category) urlParams.append('category', category)
          
          router.push(`/platform?${urlParams.toString()}`, { scroll: false })
        }
      }
    } catch (error) {
      console.error('搜索错误:', error)
    } finally {
      setIsSearching(false)
      setIsLoadingMore(false)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1)
    performSearch(1, false)
  }

  // 加载更多
  const handleLoadMore = () => {
    if (pagination?.hasNext) {
      performSearch(currentPage + 1, true)
    }
  }

  // 清除搜索
  const clearSearch = () => {
    setSearchInput('')
    setShowResults(false)
    setSearchResults([])
    setPagination(null)
    setCurrentPage(1)
    router.push('/platform')
  }

  // 当URL参数变化时更新搜索
  useEffect(() => {
    if (keyword && keyword !== searchInput) {
      setSearchInput(keyword)
      setCurrentPage(1)
      performSearch(1, false)
    } else if (!keyword && showResults) {
      // URL中没有关键词但显示了搜索结果，清除搜索
      clearSearch()
    }
  }, [keyword])

  // 按Enter键搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 mb-6">
      <div className="w-full max-w-md flex justify-center">
        <InputButtonProvider className="mx-auto">
          <InputButton>
            <InputButtonAction>搜索项目</InputButtonAction>
            <InputButtonSubmit onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '搜索中...' : '搜索'}
            </InputButtonSubmit>
            <InputButtonInput 
              type="text"
              placeholder="搜索项目名称或描述..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSearching}
            />
          </InputButton>
        </InputButtonProvider>
      </div>
      
      {/* 搜索状态和清除按钮 */}
      {(keyword || showResults) && (
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          {keyword && (
            <div className="flex items-center gap-2">
              <span>搜索结果: "{keyword}"</span>
              {pagination && (
                <Badge variant="secondary" className="text-xs">
                  {pagination.totalCount} 个结果
                </Badge>
              )}
            </div>
          )}
          
          {category && (
            <Badge variant="outline" className="text-xs">
              分类: {category}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('category')
                  router.push(`/platform?${params.toString()}`)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          <Button 
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={clearSearch}
          >
            <X className="h-3 w-3 mr-1" />
            清除
          </Button>
        </div>
      )}
      
      {/* 搜索结果 */}
      {showResults && (
        <div className="w-full max-w-7xl">
          {isSearching ? (
            <SearchResultsSkeleton />
          ) : searchResults.length > 0 ? (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                搜索结果 
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({pagination?.totalCount || 0})
                </span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.map((project) => (
                  <ProjectCard key={project.id} project={project} variant="compact" />
                ))}
              </div>
              
              {/* 加载更多按钮 */}
              {pagination && pagination.hasNext && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="min-w-32"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                        加载中...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        加载更多 ({searchResults.length}/{pagination.totalCount})
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* 已加载完所有结果 */}
              {pagination && !pagination.hasNext && pagination.totalCount > 24 && (
                <div className="text-center pt-4 text-sm text-slate-500 dark:text-slate-400">
                  已显示全部 {pagination.totalCount} 个结果
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <div className="text-slate-500 dark:text-slate-400 mb-4">
                没有找到相关项目
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
              >
                清除搜索条件
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_, i) => (
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
    </div>
  )
} 