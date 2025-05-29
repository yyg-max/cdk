"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

// 定义统计数据结构
interface DailyStats {
  month: string  // 实际上是日期，格式为 YYYY-MM-DD
  count: number
}

// 定义按类别统计的数据结构
interface CategoryStats {
  month: string  // 实际上是日期，格式为 YYYY-MM-DD
  AI?: number
  SOFTWARE?: number
  GAME?: number
  EDUCATION?: number
  RESOURCE?: number
  LIFE?: number
  OTHER?: number
  [key: string]: number | string | undefined
}

interface ClaimChartProps {
  data?: DailyStats[]
  categoryData?: CategoryStats[]
  isLoading?: boolean
}

// 为图表准备默认数据 - 按天
const defaultDailyData = Array.from({ length: 7 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - 6 + i)
  return {
    month: formatDateString(date),
    count: 0
  }
})

// 为分类图表准备默认数据 - 按天
const defaultCategoryData = Array.from({ length: 7 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - 6 + i)
  return {
    month: formatDateString(date),
    AI: 0,
    SOFTWARE: 0,
    GAME: 0,
    EDUCATION: 0,
    RESOURCE: 0,
    LIFE: 0,
    OTHER: 0
  }
})

// 定义时间范围选项
const timeRangeOptions = {
  "7d": { label: "7天", days: 7 },
  "30d": { label: "30天", days: 30 },
  "90d": { label: "3个月", days: 90 }
}

// 分类图表配置
const categoryChartConfig = {
  AI: {
    label: "人工智能",
    color: "#06b6d4", // cyan-500
  },
  SOFTWARE: {
    label: "软件工具", 
    color: "#6366f1", // indigo-500
  },
  GAME: {
    label: "游戏娱乐",
    color: "#dc2626", // red-600
  },
  EDUCATION: {
    label: "教育学习",
    color: "#f59e0b", // amber-500
  },
  RESOURCE: {
    label: "资源分享",
    color: "#10b981", // emerald-500
  },
  LIFE: {
    label: "生活服务",
    color: "#8b5cf6", // violet-500
  },
  OTHER: {
    label: "其他",
    color: "#64748b", // slate-500
  },
} satisfies ChartConfig

// 辅助函数：格式化日期为 YYYY-MM-DD
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 辅助函数：格式化日期为用户友好的格式
function formatDateForDisplay(dateStr: string, timeRange: string): string {
  try {
    // 确保日期字符串格式正确
    if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr // 如果格式不对，原样返回
    }
    
    const date = new Date(dateStr + 'T00:00:00') // 添加时间部分避免时区问题
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return dateStr // 如果日期无效，原样返回
    }
    
    // 根据时间范围选择显示格式
    // 3个月按月显示，7天和30天按日显示
    if (timeRange === "90d") {
      // 按月显示：01月、02月等
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${month}月`
    } else {
      // 按日显示：01/15等
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}/${day}`
    }
  } catch (e) {
    console.error("日期格式化错误:", e, dateStr)
    return dateStr // 发生错误时，原样返回
  }
}

// 数据聚合函数：将日数据聚合为月数据
function aggregateDataByMonth(dailyData: any[], isCategory: boolean = false) {
  const monthlyMap = new Map<string, any>()
  
  dailyData.forEach(item => {
    const date = new Date(item.month)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    
    if (!monthlyMap.has(monthKey)) {
      if (isCategory) {
        // 分类数据初始化
        monthlyMap.set(monthKey, {
          month: monthKey,
          AI: 0,
          SOFTWARE: 0,
          GAME: 0,
          EDUCATION: 0,
          RESOURCE: 0,
          LIFE: 0,
          OTHER: 0
        })
      } else {
        // 总计数据初始化
        monthlyMap.set(monthKey, {
          month: monthKey,
          count: 0
        })
      }
    }
    
    const existing = monthlyMap.get(monthKey)!
    if (isCategory) {
      // 聚合分类数据
      Object.keys(item).forEach(key => {
        if (key !== 'month' && typeof item[key] === 'number') {
          existing[key] = (existing[key] || 0) + item[key]
        }
      })
    } else {
      // 聚合总计数据
      existing.count += item.count
    }
  })
  
  return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function ClaimChartInteractive({ 
  data = defaultDailyData, 
  categoryData = defaultCategoryData,
  isLoading = false 
}: ClaimChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("7d")
  
  // 默认全选所有分类
  const allCategories = Object.keys(categoryChartConfig)
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(allCategories)
  
  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])
  
  // 过滤数据 - 只处理分类数据
  const filteredCategoryData = React.useMemo(() => {
    if (!categoryData || categoryData.length === 0) {
      return defaultCategoryData
    }
    
    // 确保数据按日期排序
    const sortedData = [...categoryData].sort((a, b) => a.month.localeCompare(b.month))
    
    // 获取最新的日期作为参考点
    const latestDate = new Date(sortedData[sortedData.length - 1].month)
    
    // 根据时间范围计算要减去的天数
    let daysToSubtract = 30
    if (timeRange === "7d") {
      daysToSubtract = 7
    } else if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    
    // 计算开始日期
    const startDate = new Date(latestDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    // 过滤数据
    const filtered = sortedData.filter((item) => {
      const itemDate = new Date(item.month)
      return itemDate >= startDate
    })
    
    // 对于3个月范围，聚合为月数据
    if (timeRange === "90d") {
      return aggregateDataByMonth(filtered, true)
    }
    
    return filtered
  }, [categoryData, timeRange])

  // 转换日期显示格式
  const formattedCategoryData = React.useMemo(() => {
    return filteredCategoryData.map(item => {
      const formattedItem: any = {
        date: formatDateForDisplay(item.month, timeRange),
        fullDate: item.month
      }
      
      // 复制所有分类数据
      Object.entries(item).forEach(([key, value]) => {
        if (key !== 'month') {
          formattedItem[key] = value
        }
      })
      
      return formattedItem
    })
  }, [filteredCategoryData, timeRange])

  // 处理分类选择变化
  const handleCategoryChange = (value: string) => {
    setSelectedCategories(prev => {
      // 如果已选择，则移除
      if (prev.includes(value)) {
        return prev.filter(cat => cat !== value)
      }
      // 否则添加
      return [...prev, value]
    })
  }
  
  // 全选/全不选分类
  const toggleAllCategories = () => {
    if (selectedCategories.length === allCategories.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories([...allCategories])
    }
  }

  // 计算各分类总计和整体总计
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    filteredCategoryData.forEach(monthData => {
      Object.entries(monthData).forEach(([key, value]) => {
        if (key !== 'month' && typeof value === 'number') {
          counts[key] = (counts[key] || 0) + value
        }
      })
    })
    return counts
  }, [filteredCategoryData])

  // 计算总计数据
  const totalCount = React.useMemo(() => {
    return Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
  }, [categoryCounts])

  // 自定义工具提示格式化器
  const dateFormatter = (value: string, item: any) => {
    if (item && item.payload && item.payload.fullDate) {
      return item.payload.fullDate
    }
    return value
  }

  // 根据选择的时间范围和数据量计算X轴刻度间隔
  const getTickInterval = (dataLength: number, timeRange: string) => {
    // 3个月范围（按月显示）的刻度逻辑
    if (timeRange === "90d") {
      // 3个月数据显示全部月份刻度
      return 1
    }
    
    // 短期范围（按日显示）的刻度逻辑
    if (isMobile) {
      if (dataLength > 30) return 7;        // 30天以上，约显示4-5个刻度
      if (dataLength > 14) return 3;        // 15天左右，约显示5个刻度
      return 2;                             // 7天，约显示3-4个刻度
    } else {
      if (dataLength > 30) return 5;        // 30天以上，约显示6个刻度
      if (dataLength > 14) return 2;        // 15天左右，约显示7-8个刻度
      return 1;                             // 7天，显示全部
    }
  }

  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    if (value && Object.keys(timeRangeOptions).includes(value)) {
      setTimeRange(value)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">领取统计</h2>
          <div>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={handleTimeRangeChange}
              variant="outline"
              className="@[767px]/card:flex hidden"
            >
              {Object.entries(timeRangeOptions).map(([key, option]) => (
                <ToggleGroupItem key={key} value={key} className="h-8 px-2.5">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger
                className="@[767px]/card:hidden flex w-32"
                aria-label="选择时间范围"
              >
                <SelectValue placeholder={timeRangeOptions[timeRange as keyof typeof timeRangeOptions]?.label || "7天"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(timeRangeOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="px-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-[250px]">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              加载中...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={toggleAllCategories}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {selectedCategories.length === allCategories.length ? "清空" : "全选"}
              </button>
              
              {Object.entries(categoryChartConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(key)
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  {config.label}
                  <span className="text-xs opacity-70">
                    ({categoryCounts[key] || 0})
                  </span>
                </button>
              ))}
            </div>
            
            <ChartContainer
              config={categoryChartConfig}
              className="-ml-4 h-[300px] w-full"
            >
              <AreaChart data={formattedCategoryData}>
                <defs>
                  {Object.entries(categoryChartConfig).map(([key, config]) => (
                    <linearGradient
                      key={key}
                      id={`fill${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={config.color}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={config.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={10}
                  tickFormatter={(value, index) => {
                    // 根据数据长度动态调整显示的刻度
                    const interval = getTickInterval(formattedCategoryData.length, timeRange)
                    if (index % interval !== 0 && index !== formattedCategoryData.length - 1) return '';
                    return value;
                  }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tickCount={5}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={dateFormatter}
                    />
                  }
                />
                {selectedCategories.map(category => (
                  <Area
                    key={category}
                    dataKey={category}
                    type="monotone"
                    fill={`url(#fill${category})`}
                    stroke={categoryChartConfig[category as keyof typeof categoryChartConfig].color}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </div>
  )
} 