"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, Gift, Trash2, SlidersHorizontal, X, ArrowUpDown, CheckSquare, Square } from 'lucide-react'
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
  getCategoryOptions,
  getCategoryLabel,
  getProjectStatusOptions
} from '@/lib/constants'
import ProjectInfo from '@/components/project/read/project-info'
import { useRouter } from "next/navigation"
import { 
  Project, 
  Filters, 
  Sort, 
  SortableField, 
  Pagination 
} from './types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/radix/popover"
import { MotionEffect } from "@/components/animate-ui/effects/motion-effect"
import { toast } from "sonner"

/**
 * 获取分发模式标签
 * @param mode 分发模式
 * @returns 分发模式的中文标签
 */
const getDistributionModeLabel = (mode: string): string => {
  switch (mode) {
    case 'SINGLE': return '一码一用';
    case 'MULTI': return '一码多用';
    case 'MANUAL': return '申请-邀请';
    default: return mode;
  }
}

/**
 * 获取状态配置
 * @param status 项目状态
 * @returns 状态配置对象，包含标签和颜色
 */
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
  
  /**
   * 筛选状态
   */
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    status: 'all',
    distributionMode: 'all',
    isPublic: 'all',
    requireLinuxdo: 'all',
    tagId: 'all',
    keyword: '',
  })

  /**
   * 排序状态
   */
  const [sort, setSort] = useState<Sort>({
    sortBy: 'status' as SortableField,
    sortOrder: 'asc'
  })

  /**
   * 分页状态
   */
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  /**
   * 项目数据和加载状态
   */
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  
  /**
   * 详情对话框状态
   */
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  
  /**
   * 删除模式状态
   */
  const [deleteMode, setDeleteMode] = useState(false)
  const [projectsToDelete, setProjectsToDelete] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  /**
   * 过滤器和排序弹窗状态
   */
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  
  /**
   * 切换删除模式
   */
  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode)
    // 清空已选项目
    setProjectsToDelete([])
  }
  
  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (projectsToDelete.length === projects.length) {
      // 如果已全选，则清空选择
      setProjectsToDelete([])
    } else {
      // 否则全选
      setProjectsToDelete(projects.map(project => project.id))
    }
  }
  
  /**
   * 检查是否已全选
   */
  const isAllSelected = projects.length > 0 && projectsToDelete.length === projects.length
  
  /**
   * 选择/取消选择项目
   * @param projectId 项目ID
   */
  const toggleProjectSelection = (projectId: string) => {
    setProjectsToDelete(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }
  
  /**
   * 打开确认删除对话框
   */
  const confirmDelete = () => {
    if (projectsToDelete.length === 0) {
      toast.error("请至少选择一个项目进行删除")
      return
    }
    setIsDeleteDialogOpen(true)
  }
  
  /**
   * 执行删除操作
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      
      // 发送删除请求
      const response = await fetch(`/api/projects/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectIds: projectsToDelete }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`成功删除 ${projectsToDelete.length} 个项目`)
        // 重置状态
        setProjectsToDelete([])
        setDeleteMode(false)
        // 重新加载数据
        fetchProjects()
      } else {
        toast.error(`删除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('删除项目异常:', error)
      toast.error('删除项目时发生错误')
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }
  
  /**
   * 打开项目详情
   * @param project 要查看的项目
   */
  const handleOpenProjectInfo = (project: Project) => {
    // 在删除模式下，点击卡片选择/取消选择项目
    if (deleteMode) {
      toggleProjectSelection(project.id)
      return
    }
    
    setSelectedProject(project)
    setIsInfoDialogOpen(true)
  }
  
  /**
   * 关闭项目详情
   */
  const handleCloseProjectInfo = () => {
    setIsInfoDialogOpen(false)
  }

  /**
   * 筛选变更处理
   * @param key 过滤器键名
   * @param value 过滤器值
   */
  const handleFilterChange = (key: keyof Filters, value: string): void => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  /**
   * 重置筛选
   */
  const handleResetFilters = (): void => {
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
      sortBy: 'status' as SortableField,
      sortOrder: 'asc'
    })
    // 重置到第一页并触发搜索
    setPagination(prev => ({ ...prev, page: 1 }))
    // 手动触发数据加载
    setTimeout(() => fetchProjects(), 0)
  }

  /**
   * 执行搜索
   */
  const handleSearch = (): void => {
    // 重置到第一页
    setPagination(prev => ({ ...prev, page: 1 }))
    // 直接触发搜索
    fetchProjects()
  }

  /**
   * 获取项目数据
   * @param signal AbortSignal 用于取消请求
   */
  const fetchProjects = async (signal?: AbortSignal): Promise<void> => {
    // 设置加载状态
    if (!signal?.aborted) {
      setLoading(true);
    }
    
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.distributionMode !== 'all') params.append('distributionMode', filters.distributionMode);
      if (filters.isPublic !== 'all') params.append('isPublic', filters.isPublic);
      if (filters.requireLinuxdo !== 'all') params.append('requireLinuxdo', filters.requireLinuxdo);
      if (filters.tagId !== 'all') params.append('tagId', filters.tagId);
      if (filters.keyword) params.append('keyword', filters.keyword);
      
      // 排序参数 - 根据status进行特殊处理
      if (sort.sortBy === 'status') {
        // 当按状态排序时，优先显示活跃项目
        params.append('sortBy', 'status');
        params.append('activeFirst', 'true');
      } else {
        params.append('sortBy', sort.sortBy);
        params.append('sortOrder', sort.sortOrder);
      }
      
      const response = await fetch(`/api/projects/search?${params.toString()}`, { signal });
      
      if (signal?.aborted) {
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setProjects(result.data.projects);
        setPagination(prev => ({
          ...prev,
          totalCount: result.data.pagination.totalCount,
          totalPages: result.data.pagination.totalPages,
          hasNext: result.data.pagination.hasNext,
          hasPrev: result.data.pagination.hasPrev
        }));
      } else {
        console.error('获取项目失败:', result.error);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('获取项目异常:', error);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  // 创建一个 ref 跟踪是否是首次渲染
  const isFirstRender = useRef(true);
  
  /**
   * 处理筛选条件变化，重置页码
   */
  useEffect(() => {
    // 跳过首次渲染的处理
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // 只有当不在第一页时才重置页码
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  
  /**
   * 处理数据加载
   */
  useEffect(() => {
    // 防止组件卸载后状态更新
    let isActive = true;
    const controller = new AbortController();
    
    // 使用防抖，避免频繁请求
    const timer = setTimeout(async () => {
      if (!isActive) return;
      
      try {
        await fetchProjects(controller.signal);
      } catch {
      }
    }, 300); // 适当的防抖延迟
    
    // 清理函数
    return () => {
      isActive = false;
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, sort.sortBy, sort.sortOrder, 
    filters.category, filters.status, filters.distributionMode, 
    filters.isPublic, filters.requireLinuxdo, filters.tagId, filters.keyword
  ]);

  /**
   * 处理编辑按钮点击
   * @param projectId 项目ID
   */
  const handleEditProject = (projectId: string) => {
    router.push(`/project/${projectId}`)
  }

  return (
    <div className="space-y-10">

      {/* 项目详情对话框组件 */}
      <ProjectInfo 
        project={selectedProject} 
        isOpen={isInfoDialogOpen} 
        onClose={handleCloseProjectInfo} 
      />

      {/* 页面顶部工具栏 */}
      <div className="flex flex-wrap items-center gap-3 justify-between p-1 border border-none">
        {/* 左侧区域：搜索框+筛选+排序 */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-0 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <Input
              placeholder="搜索项目名称、描述或教程内容..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 h-9 w-full border border-gray-200 bg-white hover:border-gray-300 transition-all duration-200 shadow-none"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
            />
            {filters.keyword && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFilters(prev => ({ ...prev, keyword: '' }))
                  handleSearch()
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 筛选和排序按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 筛选按钮和弹窗 */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-gray-200 hover:bg-gray-50 shadow-none flex items-center gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">筛选</span>
                  {Object.values(filters).some(value => value !== 'all' && value !== '') && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
                      {Object.values(filters).filter(value => value !== 'all' && value !== '').length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium">筛选条件</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        handleResetFilters()
                        setIsFilterOpen(false)
                      }}
                      className="h-8 text-xs"
                    >
                      重置筛选
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* 分类筛选选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">分类</label>
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

                    {/* 状态筛选选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">状态</label>
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

                    {/* 分发模式筛选选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">分发模式</label>
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

                    {/* 可见性筛选选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">可见性</label>
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

                    {/* 认证要求筛选选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">认证要求</label>
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
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* 排序按钮和弹窗 */}
            <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-gray-200 hover:bg-gray-50 shadow-none flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">排序</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4" align="start">
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">排序方式</h3>
                  
                  <div className="space-y-3">
                    {/* 排序字段选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">排序字段</label>
                      <Select 
                        value={sort.sortBy} 
                        onValueChange={(value: string) => setSort(prev => ({ 
                          ...prev, 
                          sortBy: value as SortableField 
                        }))}
                      >
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
                    </div>
                    
                    {/* 排序方向选择器 */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">排序方向</label>
                      <Select value={sort.sortOrder} onValueChange={(value: 'asc' | 'desc') => setSort(prev => ({ ...prev, sortOrder: value }))}>
                        <SelectTrigger className="w-full h-9 text-sm border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
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
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 右侧区域：删除按钮 */}
        <div className="flex-shrink-0">
          {!deleteMode ? (
            <Button 
              variant="outline" 
              onClick={toggleDeleteMode}
              className="h-9 px-3 text-gray-600 border-gray-200 hover:bg-gray-50 shadow-none flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">删除</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {/* 全选按钮 */}
              <Button
                variant="outline"
                onClick={toggleSelectAll}
                className="h-9 px-3 border-gray-200 hover:bg-gray-50 shadow-none flex items-center gap-2"
                disabled={projects.length === 0}
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">全选</span>
              </Button>
              
              {/* 删除按钮 */}
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={projectsToDelete.length === 0}
                className="h-9 px-3 bg-red-600 text-white hover:bg-red-700 shadow-none flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">删除</span>
                {projectsToDelete.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-red-600">
                    {projectsToDelete.length}
                  </span>
                )}
              </Button>
              
              {/* 取消按钮 */}
              <Button 
                variant="ghost" 
                onClick={toggleDeleteMode}
                className="h-9 px-3 text-gray-600 shadow-none"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">取消</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 项目列表展示区域 */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 p-1">
          {projects.map((project, index) => {
            
            if (project.requireLinuxdo) {
              return (
                <MotionEffect 
                  key={project.id}
                  slide={{ direction: 'up', offset: 20 }}
                  fade={{ initialOpacity: 0, opacity: 1 }}
                  delay={index * 0.05}
                  className="h-56"
                >
                  <div
                    className={`flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-full m-1 ${
                      deleteMode ? 'cursor-pointer' : ''
                    } ${
                      deleteMode && projectsToDelete.includes(project.id) 
                        ? 'ring-2 ring-red-500 ring-offset-2' 
                        : ''
                    }`}
                    onClick={() => handleOpenProjectInfo(project)}
                  >
                    {/* 认证项目头部区域 */}
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
                    
                    {/* 认证项目信息区域 */}
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
                    
                    {/* 认证项目操作区域 */}
                    <div className="bg-yellow-500 flex-1 px-5 py-5 flex items-center justify-between">
                      <div className="flex flex-col text-xs text-gray-800 gap-1">
                        <div className="text-xs">
                          {getDistributionModeLabel(project.distributionMode)}
                        </div>
                        <div className="text-xs">
                          {format(new Date(project.startTime), 'MM-dd HH:mm')} 至 {project.endTime ? format(new Date(project.endTime), 'MM-dd HH:mm') : '无限期'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!deleteMode && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProjectInfo(project);
                              }}
                              className="text-xs shadow-none border-none bg-transparent text-gray-800 h-7 px-3 rounded hover:bg-yellow-400"
                            >
                              查看
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project.id);
                              }}
                              className="text-xs shadow-none bg-gray-800 text-white h-7 px-3 rounded hover:bg-gray-700"
                            >
                              编辑
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </MotionEffect>
              );
            } else {
              return (
                <MotionEffect 
                  key={project.id}
                  slide={{ direction: 'up', offset: 20 }}
                  fade={{ initialOpacity: 0, opacity: 1 }}
                  delay={index * 0.05}
                  className="h-56"
                >
                  <div
                    className={`flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-full m-1 ${
                      deleteMode ? 'cursor-pointer' : ''
                    } ${
                      deleteMode && projectsToDelete.includes(project.id) 
                        ? 'ring-2 ring-red-500 ring-offset-2' 
                        : ''
                    }`}
                    onClick={() => handleOpenProjectInfo(project)}
                  >
                    {/* 普通项目头部区域 */}
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
                    
                    {/* 普通项目信息区域 */}
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
                    
                    {/* 普通项目操作区域 */}
                    <div className="bg-blue-50 flex-1 px-5 py-5 flex items-center justify-between">
                      <div className="flex flex-col text-xs text-gray-600 gap-1">
                        <div className="text-xs">
                          {getDistributionModeLabel(project.distributionMode)}
                        </div>
                        <div className="text-xs">
                          {format(new Date(project.startTime), 'MM-dd HH:mm')} 至 {project.endTime ? format(new Date(project.endTime), 'MM-dd HH:mm') : '无限期'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!deleteMode && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProjectInfo(project);
                              }}
                              className="text-xs shadow-none border-none bg-transparent text-gray-600 h-7 px-3 rounded hover:bg-blue-100"
                            >
                              查看
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project.id);
                              }}
                              className="text-xs shadow-none bg-blue-600 text-white h-7 px-3 rounded hover:bg-blue-700"
                            >
                              编辑
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </MotionEffect>
              );
            }
          })}
        </div>
      )}

      {/* 分页控制区域 */}
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
      
      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除选中的 {projectsToDelete.length} 个项目吗？此操作将删除项目的所有相关数据，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
