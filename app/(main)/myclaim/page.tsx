"use client"

import { useState, useEffect } from "react"
import { ClaimChartInteractive } from "@/components/myclaim/claim-chart"
import { ClaimTable } from "@/components/myclaim/claim-table"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { DistributionMode } from "@prisma/client"

// 定义API返回的数据结构
interface MonthlyStats {
  month: string
  count: number
}

interface CategoryStats {
  month: string
  AI?: number
  SOFTWARE?: number
  GAME?: number
  EDUCATION?: number
  RESOURCE?: number
  LIFE?: number
  OTHER?: number
  [key: string]: number | string | undefined
}

interface ClaimRecord {
  id: string
  projectId: string
  projectName: string
  projectDescription: string
  category: string
  distributionMode: DistributionMode
  content: string | null
  claimedAt: Date | null
  usageUrl: string | null
  tutorial: string | null
}

interface ApiResponse {
  claims: ClaimRecord[]
  statistics: {
    total: number
    monthlyStats: MonthlyStats[]
    categoryStats: CategoryStats[]
  }
}

export default function MyClaimPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 加载用户的领取数据
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true)
        
        // 调用API获取用户领取记录
        const response = await fetch('/api/myclaim')
        
        if (!response.ok) {
          // 处理HTTP错误
          const errorData = await response.json()
          throw new Error(errorData.error || "获取数据失败")
        }
        
        const data: ApiResponse = await response.json()
        
        // 更新状态
        setClaims(data.claims)
        setMonthlyStats(data.statistics.monthlyStats)
        setCategoryStats(data.statistics.categoryStats || [])
        setLoading(false)
      } catch (err) {
        console.error("获取领取记录失败:", err)
        
        // 显示错误信息
        if (err instanceof Error) {
          setError(err.message)
          toast.error(err.message)
        } else {
          setError("加载数据失败，请稍后再试")
          toast.error("加载数据失败，请稍后再试")
        }
        
        setLoading(false)
      }
    }

    fetchClaims()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            我的领取
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            管理您已领取的资源和邀请码
          </p>
        </div>

        <div className="space-y-8">
          {/* 数据统计图表 */}
          <ClaimChartInteractive 
            data={monthlyStats} 
            categoryData={categoryStats}
            isLoading={loading} 
          />
          
          <Separator className="my-8" />
          
          {/* 领取数据表格 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
              领取记录
            </h2>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  加载中...
                </div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : (
              <ClaimTable data={claims} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}