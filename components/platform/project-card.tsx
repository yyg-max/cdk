"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Lock, Users, Clock, Shield, Calendar, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

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
    gradient: "bg-gradient-to-br from-cyan-400 to-blue-500",
    name: "AI智能"
  },
  SOFTWARE: {
    gradient: "bg-gradient-to-br from-blue-500 to-purple-600", 
    name: "软件工具"
  },
  GAME: {
    gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
    name: "游戏娱乐"
  },
  EDUCATION: {
    gradient: "bg-gradient-to-br from-green-400 to-blue-500", 
    name: "教育学习"
  },
  RESOURCE: {
    gradient: "bg-gradient-to-br from-orange-400 to-pink-400",
    name: "资源分享"
  },
  LIFE: {
    gradient: "bg-gradient-to-br from-emerald-400 to-cyan-400",
    name: "生活服务"
  },
  OTHER: {
    gradient: "bg-gradient-to-br from-gray-500 to-gray-600",
    name: "其他"
  }
}

// 项目类型定义
interface Project {
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

export function ProjectCard({ project, showCategory = false, variant = 'default' }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // 用户显示名
  const creatorName = project.creator.nickname || project.creator.name
  
  // 格式化创建时间
  const formattedTime = formatDistanceToNow(new Date(project.createdAt), {
    addSuffix: true,
    locale: zhCN
  })

  // 计算进度百分比
  const progressPercentage = project.totalQuota > 0 
    ? Math.round((project.claimedCount / project.totalQuota) * 100) 
    : 0

  // 获取渐变主题
  const gradientTheme = CATEGORY_GRADIENTS[project.category] || CATEGORY_GRADIENTS.OTHER
  
  // 检查是否即将过期
  const isExpiringSoon = project.endTime && new Date(project.endTime) < new Date(Date.now() + 24 * 60 * 60 * 1000)
  
  return (
    <div className="space-y-3">
      <Link href={`/platform/share/${project.id}`} passHref>
        <Card 
          className="group overflow-hidden transition-all duration-200 hover:shadow-lg border-0 rounded-2xl"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CardContent className="p-0">
            {/* 1. 背景中央：标题 + 头像+创建人名称 */}
            <div className={`${gradientTheme.gradient} p-6 rounded-2xl text-white relative`}>
              <div className="flex flex-col items-center justify-center h-32 space-y-4">
                {/* 项目标题 */}
                <h3 className="text-xl font-bold text-white text-center leading-tight line-clamp-2">
                  {project.name}
                </h3>
                
                {/* 头像 + 创建人名称 */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-white/30">
                    <AvatarImage src={project.creator.image} alt={creatorName} />
                    <AvatarFallback className="bg-white/20 text-white text-sm font-medium">
                      {creatorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white/90 text-sm font-medium">
                    {creatorName}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      
      {/* 2. 下方：标题 + 描述 + tag + 要求 */}
      <div className="space-y-3">
        {/* 标题 */}
        <h4 className="font-semibold text-foreground text-base line-clamp-1">
          {project.name}
        </h4>
        
        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description}
        </p>
        
        {/* 标签 + 要求 */}
        <div className="space-y-2">
          {/* 项目标签 */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="secondary" 
                  className="text-xs px-2 py-1"
                >
                  {tag.name}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{project.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* 要求标签 */}
          <div className="flex flex-wrap gap-1">
            {/* 是否需要密码 */}
            <Badge 
              variant={project.hasPassword ? "destructive" : "default"}
              className="text-xs px-2 py-1"
            >
              <Lock className="h-2.5 w-2.5 mr-1" />
              {project.hasPassword ? '需要密码' : '免费获取'}
            </Badge>
            
            {/* 是否需要 LinuxDo */}
            {project.requireLinuxdo && (
              <Badge variant="outline" className="text-xs px-2 py-1 border-blue-200 text-blue-700">
                <Shield className="h-2.5 w-2.5 mr-1" />
                需要LinuxDo认证
              </Badge>
            )}
            
            {/* 需要等级 */}
            {project.requireLinuxdo && project.minTrustLevel && (
              <Badge variant="outline" className="text-xs px-2 py-1 border-purple-200 text-purple-700">
                <Users className="h-2.5 w-2.5 mr-1" />
                T{project.minTrustLevel}+ 等级
              </Badge>
            )}
            
            {/* 时间限制 */}
            {project.endTime && (
              <Badge 
                variant={isExpiringSoon ? "destructive" : "outline"}
                className="text-xs px-2 py-1"
              >
                <Calendar className="h-2.5 w-2.5 mr-1" />
                {isExpiringSoon ? '即将过期' : '限时活动'}
              </Badge>
            )}
            
            {/* 分发模式 */}
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {DISTRIBUTION_MODE_NAMES[project.distributionMode]}
            </Badge>
          </div>
          
          {/* 进度信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>已领取: {project.claimedCount}/{project.totalQuota}</span>
            <span>剩余: {project.remainingQuota}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 