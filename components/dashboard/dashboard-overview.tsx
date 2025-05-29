"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  Users,
  FolderOpen,
  Download,
  FileText,
  TrendingUp,
  Activity,
  Award,
  Target,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"
import { toast } from "sonner"

// 定义数据类型
interface DashboardStats {
  overview: {
    totalUsers: number
    newUsers: number
    totalProjects: number
    activeProjects: number
    totalClaims: number
    recentClaims: number
    claimRate: number
    totalApplications: number
    pendingApplications: number
  }
  userStats: {
    total: number
    new: number
    linuxdo: number
    signup: number
    banned: number
    sourceDistribution: Array<{ name: string, value: number }>
  }
  projectStats: {
    total: number
    active: number
    new: number
    byCategory: Array<{ category: string, count: number }>
    byMode: Array<{ mode: string, count: number }>
    byStatus: Array<{ status: string, count: number }>
  }
  claimStats: {
    single: number
    multi: number
    total: number
    recent: number
    rate: number
  }
  applicationStats: {
    total: number
    pending: number
    approved: number
    rejected: number
    distribution: Array<{ status: string, count: number }>
  }
  trends: {
    users: Array<{ date: string, count: number }>
    projects: Array<{ date: string, count: number }>
    claims: Array<{ date: string, count: number }>
  }
  popular: {
    projects: Array<{
      id: string
      name: string
      category: string
      distributionMode: string
      claimedCount: number
    }>
    creators: Array<{
      creatorId: string
      creatorName: string
      projectCount: number
      totalClaims: number
    }>
    claimers: Array<{
      userId: string
      userName: string
      claimedCount: number
    }>
    tags: Array<{
      tagName: string
      projectCount: number
    }>
  }
}

// 分类名称映射
const CATEGORY_NAMES = {
  AI: "人工智能",
  SOFTWARE: "软件工具", 
  GAME: "游戏娱乐",
  EDUCATION: "教育学习",
  RESOURCE: "资源分享",
  LIFE: "生活服务",
  OTHER: "其他"
}

// 分发模式名称映射
const MODE_NAMES = {
  SINGLE: "一码一用",
  MULTI: "一码多用", 
  MANUAL: "手动邀请"
}

// Chart configurations
const trendChartConfig = {
  count: {
    label: "数量",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const claimTrendChartConfig = {
  count: {
    label: "领取数",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const categoryChartConfig = {
  AI: {
    label: "人工智能",
    color: "hsl(var(--chart-1))",
  },
  SOFTWARE: {
    label: "软件工具",
    color: "hsl(var(--chart-2))",
  },
  GAME: {
    label: "游戏娱乐",
    color: "hsl(var(--chart-3))",
  },
  EDUCATION: {
    label: "教育学习",
    color: "hsl(var(--chart-4))",
  },
  RESOURCE: {
    label: "资源分享",
    color: "hsl(var(--chart-5))",
  },
  LIFE: {
    label: "生活服务",
    color: "hsl(var(--chart-1))",
  },
  OTHER: {
    label: "其他",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const modeChartConfig = {
  SINGLE: {
    label: "一码一用",
    color: "hsl(var(--chart-1))",
  },
  MULTI: {
    label: "一码多用",
    color: "hsl(var(--chart-2))",
  },
  MANUAL: {
    label: "手动邀请",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

// 状态卡片组件
function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  suffix = "" 
}: {
  title: string
  value: string | number
  change?: string | number
  changeType?: "positive" | "negative" | "neutral"
  icon: React.ElementType
  suffix?: string
}) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const changeIcon = {
    positive: ArrowUpRight,
    negative: ArrowDownRight,
    neutral: Minus,
  }[changeType]

  const changeColor = {
    positive: "text-emerald-600",
    negative: "text-red-600", 
    neutral: "text-muted-foreground",
  }[changeType]

  const ChangeIcon = changeIcon

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-2xl font-bold tracking-tight">
          {formatValue(value)}{suffix}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${changeColor} mt-1`}>
            <ChangeIcon className="mr-1 h-3 w-3" />
            {typeof change === 'number' ? change.toLocaleString() : change}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // 获取统计数据
  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/stats?days=${timeRange}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
          setLastUpdate(new Date())
        } else {
          toast.error("获取数据失败")
        }
      } else {
        toast.error("获取数据失败")
      }
    } catch (error) {
      console.error("获取统计数据失败:", error)
      toast.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [timeRange])

  // 自动刷新（每5分钟）
  useEffect(() => {
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  if (loading || !stats) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded-md w-20"></div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="h-8 bg-muted rounded-md w-16 mb-2"></div>
                <div className="h-3 bg-muted/50 rounded-md w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 头部控制区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">时间范围</span>
            <div className="flex rounded-lg border p-1">
              {[7, 30, 90].map((days) => (
                <Button
                  key={days}
                  variant={timeRange === days ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setTimeRange(days)}
                >
                  {days}天
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            最后更新 {lastUpdate.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats} 
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总用户数"
          value={stats.overview.totalUsers}
          change={`+${stats.overview.newUsers} 新用户`}
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="活跃项目"
          value={stats.overview.activeProjects}
          change={`总计 ${stats.overview.totalProjects} 个`}
          changeType="neutral"
          icon={FolderOpen}
        />
        <StatCard
          title="总领取数"
          value={stats.overview.totalClaims}
          change={`+${stats.overview.recentClaims} 近期`}
          changeType="positive"
          icon={Download}
        />
        <StatCard
          title="领取成功率"
          value={stats.overview.claimRate}
          suffix="%"
          icon={Target}
        />
      </div>

      {/* 趋势图表 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-chart-1" />
              用户增长趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendChartConfig} className="h-[300px]">
              <AreaChart
                accessibilityLayer
                data={stats.trends.users}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="var(--color-count)"
                  fillOpacity={0.2}
                  stroke="var(--color-count)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-chart-2" />
              领取活动趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={claimTrendChartConfig} className="h-[300px]">
              <LineChart
                accessibilityLayer
                data={stats.trends.claims}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Line
                  dataKey="count"
                  type="natural"
                  stroke="var(--color-count)"
                  strokeWidth={2.5}
                  dot={{
                    fill: "var(--color-count)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 分布图表 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold">项目分类分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="h-[250px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={stats.projectStats.byCategory.map(item => ({
                    category: item.category,
                    count: item.count,
                    fill: `var(--color-${item.category})`,
                  }))}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {stats.projectStats.byCategory.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${item.category})`} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="category" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold">分发模式分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={modeChartConfig} className="h-[250px]">
              <BarChart
                accessibilityLayer
                data={stats.projectStats.byMode.map(item => ({
                  mode: item.mode,
                  count: item.count,
                  fill: `var(--color-${item.mode})`,
                }))}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="mode"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => MODE_NAMES[value as keyof typeof MODE_NAMES] || value}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {stats.projectStats.byMode.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${item.mode})`} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold">用户来源分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.userStats.sourceDistribution.map((item) => {
                const percentage = (item.value / stats.userStats.total) * 100
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="font-medium">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 热门数据 */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              热门项目
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.popular.projects.map((project, index) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_NAMES[project.category as keyof typeof CATEGORY_NAMES]}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {project.claimedCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              活跃创建者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.popular.creators.map((creator, index) => (
                <div key={creator.creatorId} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{creator.creatorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {creator.projectCount} 个项目
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {creator.totalClaims}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-green-500" />
              活跃领取者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.popular.claimers.map((claimer, index) => (
                <div key={claimer.userId} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{claimer.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {claimer.claimedCount} 次领取
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {claimer.claimedCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-semibold">热门标签</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.popular.tags.map((tag) => (
                <Badge key={tag.tagName} variant="outline" className="text-xs">
                  {tag.tagName}
                  <span className="ml-1 text-muted-foreground">
                    {tag.projectCount}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 申请状态统计 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            申请状态统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight">
                {stats.applicationStats.total.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">总申请数</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-amber-600">
                {stats.applicationStats.pending.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">待处理</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-emerald-600">
                {stats.applicationStats.approved.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">已通过</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-red-600">
                {stats.applicationStats.rejected.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">已拒绝</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 