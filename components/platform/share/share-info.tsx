"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Lock, 
  Clock, 
  Calendar, 
  AlertCircle,
  Copy,
  Check,
  Shield,
  ArrowLeft,
  Gift,
  Tag,
  ExternalLink,
  Info,
  BookOpen
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import { Project } from "@/hooks/use-platform-data"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [shareContent, setShareContent] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("content")
  
  // 新增字段
  const [usageUrl, setUsageUrl] = useState<string | null>(null)
  const [tutorial, setTutorial] = useState<string | null>(null)
  const [isCheckingClaim, setIsCheckingClaim] = useState(true)

  // 检查是否已经领取
  const checkIfClaimed = async () => {
    setIsCheckingClaim(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/check-claim`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn('检查领取状态返回非 200 状态:', response.status);
        return;
      }
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('响应不是 JSON 格式:', contentType);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.claimed) {
        setHasClaimed(true);
        if (data.data.content) setShareContent(data.data.content);
        if (data.data.usageUrl) setUsageUrl(data.data.usageUrl);
        if (data.data.tutorial) setTutorial(data.data.tutorial);
        
        // 如果有教程或使用地址，默认切换到使用选项卡
        if (data.data.usageUrl || data.data.tutorial) {
          setActiveTab("usage");
        }
      }
    } catch (err) {
      console.error("检查领取状态错误:", err);
      // 错误时不影响页面正常展示
    } finally {
      setIsCheckingClaim(false);
    }
  };

  // 获取项目详情
  useEffect(() => {
    const fetchProject = async () => {
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
          setNeedPassword(data.data.hasPassword);
          
          // 保存使用地址和教程
          if (data.data.usageUrl) setUsageUrl(data.data.usageUrl);
          if (data.data.tutorial) setTutorial(data.data.tutorial);
          
          // 如果API返回了已领取的数据，直接设置
          if (data.data.claimed) {
            setHasClaimed(true);
            if (data.data.content) setShareContent(data.data.content);
            
            // 如果有教程或使用地址，默认切换到使用选项卡
            if (data.data.usageUrl || data.data.tutorial) {
              setActiveTab("usage");
            }
          } else {
            // 否则再检查是否已领取
            await checkIfClaimed();
          }
        } else {
          setErrorMessage("项目数据格式错误");
        }
      } catch (err) {
        console.error("获取项目详情错误:", err);
        setErrorMessage("网络错误，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

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
          
          // 切换到使用选项卡（如果有教程或使用地址）
          if (usageUrl || tutorial) {
            setActiveTab("usage")
          }
          
          toast.success("验证成功！")
        } else if (data.data.message) {
          toast.info(data.data.message)
        }
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
          
          // 切换到使用选项卡（如果有教程或使用地址）
          if (usageUrl || tutorial) {
            setActiveTab("usage")
          }
          
          toast.success("领取成功！")
        } else if (data.data.message) {
          toast.info(data.data.message)
        }
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

  // 复制分享内容
  const handleCopy = async () => {
    if (!shareContent) return
    
    try {
      await navigator.clipboard.writeText(shareContent)
      setCopied(true)
      toast.success("已复制到剪贴板")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("复制失败:", err)
      toast.error("复制失败")
    }
  }
  
  // 复制使用地址
  const handleCopyUrl = async () => {
    if (!usageUrl) return
    
    try {
      await navigator.clipboard.writeText(usageUrl)
      toast.success("已复制使用地址")
    } catch (err) {
      console.error("复制失败:", err)
      toast.error("复制失败")
    }
  }

  if (isLoading || isCheckingClaim) {
    return <ShareInfoSkeleton />
  }

  if (errorMessage) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            出错了
          </h1>
          <p className="text-muted-foreground mb-4">
            {errorMessage}
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
    <div className="container max-w-3xl mx-auto px-4 py-8">
      {/* 顶部导航 */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/platform" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回平台首页
        </Link>
        
        {hasClaimed && (
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
            <Check className="h-3.5 w-3.5 mr-1" />
            已领取
          </Badge>
        )}
      </div>

      <div className="space-y-8">
        {/* 项目基本信息 */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline">
                  {CATEGORY_NAMES[project.category] || project.category}
                </Badge>
                <Badge variant="secondary">
                  {DISTRIBUTION_MODE_NAMES[project.distributionMode]}
                </Badge>
                {project.requireLinuxdo && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> T{project.minTrustLevel}+
                  </Badge>
                )}
                {project.hasPassword && (
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> 需要密码
                  </Badge>
                )}
              </div>
              <p className="mt-4 text-muted-foreground">
                {project.description || "暂无项目描述"}
              </p>
            </div>
            
            <div className="text-right hidden md:block">
              <div className="text-sm text-muted-foreground mb-1">
                剩余名额
              </div>
              <div className="text-3xl font-bold">
                {project.remainingQuota}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">领取进度</span>
              <div className="flex items-center gap-2 mt-1">
                <Gift className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {project.claimedCount}/{project.totalQuota}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({progressPercentage}%)
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">开始时间</span>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {formatDateTime(project.startTime).split(' ')[0]}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">结束时间</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium">
                  {project.endTime ? formatDateTime(project.endTime).split(' ')[0] : "永久有效"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center pt-2">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-secondary">
                {project.creator.image ? (
                  <img 
                    src={project.creator.image} 
                    alt={project.creator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {project.creator.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {project.creator.nickname || project.creator.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  创建于 {formatDistanceToNow(new Date(project.createdAt), { 
                    addSuffix: true, 
                    locale: zhCN 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 标签 */}
        {project.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              标签
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="rounded-md">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 领取区域 */}
        <div className="bg-card rounded-lg border">
          {project.remainingQuota <= 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">名额已满</h3>
              <p className="text-muted-foreground">
                该项目的所有名额已被领取完毕
              </p>
            </div>
          ) : hasClaimed ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-4">
                <TabsList className="h-12 -mb-px">
                  <TabsTrigger value="content" className="data-[state=active]:border-b-2 rounded-none border-primary">
                    内容
                  </TabsTrigger>
                  {(usageUrl || tutorial) && (
                    <TabsTrigger value="usage" className="data-[state=active]:border-b-2 rounded-none border-primary">
                      使用方法
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              
              <TabsContent value="content" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">已成功领取</span>
                  </div>
                  
                  <ScrollArea className="h-[120px] rounded border bg-muted/40 p-4">
                    <div className="font-mono text-sm break-all whitespace-pre-wrap">
                      {shareContent}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          复制内容
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="usage" className="p-6 focus-visible:outline-none focus-visible:ring-0">
                <div className="space-y-6">
                  {usageUrl && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        项目链接
                      </h3>
                      <div className="flex items-center gap-2">
                        <a 
                          href={usageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate max-w-[70%]"
                        >
                          {usageUrl}
                        </a>
                        <Button
                          onClick={handleCopyUrl}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="sr-only">复制链接</span>
                        </Button>
                        <Button
                          onClick={() => window.open(usageUrl, '_blank')}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sr-only">访问链接</span>
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {tutorial && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        使用教程
                      </h3>
                      <div className="bg-muted/40 rounded-md p-4 text-sm whitespace-pre-wrap">
                        {tutorial}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : needPassword ? (
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>该项目需要密码验证，请输入正确的密码领取</p>
              </div>
              
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
            <div className="p-6 space-y-4">
              <div className="text-center py-4">
                <Gift className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                <h3 className="text-lg font-semibold mb-1">
                  立即领取项目内容
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                  点击下方按钮立即领取该项目的分享内容
                </p>
              </div>
              
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full"
                size="lg"
              >
                {isClaiming ? "领取中..." : "立即领取"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareInfoSkeleton() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-4 w-24" />
      </div>
      
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-full md:w-2/3">
              <Skeleton className="h-9 w-40 mb-3" />
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            
            <div className="hidden md:block">
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
          
          <Skeleton className="h-px w-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
        
        <Skeleton className="h-32 w-full rounded-lg" />
        
        <div className="rounded-lg border h-60">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
