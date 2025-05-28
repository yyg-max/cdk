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
import { X, ChevronDown, SlidersHorizontal, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Project } from "@/components/project/read/types"

// 分类选项
const CATEGORIES = [
  { value: "ALL", label: "全部分类" },
  { value: "AI", label: "AI智能" },
  { value: "SOFTWARE", label: "软件工具" },
  { value: "GAME", label: "游戏娱乐" },
  { value: "EDUCATION", label: "教育学习" },
  { value: "RESOURCE", label: "资源分享" },
  { value: "LIFE", label: "生活服务" },
  { value: "OTHER", label: "其他" },
]

// 分发模式选项
const DISTRIBUTION_MODES = [
  { value: "ALL", label: "全部模式" },
  { value: "SINGLE", label: "一码一用" },
  { value: "MULTI", label: "一码多用" },
  { value: "MANUAL", label: "手动邀请" },
]

// 信任等级选项
const TRUST_LEVELS = [
  { value: "ALL", label: "不限等级" },
  { value: "1", label: "T1" },
  { value: "2", label: "T2" },
  { value: "3", label: "T3" },
  { value: "4", label: "T4" },
  { value: "5", label: "T5" },
]

// 标签类型定义
interface Tag {
  id: string;
  name: string;
}

interface SearchPagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNext: boolean
}

interface FilterOptions {
  category: string;
  distributionMode: string;
  requirePassword: string;
  requireLinuxdo: string;
  minTrustLevel: string;
  tags: string[];
}

/**
 * 搜索筛选组件
 * 
 * 提供项目搜索和多维度筛选功能，支持：
 * - 关键词搜索
 * - 分类、分发模式、认证要求等多维度筛选
 * - 分页加载和实时筛选
 * - URL状态同步
 * 
 * @returns React 函数组件
 */
export function SearchFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 获取URL中的查询参数
  const keyword = searchParams.get('keyword') || ''
  const category = searchParams.get('category') || 'ALL'
  const distributionMode = searchParams.get('distributionMode') || 'ALL'
  const requirePassword = searchParams.get('requirePassword') || 'ALL'
  const requireLinuxdo = searchParams.get('requireLinuxdo') || 'ALL'
  const minTrustLevel = searchParams.get('minTrustLevel') || 'ALL'
  const tagsParam = searchParams.get('tags') || ''
  
  // 本地状态
  const [searchInput, setSearchInput] = useState(keyword)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Project[]>([])
  const [filteredResults, setFilteredResults] = useState<Project[]>([])
  const [showResults, setShowResults] = useState(false)
  const [pagination, setPagination] = useState<SearchPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  
  // 筛选选项
  const [filters, setFilters] = useState<FilterOptions>({
    category: category,
    distributionMode: distributionMode,
    requirePassword: requirePassword,
    requireLinuxdo: requireLinuxdo,
    minTrustLevel: minTrustLevel,
    tags: tagsParam ? tagsParam.split(',') : [],
  })

  // 从API获取标签
  const fetchTags = async () => {
    setIsLoadingTags(true)
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('获取标签失败')
      
      const data = await response.json()
      if (data.success && data.tags) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error('获取标签失败:', error)
    } finally {
      setIsLoadingTags(false)
    }
  }

  // 组件挂载时加载标签
  useEffect(() => {
    fetchTags()
  }, [])

  // 处理筛选选项更新
  const handleFilterChange = (name: keyof FilterOptions, value: string | boolean | string[]) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  // 添加或移除标签
  const toggleTag = (tagName: string) => {
    setFilters(prev => {
      const tagExists = prev.tags.includes(tagName)
      if (tagExists) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagName) }
      } else {
        return { ...prev, tags: [...prev.tags, tagName] }
      }
    })
  }

  // 清除所有筛选
  const clearFilters = () => {
    setFilters({
      category: 'ALL',
      distributionMode: 'ALL',
      requirePassword: 'ALL',
      requireLinuxdo: 'ALL',
      minTrustLevel: 'ALL',
      tags: [],
    })
  }

  // 应用筛选到结果
  const applyFiltersToResults = () => {
    if (!searchResults.length) return []
    
    return searchResults.filter(project => {
      // 分类筛选
      if (filters.category !== 'ALL' && project.category !== filters.category) {
        return false
      }
      
      // 分发模式筛选
      if (filters.distributionMode !== 'ALL' && project.distributionMode !== filters.distributionMode) {
        return false
      }
      
      // 密码筛选
      if (filters.requirePassword === 'YES' && !project.hasPassword) {
        return false
      }
      if (filters.requirePassword === 'NO' && project.hasPassword) {
        return false
      }
      
      // LinuxDo认证筛选
      if (filters.requireLinuxdo === 'YES' && !project.requireLinuxdo) {
        return false
      }
      if (filters.requireLinuxdo === 'NO' && project.requireLinuxdo) {
        return false
      }
      
      // 等级筛选
      if (filters.minTrustLevel !== 'ALL' && 
          (!project.minTrustLevel || 
           parseInt(project.minTrustLevel.toString()) < parseInt(filters.minTrustLevel))) {
        return false
      }
      
      // 标签筛选
      if (filters.tags.length > 0) {
        const projectTagNames = project.tags?.map(tag => tag.name) || []
        // 检查是否包含任一选中标签
        const hasAnyTag = filters.tags.some(tag => projectTagNames.includes(tag))
        if (!hasAnyTag) return false
      }
      
      return true
    })
  }

  // 搜索函数
  const performSearch = async (page = 1, append = false) => {
    if (!searchInput.trim()) {
      setShowResults(false)
      setSearchResults([])
      setFilteredResults([])
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
      
      const response = await fetch(`/api/projects/search?${queryParams.toString()}`)
      
      if (!response.ok) throw new Error('搜索失败')
      
      const data = await response.json()
      if (data.success && data.data?.projects) {
        let newResults
        if (append) {
          // 追加到现有结果
          newResults = [...searchResults, ...data.data.projects]
          setSearchResults(newResults)
        } else {
          // 替换现有结果
          newResults = data.data.projects
          setSearchResults(newResults)
        }
        
        // 默认显示全部结果
        setFilteredResults(newResults)
        
        setPagination(data.data.pagination)
        setCurrentPage(page)
        
        // 更新URL但不重新加载页面
        if (!append) {
          const urlParams = new URLSearchParams()
          urlParams.append('keyword', searchInput)
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
    setFilteredResults([])
    setPagination(null)
    setCurrentPage(1)
    clearFilters()
    router.push('/platform')
  }

  // 当筛选选项变化时应用筛选
  useEffect(() => {
    if (searchResults.length > 0) {
      // 如果所有筛选条件都是默认值，显示全部结果
      if (
        filters.category === 'ALL' &&
        filters.distributionMode === 'ALL' &&
        filters.requirePassword === 'ALL' &&
        filters.requireLinuxdo === 'ALL' &&
        filters.minTrustLevel === 'ALL' &&
        filters.tags.length === 0
      ) {
        setFilteredResults(searchResults)
      } else {
        setFilteredResults(applyFiltersToResults())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchResults])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  // 按Enter键搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 获取活跃筛选数量
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.category !== 'ALL') count++
    if (filters.distributionMode !== 'ALL') count++
    if (filters.requirePassword !== 'ALL') count++
    if (filters.requireLinuxdo !== 'ALL') count++
    if (filters.minTrustLevel !== 'ALL') count++
    count += filters.tags.length
    return count
  }

  return (
    <div className="flex flex-col items-center space-y-4 mb-6">
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
              <span>搜索结果: &ldquo;{keyword}&rdquo;</span>
              {pagination && (
                <Badge variant="secondary" className="text-xs">
                  {pagination.totalCount} 个结果
                </Badge>
              )}
            </div>
          )}
          
          <Button 
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={clearSearch}
          >
            <X className="h-3 w-3 mr-1" />
            清除搜索
          </Button>
        </div>
      )}
      
      {/* 搜索结果 */}
      {showResults && (
        <div className="w-full max-w-7xl">
          {isSearching ? (
            <SearchResultsSkeleton />
          ) : searchResults.length > 0 ? (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    搜索结果 
                  </h2>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({filteredResults.length}/{pagination?.totalCount || 0})
                  </span>
                </div>
                
                {/* 筛选按钮 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 gap-1 rounded-full"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      筛选
                      {getActiveFiltersCount() > 0 && (
                        <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[10px]">
                          {getActiveFiltersCount()}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">筛选选项</h4>
                        <p className="text-sm text-muted-foreground">
                          根据以下条件筛选搜索结果
                        </p>
                      </div>
                      <Separator />
                      
                      <ScrollArea className="h-[30vh] pr-2">
                        <div className="grid gap-4 px-2">
                          {/* 分类筛选 */}
                          <div className="grid gap-2">
                            <Label htmlFor="category">项目分类</Label>
                            <Select
                              value={filters.category}
                              onValueChange={(value) => handleFilterChange('category', value)}
                            >
                              <SelectTrigger id="category">
                                <SelectValue placeholder="选择分类" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(category => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* 分发模式 */}
                          <div className="grid gap-2">
                            <Label htmlFor="distributionMode">分发模式</Label>
                            <Select
                              value={filters.distributionMode}
                              onValueChange={(value) => handleFilterChange('distributionMode', value)}
                            >
                              <SelectTrigger id="distributionMode">
                                <SelectValue placeholder="选择模式" />
                              </SelectTrigger>
                              <SelectContent>
                                {DISTRIBUTION_MODES.map(mode => (
                                  <SelectItem key={mode.value} value={mode.value}>
                                    {mode.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* 需要密码 - 改为选择框 */}
                          <div className="grid gap-2">
                            <Label htmlFor="requirePassword">是否需要密码</Label>
                            <Select
                              value={filters.requirePassword}
                              onValueChange={(value) => handleFilterChange('requirePassword', value)}
                            >
                              <SelectTrigger id="requirePassword">
                                <SelectValue placeholder="是否需要密码" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">全部</SelectItem>
                                <SelectItem value="YES">需要密码</SelectItem>
                                <SelectItem value="NO">无需密码</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* LinuxDo认证 - 改为选择框 */}
                          <div className="grid gap-2">
                            <Label htmlFor="requireLinuxdo">LinuxDo认证</Label>
                            <Select
                              value={filters.requireLinuxdo}
                              onValueChange={(value) => handleFilterChange('requireLinuxdo', value)}
                            >
                              <SelectTrigger id="requireLinuxdo">
                                <SelectValue placeholder="LinuxDo认证" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">全部</SelectItem>
                                <SelectItem value="YES">需要认证</SelectItem>
                                <SelectItem value="NO">无需认证</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* 等级要求 - 只在需要LinuxDo认证时显示 */}
                          {filters.requireLinuxdo === 'YES' && (
                            <div className="grid gap-2">
                              <Label htmlFor="trustLevel">信任等级</Label>
                              <Select
                                value={filters.minTrustLevel}
                                onValueChange={(value) => handleFilterChange('minTrustLevel', value)}
                              >
                                <SelectTrigger id="trustLevel">
                                  <SelectValue placeholder="选择等级" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRUST_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* 标签筛选 - 保持当前的多选方式，但添加全部/清除按钮 */}
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <Label>标签</Label>
                              {filters.tags.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleFilterChange('tags', [] as string[])}
                                >
                                  清除
                                </Button>
                              )}
                            </div>
                            
                            {isLoadingTags ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">加载标签...</span>
                              </div>
                            ) : tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1 p-1">
                                {tags.map(tag => (
                                  <Badge
                                    key={tag.id}
                                    variant={filters.tags.includes(tag.name) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => toggleTag(tag.name)}
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">没有可用标签</p>
                            )}
                            
                            {filters.tags.length > 0 && (
                              <div className="mt-2">
                                <Label className="text-xs">已选标签 ({filters.tags.length})</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {filters.tags.map(tag => (
                                    <Badge key={tag} variant="default" className="flex items-center gap-1">
                                      {tag}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0"
                                        onClick={() => toggleTag(tag)}
                                      >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">移除</span>
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </ScrollArea>
                      
                      <Separator />
                      
                      <div className="flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                        >
                          清除全部
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {filteredResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredResults.map((project) => (
                      <ProjectCard key={project.id} project={project} />
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
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-2">没有符合筛选条件的项目</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    清除筛选条件
                  </Button>
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