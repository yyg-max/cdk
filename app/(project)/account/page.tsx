"use client"

import { useSession } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PencilIcon, UserIcon, ShieldIcon, CalendarIcon } from "lucide-react"

// 扩展用户类型以包含数据库中的额外字段
interface ExtendedUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  source?: string
  trustLevel?: number | null
  banned?: boolean
  banReason?: string | null
  createdAt?: string
  updatedAt?: string
}

export default function AccountPage() {
  const { data: session } = useSession()
  const user = session?.user as ExtendedUser | undefined

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "linuxdo":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Linux Do</Badge>
      case "signup":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">邮箱注册</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getTrustLevelBadge = (level: number | null | undefined) => {
    if (level === null || level === undefined) return <Badge variant="outline">未设置</Badge>
    
    const colors = [
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", 
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    ]
    
    return <Badge className={colors[level] || colors[0]}>TL{level}</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-4xl py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            个人资料
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            管理您的账户信息和偏好设置
          </p>
        </div>

        <div className="space-y-8">
          {/* 基本信息 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <UserIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">基本信息</h2>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl p-6">
              {/* 头像和基本信息 */}
              <div className="flex items-start gap-6 mb-6">
                <div className="relative group">
                  <Avatar className="h-20 w-20 ring-2 ring-white dark:ring-slate-800">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PencilIcon className="h-4 w-4 text-white" />
                  </button>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      {user?.name || "未设置"}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {getSourceBadge(user?.source || "signup")}
                    {getTrustLevelBadge(user?.trustLevel)}
                    {user?.banned && (
                      <Badge variant="destructive">已封禁</Badge>
                    )}
                    {user?.emailVerified && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <ShieldIcon className="h-3 w-3 mr-1" />
                        已验证
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 表单字段 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    用户名
                  </Label>
                  <Input
                    id="name"
                    value={user?.name || ""}
                    className="h-10 bg-slate-50 dark:bg-slate-800/50"
                    readOnly
                  />
                  <p className="text-xs text-slate-500">用户名在系统中唯一，无法修改</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    邮箱地址
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    注册时间
                  </Label>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CalendarIcon className="h-4 w-4" />
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString('zh-CN')
                      : "未知"
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    最后更新
                  </Label>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CalendarIcon className="h-4 w-4" />
                    {user?.updatedAt 
                      ? new Date(user.updatedAt).toLocaleDateString('zh-CN')
                      : "未知"
                    }
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  保存更改
                </Button>
              </div>
            </div>
          </div>

          {/* 账户状态 */}
          {(user?.banned || user?.banReason) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldIcon className="h-4 w-4 text-red-600" />
                <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">账户状态</h2>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <ShieldIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      账户已被封禁
                    </h3>
                    {user?.banReason && (
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        封禁原因：{user.banReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
