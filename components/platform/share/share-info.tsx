"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Lock, 
  AlertCircle,
  Copy,
  Check,
  Shield,
  ArrowLeft,
  Gift,
  ExternalLink,
  XCircle,
  CheckCircle,
  User,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import type { Project, ProjectCategory, DistributionMode } from "@/components/project/read/types"
import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * 分发模式中文名称映射
 * 将英文分发模式枚举值映射为用户友好的中文显示名称
 */
const DISTRIBUTION_MODE_NAMES: Record<DistributionMode, string> = {
  SINGLE: "一码一用",
  MULTI: "一码多用", 
  MANUAL: "手动邀请"
} as const

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
 * 格式化日期时间
 * 将ISO日期字符串格式化为中文本地化的日期时间格式
 * 
 * @param dateString - ISO格式的日期字符串
 * @returns 格式化后的日期时间字符串 (yyyy-MM-dd HH:mm:ss)
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * 领取状态检查结果接口
 */
interface ClaimCheckResult {
  claimed: boolean
  canClaim?: boolean
  reason?: string
  requirements?: {
    userStatus: boolean
    projectActive: boolean
    timeValid: boolean
    quotaAvailable: boolean
    linuxdoAuth: boolean
    trustLevel: boolean
  }
  needPassword?: boolean
  content?: string
  usageUrl?: string | null
  tutorial?: string | null
  claimedAt?: string
  projectInfo?: {
    name: string
    status: string
    totalQuota: number
    claimedCount: number
    remainingQuota: number
    distributionMode: DistributionMode
  }
}

/**
 * 项目分享信息组件属性接口
 */
interface ShareInfoProps {
  /** 项目唯一标识符 */
  projectId: string
}

/**
 * 获取项目状态的显示配置
 */
function getStatusConfig(status: string) {
  switch (status) {
    case 'ACTIVE': 
      return { 
        label: '活跃', 
        variant: 'default' as const
      }
    case 'PAUSED': 
      return { 
        label: '暂停', 
        variant: 'secondary' as const
      }
    case 'COMPLETED': 
      return { 
        label: '已完成', 
        variant: 'secondary' as const
      }
    case 'EXPIRED': 
      return { 
        label: '已过期', 
        variant: 'outline' as const
      }
    default: 
      return { 
        label: status, 
        variant: 'outline' as const
      }
  }
}

/**
 * 项目分享信息组件
 * 
 * 采用 Vercel + ShadcnUI 简约黑白高级设计风格
 * 无边框、极简、高级感
 */
export function ShareInfo({ projectId }: ShareInfoProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [claimStatus, setClaimStatus] = useState<ClaimCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("content")
  const [justClaimed, setJustClaimed] = useState(false)

  /**
   * 检查领取状态和要求
   */
  const checkClaimStatus = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/check-claim`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage("请先登录后查看项目内容")
          return
        }
        throw new Error(`检查失败: ${response.status}`)
      }
      
      const data = await response.json() as unknown;
      
      if (data && typeof data === 'object' && 'success' in data && data.success === true && 'data' in data) {
        const checkResult = data.data as ClaimCheckResult
        setClaimStatus(checkResult)
        
        // 如果已领取且有教程或使用地址，默认切换到使用选项卡
        if (checkResult.claimed && (checkResult.usageUrl || checkResult.tutorial)) {
          setActiveTab("usage")
        }
      } else {
        throw new Error("响应格式错误")
      }
    } catch (err) {
      console.error("检查领取状态错误:", err)
      setErrorMessage("检查领取状态失败，请稍后重试")
    }
  };

  /**
   * 获取项目基本信息
   */
  const fetchProject = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage("项目不存在");
        } else {
          throw new Error("获取项目详情失败");
        }
        return;
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setProject(data.data);
      } else {
        setErrorMessage("项目数据格式错误");
      }
    } catch (err) {
      console.error("获取项目详情错误:", err);
      setErrorMessage("网络错误，请稍后重试");
    }
  };

  // 初始化加载
  useEffect(() => {
    const initialize = async () => {
      if (projectId) {
        setIsLoading(true)
        await Promise.all([
          fetchProject(),
          checkClaimStatus()
        ])
        setIsLoading(false)
      }
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /**
   * 验证密码并领取
   */
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      toast.error("请输入密码")
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()
      
      if (data.success) {
        setJustClaimed(true)
        toast.success("领取成功")
        await checkClaimStatus()
        setPassword("")
      } else {
        toast.error(data.error || "密码错误")
      }
    } catch (err) {
      console.error("密码验证错误:", err)
      toast.error("验证失败，请稍后重试")
    } finally {
      setIsVerifying(false)
    }
  }

  /**
   * 直接领取（无密码）
   */
  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      
      if (data.success) {
        setJustClaimed(true)
        toast.success("领取成功")
        await checkClaimStatus()
      } else {
        toast.error(data.error || "领取失败")
      }
    } catch (err) {
      console.error("领取错误:", err)
      toast.error("领取失败，请稍后重试")
    } finally {
      setIsClaiming(false)
    }
  }

  /**
   * 复制内容到剪贴板
   */
  const handleCopy = async (content: string, label: string = "内容") => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success(`已复制${label}`)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("复制失败:", err)
      toast.error("复制失败")
    }
  }

  // 渲染加载状态
  if (isLoading) {
    return <ShareInfoSkeleton />
  }

  // 渲染错误状态
  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">
          出错了
        </h1>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          {errorMessage}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => window.history.back()} variant="ghost">
            返回上一页
          </Button>
          <Button onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  if (!project || !claimStatus) {
    return null
  }

  const progressPercentage = project.totalQuota > 0 
    ? Math.round((project.claimedCount / project.totalQuota) * 100) 
    : 0

  const statusConfig = getStatusConfig(project.status)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-12">
        <Link 
          href="/platform" 
          className="group inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-0.5" />
          返回探索广场
        </Link>
        
        {claimStatus.claimed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-900">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            已领取
          </Badge>
        )}
      </div>

      {/* 标题区域 */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-8 mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {project.name}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {project.description || "暂无项目描述"}
            </p>
          </div>
          
          {/* 剩余名额 */}
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">剩余名额</div>
            <div className="text-4xl font-bold text-gray-900">
              {project.remainingQuota}
            </div>
            <div className="text-sm text-gray-500">
              共 {project.totalQuota} 个
            </div>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Badge variant="outline" className="text-gray-700">
            {CATEGORY_NAMES[project.category] || project.category}
          </Badge>
          <Badge variant="secondary">
            {DISTRIBUTION_MODE_NAMES[project.distributionMode]}
          </Badge>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
          {project.requireLinuxdo && (
            <Badge variant="outline" className="text-gray-700">
              <Shield className="h-3 w-3 mr-1" /> 
              T{project.minTrustLevel}+
            </Badge>
          )}
          {project.hasPassword && (
            <Badge variant="outline" className="text-gray-700">
              <Lock className="h-3 w-3 mr-1" /> 
              需要密码
            </Badge>
          )}
          {project.tags && project.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-gray-600">
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* 项目信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 py-6 border-y border-gray-100">
        {/* 发起人 */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            {project.creator.image ? (
              <Avatar>
                <AvatarImage src={project.creator.image} />
                <AvatarFallback>
                  {project.creator.nickname?.[0] || project.creator.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {project.creator.nickname || project.creator.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(project.createdAt), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </div>
          </div>
        </div>
        
        {/* 开始时间 */}
        <div>
          <div className="text-xs text-gray-500 mb-1">开始时间</div>
          <div className="text-sm text-gray-900">
            {formatDateTime(project.startTime)}
          </div>
        </div>
        
        {/* 结束时间 */}
        <div>
          <div className="text-xs text-gray-500 mb-1">结束时间</div>
          <div className="text-sm text-gray-900">
            {project.endTime ? formatDateTime(project.endTime) : "永久有效"}
          </div>
        </div>
        
        {/* 进度 */}
        <div>
          <div className="text-xs text-gray-500 mb-2">领取进度</div>
          <div className="text-sm text-gray-900 mb-2">
            {project.claimedCount}/{project.totalQuota} ({progressPercentage}%)
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-900 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 核心内容区域 */}
      <div className="space-y-6">
        {claimStatus.claimed ? (
          // 已领取状态
          <div className={cn(
            "transition-all duration-300",
            justClaimed && "animate-in fade-in-0 duration-300"
          )}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-50">
                <TabsTrigger value="content" className="data-[state=active]:bg-white">
                  领取内容
                </TabsTrigger>
                {(claimStatus.usageUrl || claimStatus.tutorial) && (
                  <TabsTrigger value="usage" className="data-[state=active]:bg-white">
                    使用方法
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="content" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      领取成功 {claimStatus.claimedAt && `· ${formatDistanceToNow(new Date(claimStatus.claimedAt), { addSuffix: true, locale: zhCN })}`}
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <ScrollArea className="h-32">
                      <div className="font-mono text-sm break-all whitespace-pre-wrap text-gray-900">
                        {claimStatus.content}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <Button
                    onClick={() => handleCopy(claimStatus.content || "", "内容")}
                    variant="outline"
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        复制内容
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="usage" className="mt-6">
                <div className="space-y-6">
                  {claimStatus.usageUrl && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900">使用链接</h3>
                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <a 
                          href={claimStatus.usageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-900 text-sm truncate flex-1 hover:underline"
                        >
                          {claimStatus.usageUrl}
                        </a>
                        <Button
                          onClick={() => handleCopy(claimStatus.usageUrl || "", "链接")}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => window.open(claimStatus.usageUrl!, '_blank')}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {claimStatus.tutorial && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900">使用教程</h3>
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-900 whitespace-pre-wrap">
                        {claimStatus.tutorial}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : !claimStatus.canClaim ? (
          // 不符合要求状态
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">不满足领取要求</h3>
            <p className="text-gray-600 mb-6">
              {claimStatus.reason}
            </p>
            
            {/* 详细要求检查 */}
            {claimStatus.requirements && (
              <div className="text-left max-w-md mx-auto">
                <h4 className="text-sm font-medium text-gray-900 mb-3">检查结果</h4>
                <div className="space-y-2">
                  {Object.entries(claimStatus.requirements).map(([key, passed]) => {
                    const labels: Record<string, string> = {
                      userStatus: '用户状态正常',
                      projectActive: '项目处于活跃状态',
                      timeValid: '在有效时间内',
                      quotaAvailable: '仍有剩余名额',
                      linuxdoAuth: 'LinuxDo 认证',
                      trustLevel: '信任等级达标'
                    }
                    
                    return (
                      <div 
                        key={key}
                        className="flex items-center gap-2 text-sm"
                      >
                        {passed ? (
                          <CheckCircle className="h-4 w-4 text-gray-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={cn(
                          passed ? "text-gray-900" : "text-gray-500"
                        )}>
                          {labels[key]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : claimStatus.needPassword ? (
          // 密码验证状态
          <div className="max-w-sm mx-auto py-8">
            <div className="text-center mb-6">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">密码验证</h3>
              <p className="text-sm text-gray-600">该项目需要密码验证</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-700">
                  领取密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPassword()
                    }
                  }}
                />
              </div>
              
              <Button
                onClick={handleVerifyPassword}
                disabled={isVerifying || !password.trim()}
                className="w-full"
              >
                {isVerifying ? "验证中..." : "验证并领取"}
              </Button>
            </div>
          </div>
        ) : (
          // 可以直接领取状态
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              立即领取项目内容
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              点击下方按钮立即领取该项目的分享内容
            </p>
            
            <Button
              onClick={handleClaim}
              disabled={isClaiming}
              size="lg"
              className="px-8"
            >
              {isClaiming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  领取中...
                </>
              ) : (
                "立即领取"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShareInfoSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* 顶部导航骨架 */}
      <div className="flex items-center justify-between mb-12">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      
      {/* 标题区域骨架 */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-8 mb-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-10 w-16 mb-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      
      {/* 项目信息骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 py-6 border-y border-gray-100">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      
      {/* 内容区域骨架 */}
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
