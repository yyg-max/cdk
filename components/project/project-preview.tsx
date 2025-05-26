"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Shield, Eye, EyeOff } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

interface ProjectPreviewProps {
  data: {
    name: string
    description: string
    category: string
    tags?: string[]
    usageUrl?: string
    totalQuota: number
    tutorial?: string
    distributionMode: "single" | "multi" | "manual"
    isPublic: boolean
    startTime: Date
    endTime?: Date
    requireLinuxdo: boolean
    minTrustLevel: number
    minRiskThreshold: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  ai: "人工智能",
  software: "软件工具", 
  game: "游戏娱乐",
  education: "教育学习",
  resource: "资源分享",
  life: "生活服务",
  other: "其他",
}

const DISTRIBUTION_MODE_LABELS: Record<string, string> = {
  single: "一码一用",
  multi: "一码多用", 
  manual: "手动邀请",
}

export function ProjectPreview({ data }: ProjectPreviewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{data.name || "项目名称"}</CardTitle>
              {data.isPublic ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <CardDescription>{data.description || "项目描述"}</CardDescription>
          </div>
          <Badge variant="secondary">
            {CATEGORY_LABELS[data.category] || "未分类"}
          </Badge>
        </div>
        
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 项目信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{data.totalQuota} 个名额</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {DISTRIBUTION_MODE_LABELS[data.distributionMode]}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(data.startTime, "MM/dd", { locale: zhCN })}</span>
          </div>
          
          {data.endTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(data.endTime, "MM/dd", { locale: zhCN })}</span>
            </div>
          )}
        </div>

        {/* 限制条件 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">领取限制</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {data.requireLinuxdo && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Linux Do 认证
              </Badge>
            )}
            {data.requireLinuxdo && (
              <Badge variant="outline">
                信任等级 ≥ {data.minTrustLevel}
              </Badge>
            )}
            <Badge variant="outline">
              风控阈值 ≥ {data.minRiskThreshold}
            </Badge>
          </div>
        </div>

        {/* 使用教程预览 */}
        {data.tutorial && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">使用教程</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {data.tutorial}
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            {data.distributionMode === "manual" ? "申请名额" : "立即领取"}
          </Button>
          {data.usageUrl && (
            <Button size="sm" variant="outline">
              访问项目
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 