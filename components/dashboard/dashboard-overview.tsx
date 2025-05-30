"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  BarChart3,
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
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400", 
    neutral: "text-gray-500 dark:text-gray-400",
  }[changeType]

  const ChangeIcon = changeIcon

  return (
    <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-md bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
          <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
          {formatValue(value)}{suffix}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${changeColor} font-medium`}>
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
  const fetchStats = useCallback(async () => {
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
  }, [timeRange])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 自动刷新（每5分钟）
  useEffect(() => {
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading || !stats) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0 animate-pulse">
              <CardHeader className="p-6 pb-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-24"></div>
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
        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              用户增长趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
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

        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              领取活动趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
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
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">项目分类分布</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ChartContainer config={categoryChartConfig} className="h-[250px] w-full">
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

        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-sm">
                <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              分发模式统计
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ChartContainer config={modeChartConfig} className="h-[300px] w-full">
              <BarChart data={stats.projectStats.byMode}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="mode"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => MODE_NAMES[value as keyof typeof MODE_NAMES]}
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
      </div>

      {/* 热门数据 */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shadow-sm">
                <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              热门项目
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {stats.popular.projects.map((project, index) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-gray-800 flex-shrink-0 shadow-sm">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{project.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {CATEGORY_NAMES[project.category as keyof typeof CATEGORY_NAMES]}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {project.claimedCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              活跃创建者
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {stats.popular.creators.map((creator, index) => (
                <div key={creator.creatorId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-gray-800 flex-shrink-0 shadow-sm">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{creator.creatorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {creator.projectCount} 个项目
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {creator.totalClaims}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
                <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              活跃领取者
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {stats.popular.claimers.map((claimer, index) => (
                <div key={claimer.userId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-gray-800 flex-shrink-0 shadow-sm">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{claimer.userName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {claimer.claimedCount} 次领取
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {claimer.claimedCount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">热门标签</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {stats.popular.tags.map((tag) => (
                <Badge key={tag.tagName} variant="outline" className="text-xs">
                  {tag.tagName}
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    {tag.projectCount}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 申请状态统计 */}
      <Card className="bg-gray-50/50 dark:bg-gray-900/50 rounded-lg shadow-inner border-0">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            申请状态统计
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {stats.applicationStats.total.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">总申请数</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-amber-600">
                {stats.applicationStats.pending.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">待处理</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-emerald-600">
                {stats.applicationStats.approved.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">已通过</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold tracking-tight text-red-600">
                {stats.applicationStats.rejected.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">已拒绝</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 