"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Lock, Shield, Clock, Gift } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// 定义分发模式名称映射
const DISTRIBUTION_MODE_NAMES: Record<string, string> = {
  SINGLE: "一码一用",
  MULTI: "一码多用",
  MANUAL: "手动邀请"
}

// 参考图片风格的简洁渐变配色
const CATEGORY_GRADIENTS: Record<string, {
  gradient: string
  name: string
}> = {
  AI: {
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600",
    name: "AI智能"
  },
  SOFTWARE: {
    gradient: "bg-gradient-to-br from-blue-600 to-purple-700", 
    name: "软件工具"
  },
  GAME: {
    gradient: "bg-gradient-to-br from-purple-600 to-pink-600",
    name: "游戏娱乐"
  },
  EDUCATION: {
    gradient: "bg-gradient-to-br from-green-500 to-blue-600", 
    name: "教育学习"
  },
  RESOURCE: {
    gradient: "bg-gradient-to-br from-orange-500 to-pink-500",
    name: "资源分享"
  },
  LIFE: {
    gradient: "bg-gradient-to-br from-emerald-500 to-cyan-500",
    name: "生活服务"
  },
  OTHER: {
    gradient: "bg-gradient-to-br from-gray-600 to-gray-700",
    name: "其他"
  }
}

// 项目类型定义
export interface Project {
  id: string
  name: string
  description: string
  category: string
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
  requireLinuxdo?: boolean
  minTrustLevel?: number
  endTime?: string
}

interface ProjectCardProps {
  project: Project
  showCategory?: boolean
  variant?: 'default' | 'compact'
}

export function ProjectCard({ project }: ProjectCardProps) {
  // 用户显示名
  const creatorName = project.creator.nickname || project.creator.name
  
  // 获取渐变主题
  const gradientTheme = CATEGORY_GRADIENTS[project.category] || CATEGORY_GRADIENTS.OTHER
  
  return (
    <div className="space-y-3">
      <Link href={`/platform/share/${project.id}`} passHref>
        <Card 
          className="group overflow-hidden transition-all duration-300 hover:shadow-lg border-0 rounded-2xl hover:rounded-none hover:scale-[1.05] transform"
        >
          <CardContent className="p-0">
            {/* 1. 背景中央：标题 + 头像+创建人名称 */}
            <div className={`${gradientTheme.gradient} p-6 rounded-2xl group-hover:rounded-none transition-all duration-300 text-white relative`}>
              {/* 左上角标识 */}
              <TooltipProvider>
                <div className="absolute top-3 left-3 flex gap-2">
                  {project.endTime && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Clock className="h-4 w-4 text-white drop-shadow-md" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>截止时间: {format(new Date(project.endTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {project.requireLinuxdo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5">
                          <Shield className="h-4 w-4 text-white drop-shadow-md" />
                          {project.minTrustLevel && (
                            <span className="text-[10px] text-white font-medium drop-shadow-md">T{project.minTrustLevel}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>需要 LinuxDo {project.minTrustLevel} 级</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {project.hasPassword && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-4 w-4 text-white drop-shadow-md" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>需要密码</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
              
              <div className="flex flex-col items-center justify-center h-32 space-y-4">
                {/* 项目标题 */}
                <h3 className="text-2xl font-bold text-white text-center leading-tight line-clamp-2">
                  {project.name}
                </h3>
                
                {/* 头像 + 创建人名称 */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border-1 border-white/30">
                    <AvatarImage src={project.creator.image} alt={creatorName} />
                    <AvatarFallback className="bg-white/20 text-white text-sm font-medium">
                      {creatorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white/90 text-sm font-medium">
                    {creatorName}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 text-xs text-white flex justify-end w-full">
                  <div className="flex items-center gap-1">
                    <Gift className="h-4 w-4 text-white drop-shadow-md" />
                    <span>{project.claimedCount}/{project.totalQuota}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      
      {/* 2. 下方：标题 + 分发模式 + tag + 描述 */}
      <div className="space-y-1">
        {/* 标题 + 分发模式 + 标签 */}
        <div className="flex items-center gap-1.5">
          {/* 标题 */}
          <h4 className="font-semibold text-foreground text-base line-clamp-1">
            {project.name}
          </h4>

          {/* 分发模式 */}
          <Badge variant="secondary" className="text-[10px] px-1 py-0.5">
            {DISTRIBUTION_MODE_NAMES[project.distributionMode]}
          </Badge>

          {/* 标签 */}
          <div className="space-y-2">
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.tags.slice(0, 1).map((tag) => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary" 
                    className="text-[10px] px-1 py-0.5"
                  >
                    {tag.name}
                  </Badge>
                ))}
                {project.tags.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] px-1 py-0.5 cursor-default">
                        +{project.tags.length - 1}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-2">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {project.tags.slice(1).map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="secondary" 
                            className="text-[10px] px-1 py-0.5"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description}
        </p>
    
      </div>
    </div>
  )
} 