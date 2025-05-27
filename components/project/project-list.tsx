"use client"


import { useState, useEffect } from 'react'
import { Search, ArrowUpDown, Filter, ChevronLeft, ChevronRight, Gift } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  PROJECT_CATEGORIES, 
  PROJECT_STATUS, 
  getCategoryOptions,
  getCategoryLabel,
  getProjectStatusOptions
} from '@/lib/constants'
import { Label } from '@/components/ui/label'
import ProjectInfo from '@/components/project/list/project-info'
import { useRouter } from "next/navigation"

// 项目类型定义
interface Project {
  id: string
  name: string
  description: string
  category: string
  tag?: {
    id: string
    name: string
  }
  usageUrl?: string
  totalQuota: number
  claimedCount: number
  remainingQuota: number
  tutorial?: string
  distributionMode: string
  isPublic: boolean
  startTime: string
  endTime?: string
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  status: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string
    nickname?: string
    image?: string
  }
}

// 过滤器类型定义
interface Filters {
  category: string
  status: string
  distributionMode: string
  isPublic: string
  requireLinuxdo: string
  tagId: string
  keyword: string
}

// 排序类型定义
interface Sort {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// 分页类型定义
interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 分发模式标签获取函数
const getDistributionModeLabel = (mode: string): string => {
  switch (mode) {
    case 'SINGLE': return '一码一用';
    case 'MULTI': return '一码多用';
    case 'MANUAL': return '申请-邀请';
    default: return mode;
  }
}

// 获取状态配置
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'ACTIVE': return { label: '活跃', color: 'green' };
    case 'PAUSED': return { label: '暂停', color: 'yellow' };
    case 'COMPLETED': return { label: '已完成', color: 'blue' };
    case 'EXPIRED': return { label: '已过期', color: 'gray' };
    default: return { label: status, color: 'gray' };
  }
}

export default function ProjectList() {
  const router = useRouter()
  // 筛选状态
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    status: 'all',
    distributionMode: 'all',
    isPublic: 'all',
    requireLinuxdo: 'all',
    tagId: 'all',
    keyword: '',
  })

  // 排序状态
  const [sort, setSort] = useState<Sort>({
    sortBy: 'status',
    sortOrder: 'asc'
  })

  // 分页状态
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // 项目数据和加载状态
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  
  // 详情对话框状态
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  
  // 打开项目详情
  const handleOpenProjectInfo = (project: Project) => {
    setSelectedProject(project)
    setIsInfoDialogOpen(true)
  }
  
  // 关闭项目详情
  const handleCloseProjectInfo = () => {
    setIsInfoDialogOpen(false)
  }

  // 筛选变更处理
  const handleFilterChange = (key: keyof Filters, value: string): void => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({
      category: 'all',
      status: 'all',
      distributionMode: 'all',
      isPublic: 'all',
      requireLinuxdo: 'all',
      tagId: 'all',
      keyword: '',
    })
    setSort({
      sortBy: 'status',
      sortOrder: 'asc'
    })
  }

  // 执行搜索
  const handleSearch = () => {
    fetchProjects()
  }

  // 获取项目数据
  const fetchProjects = async () => {
    setLoading(true)
    
    try {
      // 构建查询参数
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (filters.category !== 'all') params.append('category', filters.category)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.distributionMode !== 'all') params.append('distributionMode', filters.distributionMode)
      if (filters.isPublic !== 'all') params.append('isPublic', filters.isPublic)
      if (filters.requireLinuxdo !== 'all') params.append('requireLinuxdo', filters.requireLinuxdo)
      if (filters.tagId !== 'all') params.append('tagId', filters.tagId)
      if (filters.keyword) params.append('keyword', filters.keyword)
      
      // 排序参数 - 根据status进行特殊处理
      if (sort.sortBy === 'status') {
        // 当按状态排序时，优先显示活跃项目
        params.append('sortBy', 'status')
        params.append('activeFirst', 'true')
      } else {
        params.append('sortBy', sort.sortBy)
        params.append('sortOrder', sort.sortOrder)
      }
      
      // 发送请求
      const response = await fetch(`/api/projects/search?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setProjects(result.data.projects)
        setPagination(prev => ({
          ...prev,
          totalCount: result.data.pagination.totalCount,
          totalPages: result.data.pagination.totalPages,
          hasNext: result.data.pagination.hasNext,
          hasPrev: result.data.pagination.hasPrev
        }))
      } else {
        console.error('获取项目失败:', result.error)
      }
    } catch (error) {
      console.error('获取项目异常:', error)
    } finally {
      setLoading(false)
    }
  }

  // 监听筛选条件、排序和分页变化
  useEffect(() => {
    fetchProjects()
  }, [pagination.page, sort.sortBy, sort.sortOrder])
  
  // 执行搜索和筛选的延迟处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 })) // 重置到第一页
      fetchProjects()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [filters])

  // 处理编辑按钮点击
  const handleEditProject = (projectId: string) => {
    router.push(`/project/${projectId}`)
  }

  return (
    <div className="space-y-10">
      {/* 顶部工具栏 */}
      <div className="flex flex-col gap-5">
        {/* 搜索和重置筛选区 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索项目名称、描述或教程内容..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 h-10 border border-gray-200 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 shadow-none"
            />
          </div>

          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={handleResetFilters}
              className="h-10 px-4 text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-none"
            >
              重置
            </Button>
          </div>
        </div>

        {/* 高级筛选区域 - 现代化设计 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 分类筛选 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">分类</span>
                </div>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <SelectValue placeholder="全部分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {getCategoryOptions().map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 状态筛选 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">状态</span>
                </div>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {getProjectStatusOptions().map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 模式筛选 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">模式</span>
                </div>
                <Select value={filters.distributionMode} onValueChange={(value) => handleFilterChange('distributionMode', value)}>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <SelectValue placeholder="全部模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="SINGLE">一码一用</SelectItem>
                    <SelectItem value="MULTI">一码多用</SelectItem>
                    <SelectItem value="MANUAL">申请-邀请</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 可见性筛选 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">可见性</span>
                </div>
                <Select value={filters.isPublic} onValueChange={(value) => handleFilterChange('isPublic', value)}>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="true">公开</SelectItem>
                    <SelectItem value="false">私有</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 认证筛选 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">认证</span>
                </div>
                <Select value={filters.requireLinuxdo} onValueChange={(value) => handleFilterChange('requireLinuxdo', value)}>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="true">需要认证</SelectItem>
                    <SelectItem value="false">无需认证</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序选项 */}
              <div className="flex items-center space-x-3">
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">排序</span>
                </div>
                <div className="flex space-x-2 w-full">
                  <Select value={sort.sortBy} onValueChange={(value) => setSort(prev => ({ ...prev, sortBy: value }))}>
                    <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <SelectValue placeholder="项目状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">项目状态</SelectItem>
                      <SelectItem value="createdAt">创建时间</SelectItem>
                      <SelectItem value="updatedAt">更新时间</SelectItem>
                      <SelectItem value="name">项目名称</SelectItem>
                      <SelectItem value="claimedCount">领取数量</SelectItem>
                      <SelectItem value="totalQuota">领取名额</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sort.sortOrder} onValueChange={(value: 'asc' | 'desc') => setSort(prev => ({ ...prev, sortOrder: value }))}>
                    <SelectTrigger className="w-[80px] h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <SelectValue placeholder="升序" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">升序</SelectItem>
                      <SelectItem value="desc">降序</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            加载中...
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
          <p className="text-gray-500 max-w-sm">
            您还没有创建任何项目，或者当前筛选条件下没有匹配的项目
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-1">
          {projects.map((project) => {
            
            if (project.requireLinuxdo) {
              return (
                <div
                  key={project.id}
                  className="flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-56 m-1"
                >
                  {/* 黑色区域 - 显示认证徽章和状态 - 1/3高度 */}
                  <div className="bg-gray-900 flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-sm mr-2">
                        LinuxDo认证
                      </span>
                      <span className="text-white text-xs">
                        {getCategoryLabel(project.category as keyof typeof PROJECT_CATEGORIES)}
                      </span>
                    </div>
                    <div className="flex items-center bg-opacity-20 bg-white rounded-full px-2 py-0.5">
                      <div className="w-2 h-2 rounded-full mr-1 bg-green-400"></div>
                      <span className="text-white text-xs">{getStatusConfig(project.status).label}</span>
                    </div>
                  </div>
                  
                  {/* 白色区域 - 显示标题 - 1/3高度 */}
                  <div className="bg-white flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold text-gray-900 truncate">
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500">{project.creator.nickname || project.creator.name}</div>
                    </div>
                    <div className="text-base font-semibold flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      <span className="text-gray-500">{project.claimedCount}/{project.totalQuota}</span>
                    </div>
                  </div>
                  
                  {/* 黄色区域 - 显示领取情况及操作按钮 - 1/3高度 */}
                  <div className="bg-yellow-500 flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex flex-col text-xs text-gray-800 gap-1">
                      <div className="text-xs">
                        {/* 使用统一函数获取分发模式标签 */}
                        {getDistributionModeLabel(project.distributionMode)}
                      </div>
                      <div className="text-xs">
                        {format(new Date(project.startTime), 'MM-dd HH:mm')} 至 {project.endTime ? format(new Date(project.endTime), 'MM-dd HH:mm') : '无限期'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenProjectInfo(project)}
                        className="text-xs shadow-none border-none bg-transparent text-gray-800 h-7 px-3 rounded hover:bg-yellow-400"
                      >
                        查看
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleEditProject(project.id)}
                        className="text-xs shadow-none bg-gray-800 text-white h-7 px-3 rounded hover:bg-gray-700"
                      >
                        编辑
                      </Button>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={project.id}
                  className="flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-56 m-1"
                >
                  {/* 蓝色区域 - 显示类型和状态 - 1/3高度 */}
                  <div className="bg-blue-600 flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-sm mr-2">
                        普通项目
                      </span>
                      <span className="text-white text-xs">
                        {getCategoryLabel(project.category as keyof typeof PROJECT_CATEGORIES)}
                      </span>
                    </div>
                    <div className="flex items-center bg-opacity-20 bg-white rounded-full px-2 py-0.5">
                      <div className="w-2 h-2 rounded-full mr-1 bg-green-400"></div>
                      <span className="text-white text-xs">{getStatusConfig(project.status).label}</span>
                    </div>
                  </div>
                  
                  {/* 白色区域 - 显示标题 - 1/3高度 */}
                  <div className="bg-white flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold text-gray-900 truncate">
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500">{project.creator.nickname || project.creator.name}</div>
                    </div>
                    <div className="text-base font-semibold flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      <span className="text-gray-500">{project.claimedCount}/{project.totalQuota}</span>
                    </div>
                  </div>
                  
                  {/* 浅蓝色区域 - 显示领取情况及操作按钮 - 1/3高度 */}
                  <div className="bg-blue-50 flex-1 px-5 py-5 flex items-center justify-between">
                    <div className="flex flex-col text-xs text-gray-600 gap-1">
                      <div className="text-xs">
                        {/* 使用统一函数获取分发模式标签 */}
                        {getDistributionModeLabel(project.distributionMode)}
                      </div>
                      <div className="text-xs">
                        {format(new Date(project.startTime), 'MM-dd HH:mm')} 至 {project.endTime ? format(new Date(project.endTime), 'MM-dd HH:mm') : '无限期'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenProjectInfo(project)}
                        className="text-xs shadow-none border-none bg-transparent text-gray-600 h-7 px-3 rounded hover:bg-blue-100"
                      >
                        查看
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleEditProject(project.id)}
                        className="text-xs shadow-none bg-blue-600 text-white h-7 px-3 rounded hover:bg-blue-700"
                      >
                        编辑
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <div className="text-sm text-gray-500 order-2 sm:order-1">
            共 {pagination.totalCount} 个项目
          </div>
          
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="h-8 px-2 sm:px-3 text-gray-600 hover:bg-gray-100 disabled:opacity-50 shadow-none"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">上一页</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                // 计算当前页码组的起始页码
                let startPage = Math.max(1, pagination.page - 2);
                
                // 如果当前页靠近末尾，调整起始页码，确保显示最后5页
                if (pagination.page > pagination.totalPages - 2) {
                  startPage = Math.max(1, pagination.totalPages - 4);
                }
                
                const pageNum = startPage + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                    className={`h-8 w-8 p-0 text-sm shadow-none ${
                      pageNum === pagination.page 
                        ? "bg-gray-900 text-white hover:bg-gray-800" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="h-8 px-2 sm:px-3 text-gray-600 hover:bg-gray-100 disabled:opacity-50 shadow-none"
            >
              <span className="hidden sm:inline">下一页</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
      
      {/* 项目详情对话框 */}
      <ProjectInfo 
        project={selectedProject} 
        isOpen={isInfoDialogOpen} 
        onClose={handleCloseProjectInfo} 
      />
    </div>
  )
}
