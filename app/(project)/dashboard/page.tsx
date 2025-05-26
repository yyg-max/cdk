"use client"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { useSession } from "@/lib/auth-client"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import data from "../project/data.json"

export default function DashboardPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const shouldSync = searchParams.get('sync') === 'true'

  // 自动同步Linux Do信息
  useEffect(() => {
    const syncLinuxDoInfo = async () => {
      try {
        const response = await fetch('/api/auth/update-profile', {
          method: 'POST',
          credentials: 'include'
        })
        
        if (response.ok) {
          console.log('Linux Do 信息同步成功')
          // 移除URL参数
          window.history.replaceState({}, '', '/dashboard')
        }
      } catch (error) {
        console.error('自动同步失败:', error)
      }
    }

    // 检查是否需要同步并且用户已登录
    if (shouldSync && session?.user) {
      syncLinuxDoInfo()
    }
  }, [shouldSync, session])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600 mt-2">欢迎回来，查看您的项目概览和数据分析</p>
        </div>
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </div>
  )
} 