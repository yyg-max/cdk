"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  Shield, 
  ChevronRight,
  Lock,
  UserCheck,
  AlertTriangle,
  Users,
  CheckCircle,
  Ticket
} from 'lucide-react'
import { 
  PROJECT_CATEGORIES, 
  getCategoryLabel
} from '@/lib/constants'
import { Project, ProjectInfoProps } from './types'

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
    case 'ACTIVE': return { label: '活跃', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-100' };
    case 'PAUSED': return { label: '暂停', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' };
    case 'COMPLETED': return { label: '已完成', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' };
    case 'EXPIRED': return { label: '已过期', color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-100' };
    default: return { label: status, color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-100' };
  }
}

export default function ProjectInfo({ project, isOpen, onClose }: ProjectInfoProps) {
  // 状态管理
  const [claimsData, setClaimsData] = useState<Project['claimsData'] | undefined>(undefined)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  
  // 获取项目状态数据
  const fetchProjectStatus = async (page: number): Promise<void> => {
    if (!project) return;
    
    try {
      if (page === 1) {
        // 首次加载不显示加载状态
        setCurrentPage(1)
      } else {
        // 加载更多时显示加载状态
        setIsLoadingMore(true)
      }
      
      // 调用API获取数据
      const response = await fetch(`/api/projects/status?projectId=${project.id}&page=${page}&pageSize=10`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取项目状态失败')
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        if (page === 1) {
          // 首次加载直接设置数据
          setClaimsData(data.data)
        } else {
          // 加载更多时合并数据
          setClaimsData(prev => {
            if (!prev) return data.data
            
            return {
              ...data.data,
              recentClaims: [...(prev.recentClaims || []), ...(data.data.recentClaims || [])]
            }
          })
        }
        
        // 更新页码
        setCurrentPage(page)
      } else {
        toast.error(data.error || '获取数据失败')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取项目状态失败'
      toast.error(errorMessage)
    } finally {
      setIsLoadingMore(false)
    }
  }
  
  // 加载更多记录
  const loadMoreClaims = (): void => {
    if (!isLoadingMore && claimsData?.hasMore) {
      fetchProjectStatus(currentPage + 1)
    }
  }
  
  // 初始加载数据
  useEffect(() => {
    if (isOpen && project?.id) {
      fetchProjectStatus(1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project?.id])
  
  if (!project) return null
  
  // 计算UI状态
  const statusConfig = getStatusConfig(project.status)
  const progress = project.totalQuota > 0 ? Math.round((project.claimedCount / project.totalQuota) * 100) : 0
  const hasPassword = Boolean(project.hasPassword)
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 bg-white rounded-lg border shadow-lg fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
        {/* 顶部区域 - Vercel 风格 */}
        <div className="relative p-6 pb-4">
          {/* 标题栏区域 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color}`}></div>
              <span className="text-xs font-medium text-gray-500">
                {statusConfig.label}
              </span>
            </div>
            
            <div className="flex items-center space-x-1.5">
              <Badge variant="secondary" className="text-xs font-normal bg-gray-100 hover:bg-gray-200 text-gray-800">
                {getCategoryLabel(project.category as keyof typeof PROJECT_CATEGORIES)}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal bg-gray-100 hover:bg-gray-200 text-gray-800">
                {getDistributionModeLabel(project.distributionMode)}
              </Badge>
            </div>
          </div>
          
          {/* 项目标题 */}
          <DialogTitle className="text-xl font-medium tracking-tight text-gray-900 mb-2">
            {project.name}
          </DialogTitle>
          
          {/* 项目描述 */}
          <DialogDescription className="text-sm text-gray-500 leading-relaxed mb-4">
            {project.description}
          </DialogDescription>
          
          {/* 进度指示器 - Vercel 风格 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2 text-sm">
              <div className="text-gray-700">
                {project.claimedCount} / {project.totalQuota} <span className="text-gray-500">已领取</span>
              </div>
              <div>
                <Badge variant={progress >= 80 ? "default" : "outline"} className={progress >= 80 ? "bg-black text-white" : "text-gray-700"}>
                  {progress}%
                </Badge>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div 
                className="bg-black h-1 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* 重要信息展示 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-xs text-gray-500 mb-1">状态</div>
              <div className="text-sm font-medium text-gray-900 flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} mr-1.5`}></div>
                {statusConfig.label}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 mb-1">剩余名额</div>
              <div className="text-sm font-medium text-gray-900">
                {project.remainingQuota}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 mb-1">开始时间</div>
              <div className="text-sm font-medium text-gray-900">
                {format(new Date(project.startTime), 'yyyy-MM-dd')}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 mb-1">结束时间</div>
              <div className="text-sm font-medium text-gray-900">
                {project.endTime ? format(new Date(project.endTime), 'yyyy-MM-dd') : '无限期'}
              </div>
            </div>
          </div>
          
          {/* 项目标签显示 - Vercel 风格 */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-4">
              <div className="text-xs text-gray-500 mr-2">标签:</div>
              {project.tags.map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="outline" 
                  className="text-xs border-gray-200 hover:border-gray-300 bg-transparent text-gray-700"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          
          {/* 项目基本信息 - Vercel 风格 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <div className="flex items-center">
              <User className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              {project.creator.nickname || project.creator.name}
            </div>
            
            <div className="flex items-center">
              <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              创建于 {format(new Date(project.createdAt), 'yyyy-MM-dd')}
            </div>
            
            {project.isPublic ? (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                公开
              </div>
            ) : (
              <div className="flex items-center">
                <Lock className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                私有
              </div>
            )}
            
            {project.hasPassword && (
              <div className="flex items-center">
                <Lock className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                需要密码
              </div>
            )}
            
            {project.requireLinuxdo && (
              <div className="flex items-center">
                <Shield className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                LinuxDo认证
              </div>
            )}
          </div>
        </div>
        
        {/* 分隔线 */}
        <div className="h-px bg-gray-100 w-full"></div>
        
        {/* 使用ScrollArea包装内容区域 - Vercel 风格 */}
        <ScrollArea className="h-[45vh]">
          <div className="p-6 space-y-8">
            {/* 领取情况区域 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">领取情况</h3>
              <div className="space-y-4">
                {/* 基本领取信息卡片 */}
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">分发模式</span>
                      <div className="flex items-center mt-1">
                        {project.distributionMode === 'SINGLE' && (
                          <Ticket className="w-4 h-4 text-gray-500 mr-2" />
                        )}
                        {project.distributionMode === 'MULTI' && (
                          <Users className="w-4 h-4 text-gray-500 mr-2" />
                        )}
                        {project.distributionMode === 'MANUAL' && (
                          <CheckCircle className="w-4 h-4 text-gray-500 mr-2" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {project.distributionMode === 'SINGLE' ? '一码一用' : 
                          project.distributionMode === 'MULTI' ? '一码多用' : '申请-邀请'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">总配额</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">
                        {project.totalQuota}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">已领取</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">
                        {project.claimedCount}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">剩余</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">
                        {project.remainingQuota}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 具体领取方式说明 */}
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex items-start">
                    {project.distributionMode === 'SINGLE' && (
                      <>
                        <Ticket className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-900 block mb-1">一码一用模式</span>
                          <p className="text-xs text-gray-500">
                            每个邀请码仅能被使用一次，系统已为您生成 {project.totalQuota} 个唯一邀请码。
                            目前已有 {project.claimedCount} 个邀请码被使用。
                          </p>
                        </div>
                      </>
                    )}
                    
                    {project.distributionMode === 'MULTI' && (
                      <>
                        <Users className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-900 block mb-1">一码多用模式</span>
                          <p className="text-xs text-gray-500">
                            单个邀请码可被多人使用，最多 {project.totalQuota} 人可领取。
                            目前已有 {project.claimedCount} 人成功领取。
                          </p>
                        </div>
                      </>
                    )}
                    
                    {project.distributionMode === 'MANUAL' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-gray-500 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-900 block mb-1">申请-邀请模式</span>
                          <p className="text-xs text-gray-500">
                            用户需要提交申请并回答问题，经您审核通过后才能领取。
                            目前已批准 {project.claimedCount} 人，{project.claimsData?.pendingApplicationsCount || 0} 人待审核。
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* 领取记录列表 */}
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900">领取记录</span>
                    {project.claimedCount > 0 && claimsData?.recentClaims && (
                      <span className="text-xs text-gray-500">
                        共 {claimsData.totalCount} 条记录
                        {claimsData.recentClaims.length < claimsData.totalCount && `，显示 ${claimsData.recentClaims.length} 条`}
                      </span>
                    )}
                  </div>
                  
                  {project.claimedCount === 0 ? (
                    <div className="text-center py-4">
                      <span className="text-sm text-gray-500">暂无领取记录</span>
                    </div>
                  ) : claimsData?.recentClaims && claimsData.recentClaims.length > 0 ? (
                    <div className="space-y-0">
                      <div className="grid grid-cols-12 text-xs text-gray-500 pb-2 border-b border-gray-200">
                        <div className="col-span-4 sm:col-span-3">用户</div>
                        <div className="col-span-3 sm:col-span-4 hidden sm:block">领取方式</div>
                        <div className="col-span-5 sm:col-span-3 text-right sm:text-left">领取时间</div>
                        <div className="col-span-3 sm:col-span-2 text-right">状态</div>
                      </div>
                      
                      {claimsData.recentClaims.map((claim) => (
                        <div key={claim.id} className="grid grid-cols-12 py-2.5 border-b border-gray-100 last:border-0 items-center">
                          <div className="col-span-4 sm:col-span-3 flex items-center">
                            <User className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-900 truncate">{claim.claimerName}</span>
                          </div>
                          
                          <div className="col-span-3 sm:col-span-4 hidden sm:flex items-center">
                            {claim.type === 'single' && (
                              <div className="flex items-center">
                                <Ticket className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                <span className="text-xs text-gray-700">一码一用</span>
                              </div>
                            )}
                            {claim.type === 'multi' && (
                              <div className="flex items-center">
                                <Users className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                <span className="text-xs text-gray-700">一码多用</span>
                              </div>
                            )}
                            {claim.type === 'manual' && (
                              <div className="flex items-center">
                                <CheckCircle className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                <span className="text-xs text-gray-700">申请-邀请</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-5 sm:col-span-3 text-right sm:text-left">
                            <span className="text-xs text-gray-700">{format(new Date(claim.claimedAt), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                          
                          <div className="col-span-3 sm:col-span-2 text-right">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-50 text-green-700">
                              <div className="w-1 h-1 rounded-full bg-green-500 mr-1"></div>
                              已领取
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* 加载更多按钮 */}
                      {claimsData.hasMore && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMoreClaims}
                            disabled={isLoadingMore}
                            className="text-xs h-8 border-gray-200 text-gray-700 hover:bg-gray-100"
                          >
                            {isLoadingMore ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                加载中...
                              </>
                            ) : (
                              <>加载更多</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-sm text-gray-500">正在加载领取记录...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 安全设置区域 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">安全设置</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">LinuxDo认证</span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCheck className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {project.requireLinuxdo ? '必需' : '不必需'}
                      </span>
                    </div>
                    {project.requireLinuxdo && (
                      <div className="w-2 h-2 rounded-full bg-black"></div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">密码保护</span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Lock className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {hasPassword ? '已启用' : '未启用'}
                      </span>
                    </div>
                    {hasPassword && (
                      <div className="w-2 h-2 rounded-full bg-black"></div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">信任等级要求</span>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Lv.{project.minTrustLevel}+
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">风险阈值要求</span>
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {project.minRiskThreshold}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 时间信息区域 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">项目时间</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">开始时间</span>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{format(new Date(project.startTime), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500">结束时间</span>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{project.endTime ? format(new Date(project.endTime), 'yyyy-MM-dd HH:mm') : '无限期'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 使用链接 */}
            {project.usageUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">项目链接</h3>
                <a 
                  href={project.usageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center">
                    <ExternalLink className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-900">{project.usageUrl}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </a>
              </div>
            )}
            
            {/* 项目教程 */}
            {project.tutorial && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">使用教程</h3>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                  {project.tutorial}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* 底部按钮区域 - Vercel 风格 */}
        <div className="border-t border-gray-100 p-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            更新于 {format(new Date(project.updatedAt), 'yyyy-MM-dd')}
          </div>
          
          <div className="flex space-x-3">
            {project.usageUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => project.usageUrl && window.open(project.usageUrl, '_blank')}
                className="h-8 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                访问链接
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm"
              onClick={onClose}
              className="h-8 bg-black text-white hover:bg-gray-800"
            >
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  ) 
}
