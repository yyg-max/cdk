"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ShareInfo } from "@/components/platform/share/share-info"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn } from "lucide-react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"

/**
 * 项目分享页面组件
 * 
 * 展示单个项目的详细信息和领取功能
 * 路由格式：/platform/share/[id]
 * 
 * 重要说明：
 * - 此页面支持查看所有状态的项目（公开/私有、活跃/非活跃）
 * - 这是设计决定：分享链接应该始终有效，不受项目状态变更影响
 * - 用户可以通过分享链接访问任何项目，但领取功能需要登录
 * 
 * @returns React 函数组件
 * 
 * @example
 * 访问路径：/platform/share/clxxxx
 * 显示ID为clxxxx的项目详情页面（无论项目是否公开或活跃）
 */
export default function ProjectSharePage() {
  const params = useParams()
  const projectId = params.id as string
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  // 检查用户登录状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await authClient.getSession()
        // 安全地检查session结构
        if (session && typeof session === 'object' && 'data' in session && session.data) {
          const sessionData = session.data as unknown
          if (sessionData && typeof sessionData === 'object' && 'user' in sessionData) {
            setIsLoggedIn(true)
          } else {
            setIsLoggedIn(false)
          }
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error("检查登录状态失败:", error)
        setIsLoggedIn(false)
      }
    }

    checkAuthStatus()
  }, [])

  // 加载状态
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 未登录状态 - 显示登录提示
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container max-w-md mx-auto px-4 py-16">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">需要登录</CardTitle>
              <CardDescription>
                请登录后查看项目内容和领取分享
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/login" className="w-full block">
                <Button className="w-full" size="lg">
                  <LogIn className="h-4 w-4 mr-2" />
                  立即登录
                </Button>
              </Link>
              
              <div className="text-center text-sm text-muted-foreground">
                还没有账户？
                <Link href="/signup" className="text-primary hover:underline ml-1">
                  立即注册
                </Link>
              </div>
              
              <div className="text-center">
                <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  返回探索广场
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 已登录状态 - 显示分享内容
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ShareInfo projectId={projectId} />
      </div>
    </div>
  )
} 