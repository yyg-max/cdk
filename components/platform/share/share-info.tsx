"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Lock, 
  Users, 
  Clock, 
  Calendar, 
  AlertCircle,
  Copy,
  Check
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import { Project } from "@/hooks/use-platform-data"

// 分发模式名称映射
const DISTRIBUTION_MODE_NAMES: Record<string, string> = {
  SINGLE: "一码一用",
  MULTI: "一码多用", 
  MANUAL: "手动邀请"
}

// 分类中文映射
const CATEGORY_NAMES: Record<string, string> = {
  AI: '人工智能',
  SOFTWARE: '软件工具',
  GAME: '游戏娱乐',
  EDUCATION: '教育学习',
  RESOURCE: '资源分享',
  LIFE: '生活服务',
  OTHER: '其他',
}

// 格式化日期时间
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

interface ShareInfoProps {
  projectId: string
}

export function ShareInfo({ projectId }: ShareInfoProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [shareContent, setShareContent] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [copied, setCopied] = useState(false)

  // 获取项目详情
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("项目不存在")
          } else {
            throw new Error("获取项目详情失败")
          }
          return
        }
        
        const data = await response.json()
        if (data.success && data.data) {
          setProject(data.data)
          setNeedPassword(data.data.hasPassword)
        } else {
          setError("项目数据格式错误")
        }
      } catch (error) {
        console.error("获取项目详情错误:", error)
        setError("网络错误，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // 验证密码并获取分享内容
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
        if (data.data.content) {
          setShareContent(data.data.content)
          setHasClaimed(true)
          toast.success("验证成功！")
        } else if (data.data.message) {
          toast.info(data.data.message)
        }
      } else {
        toast.error(data.error || "密码错误")
      }
    } catch (error) {
      console.error("密码验证错误:", error)
      toast.error("验证失败，请稍后重试")
    } finally {
      setIsVerifying(false)
    }
  }

  // 领取项目内容（无密码项目）
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
        if (data.data.content) {
          setShareContent(data.data.content)
          setHasClaimed(true)
          toast.success("领取成功！")
        } else if (data.data.message) {
          toast.info(data.data.message)
        }
      } else {
        toast.error(data.error || "领取失败")
      }
    } catch (error) {
      console.error("领取错误:", error)
      toast.error("领取失败，请稍后重试")
    } finally {
      setIsClaiming(false)
    }
  }

  // 复制分享内容
  const handleCopy = async () => {
    if (!shareContent) return
    
    try {
      await navigator.clipboard.writeText(shareContent)
      setCopied(true)
      toast.success("已复制到剪贴板")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("复制失败")
    }
  }

  if (isLoading) {
    return <ShareInfoSkeleton />
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            出错了
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {error}
          </p>
          <Button onClick={() => window.history.back()}>
            返回上一页
          </Button>
        </div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const progressPercentage = project.totalQuota > 0 
    ? Math.round((project.claimedCount / project.totalQuota) * 100) 
    : 0

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 项目基本信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {project.name}
                  {project.hasPassword && <Lock className="h-5 w-5 text-amber-500" />}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {CATEGORY_NAMES[project.category] || project.category}
                  </Badge>
                  <Badge variant="secondary">
                    {DISTRIBUTION_MODE_NAMES[project.distributionMode]}
                  </Badge>
                  {project.requireLinuxdo && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      需要LinuxDo认证 T{project.minTrustLevel}+
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  剩余名额
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {project.remainingQuota}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 项目描述 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">项目描述</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {project.description || "暂无项目描述"}
              </p>
            </div>

            {/* 项目标签 */}
            {project.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">项目标签</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 项目统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">领取进度</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {project.claimedCount}/{project.totalQuota}
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">开始时间</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDateTime(project.startTime)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">结束时间</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {project.endTime ? formatDateTime(project.endTime) : "永久有效"}
                </div>
              </div>
            </div>

            {/* 创建者信息 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">创建者信息</h3>
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {project.creator.image ? (
                    <img 
                      src={project.creator.image} 
                      alt={project.creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-400">
                      {project.creator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {project.creator.nickname || project.creator.name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    创建于 {formatDistanceToNow(new Date(project.createdAt), { 
                      addSuffix: true, 
                      locale: zhCN 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 领取区域 */}
        <Card>
          <CardHeader>
            <CardTitle>领取分享内容</CardTitle>
          </CardHeader>
          <CardContent>
            {project.remainingQuota <= 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">名额已满</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  该项目的所有名额已被领取完毕
                </p>
              </div>
            ) : hasClaimed && shareContent ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                    领取成功！
                  </h4>
                  <div className="bg-white dark:bg-slate-800 rounded border p-3 font-mono text-sm break-all">
                    {shareContent}
                  </div>
                  <Button
                    onClick={handleCopy}
                    className="mt-3"
                    variant="outline"
                    size="sm"
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
              </div>
            ) : needPassword && !hasClaimed ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">请输入领取密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入密码"
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
                  {isVerifying ? "验证中..." : "验证密码并领取"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full"
                size="lg"
              >
                {isClaiming ? "领取中..." : "立即领取"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ShareInfoSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
