"use client"

import { format } from 'date-fns'
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
  Gift, 
  ExternalLink, 
  Shield, 
  Check,
  X,
  ChevronRight,
  Lock
} from 'lucide-react'
import { 
  PROJECT_CATEGORIES, 
  getCategoryLabel
} from '@/lib/constants'

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
  hasPassword?: boolean
  claimPassword?: string | null
  creator: {
    id: string
    name: string
    nickname?: string
    image?: string
  }
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
    case 'ACTIVE': return { label: '活跃', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-100' };
    case 'PAUSED': return { label: '暂停', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' };
    case 'COMPLETED': return { label: '已完成', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' };
    case 'EXPIRED': return { label: '已过期', color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-100' };
    default: return { label: status, color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-100' };
  }
}

interface ProjectInfoProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
}

export default function ProjectInfo({ project, isOpen, onClose }: ProjectInfoProps) {
  if (!project) return null
  
  const statusConfig = getStatusConfig(project.status);
  const progress = project.totalQuota > 0 ? Math.round((project.claimedCount / project.totalQuota) * 100) : 0;
  const hasPassword = Boolean(project.hasPassword);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 bg-white rounded-xl">
        {/* 顶部区域 */}
        <div className="relative p-6 pb-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${statusConfig.color}`}></div>
            <span className={`text-xs font-medium ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">
              {getCategoryLabel(project.category as keyof typeof PROJECT_CATEGORIES)}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">
              {getDistributionModeLabel(project.distributionMode)}
            </span>
          </div>
          
          <DialogTitle className="text-xl font-bold tracking-tight text-gray-900 mb-2">
            {project.name}
          </DialogTitle>
          
          <DialogDescription className="text-sm text-gray-600 mb-2 leading-relaxed">
            {project.description}
          </DialogDescription>
          
          <div className="absolute top-6 right-6 flex space-x-2">
            <Badge 
              variant={project.requireLinuxdo ? "default" : "secondary"} 
              className={project.requireLinuxdo 
                ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200" 
                : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200"}
            >
              {project.requireLinuxdo ? 'LinuxDo认证' : '普通项目'}
            </Badge>
            <Badge 
              variant="outline" 
              className={project.isPublic 
                ? "border-green-200 bg-green-50 text-green-700" 
                : "border-gray-200 bg-gray-50 text-gray-700"}
            >
              {project.isPublic ? '公开' : '私有'}
            </Badge>
          </div>
        </div>
        
        {/* 进度指示器 */}
        <div className="px-6 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-700">
              领取进度 ({project.claimedCount}/{project.totalQuota})
            </div>
            <div className="text-sm font-medium text-gray-700">
              {progress}%
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {/* 使用ScrollArea包装内容区域 */}
        <ScrollArea className="h-[40vh]">
          <div className="border-t border-gray-100">
            <div className="grid grid-cols-1 divide-y divide-gray-100">
              {/* 基本信息部分 */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">基本信息</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <div className="text-xs text-gray-500">创建者</div>
                      <div className="text-sm font-medium text-gray-900">
                        {project.creator.nickname || project.creator.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <div className="text-xs text-gray-500">创建时间</div>
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(project.createdAt), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <div className="text-xs text-gray-500">项目时间</div>
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(project.startTime), 'yyyy-MM-dd HH:mm')} 至 
                        {project.endTime ? format(new Date(project.endTime), ' yyyy-MM-dd HH:mm') : ' 无限期'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 text-gray-400 mr-3" />
                    <div>
                      <div className="text-xs text-gray-500">剩余名额</div>
                      <div className="text-sm font-medium text-gray-900">
                        {project.remainingQuota} 个
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 安全设置部分 */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">安全设置</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                      {project.requireLinuxdo ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        LinuxDo认证
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.requireLinuxdo ? '需要认证' : '无需认证'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                      <Shield className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        信任等级
                      </div>
                      <div className="text-xs text-gray-500">
                        等级 {project.minTrustLevel} 以上
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                      <Shield className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        风险阈值
                      </div>
                      <div className="text-xs text-gray-500">
                        阈值 {project.minRiskThreshold}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        领取密码
                      </div>
                      <div className="text-xs text-gray-500">
                        {hasPassword ? '已设置密码' : '无需密码'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 使用说明 */}
              {project.usageUrl && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">使用链接</h3>
                  <a 
                    href={project.usageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <ExternalLink className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-blue-600">{project.usageUrl}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              )}
              
              {/* 项目教程 */}
              {project.tutorial && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">使用教程</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                    {project.tutorial}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        
        {/* 底部按钮 */}
        <div className="border-t border-gray-100 p-4 flex justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
