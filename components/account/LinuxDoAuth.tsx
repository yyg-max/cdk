"use client"

import { useState } from "react"
import {
  CalendarIcon,
  ExternalLinkIcon,
  LinkIcon,
  RefreshCwIcon,
  ShieldIcon,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

import { AccountComponentProps } from "./types"
import Image from "next/image"

export function LinuxDoAuth({ user, onUpdateSuccess }: AccountComponentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdatingAutoSync, setIsUpdatingAutoSync] = useState(false)

  // 检查是否是Linux Do用户
  const isLinuxDoUser = user?.source === "linuxdo"

  /**
   * 获取信任等级徽章
   */
  const getTrustLevelBadge = (level: number | null | undefined) => {
    if (level === null || level === undefined) {
      return (
        <Badge variant="outline" className="pointer-events-none">
          未设置
        </Badge>
      )
    }

    const colors = [
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 pointer-events-none",
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 pointer-events-none",
      "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 pointer-events-none",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 pointer-events-none",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 pointer-events-none",
    ]

    return <Badge className={colors[level] || colors[0]}>TL{level}</Badge>
  }

  /**
   * 同步Linux Do信息
   */
  const handleSyncLinuxDo = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Linux Do 信息同步成功！", {
          description: "您的个人信息已成功更新",
          duration: 3000,
        })

        // 立即执行回调
        if (onUpdateSuccess) {
          onUpdateSuccess()
        }
      } else {
        toast.error("同步失败", {
          description: data.error || "请稍后重试",
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("同步失败:", error)
      toast.error("同步失败", {
        description: "网络错误，请检查连接后重试",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 切换自动更新设置
   */
  const handleAutoUpdateToggle = async (enabled: boolean): Promise<void> => {
    setIsUpdatingAutoSync(true)
    try {
      const response = await fetch("/api/account/autoupdate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          autoupdate: enabled,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(enabled ? "已开启自动同步" : "已关闭自动同步", {
          description: enabled
            ? "登录时将自动更新所有信息"
            : "登录时仅更新信任等级",
          duration: 3000,
        })

        // 立即执行回调
        if (onUpdateSuccess) {
          onUpdateSuccess()
        }
      } else {
        toast.error("设置失败", {
          description: data.error || "请稍后重试",
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("设置失败:", error)
      toast.error("设置失败", {
        description: "网络错误，请检查连接后重试",
        duration: 4000,
      })
    } finally {
      setIsUpdatingAutoSync(false)
    }
  }

  /**
   * 绑定Linux Do账户
   */
  const handleBindLinuxDo = (): void => {
    // 跳转到Linux Do OAuth登录
    window.location.href = "/api/auth/signin/linuxdo"
  }

  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateString: string | Date): string => {
    if (!dateString) return "未知"

    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // 如果不是Linux Do用户，显示绑定界面
  if (!isLinuxDoUser) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              第三方认证
            </h2>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <Image
                  src="/linuxdo.png"
                  alt="Linux Do"
                  className="h-10 w-10 rounded"
                  width={40}
                  height={40}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                绑定 Linux Do 账户
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                绑定您的 Linux Do 社区账户，享受更多功能和便利
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBindLinuxDo}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                绑定 Linux Do 账户
              </Button>

              <div className="text-xs text-slate-500 space-y-1">
                <p>• 自动同步头像和昵称</p>
                <p>• 获取社区信任等级</p>
                <p>• 享受更安全的认证体验</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 已绑定Linux Do用户的界面
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            第三方认证
          </h2>
        </div>
        <Button
          size="sm"
          className="bg-slate-900 hover:bg-black"
          onClick={handleSyncLinuxDo}
          disabled={isLoading}
        >
          {isLoading ? "同步中..." : "同步信息"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Linux Do 账户信息 */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200/50 dark:border-orange-700/50">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Image
                src="/linuxdo.png"
                alt="Linux Do"
                className="h-8 w-8 rounded"
                width={40}
                height={40}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-medium text-orange-800 dark:text-orange-200">
                Linux Do
              </h3>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              >
                <ShieldIcon className="h-3 w-3 mr-1" />
                已连接
              </Badge>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              通过 Linux Do 社区账户登录和认证
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
            onClick={() => window.open("https://connect.linux.do", "_blank")}
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* 核心信息 */}
        <div className="space-y-3">
          {/* 用户名和昵称 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.name
                    ? `${user.name}${user?.nickname ? ` (${user.nickname})` : ""}`
                    : "未设置用户名"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Linux Do 用户名
                </div>
              </div>
            </div>
          </div>

          {/* 自动同步设置 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCwIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  自动同步
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  登录时自动更新信息
                </div>
              </div>
            </div>
            <Switch
              checked={user?.autoupdate || false}
              onCheckedChange={handleAutoUpdateToggle}
              disabled={isUpdatingAutoSync}
            />
          </div>

          {/* 信任等级 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  信任等级
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  社区认证等级
                </div>
              </div>
            </div>
            <div>{getTrustLevelBadge(user?.trustLevel)}</div>
          </div>

          {/* 绑定时间 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  绑定时间
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  账户创建时间
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {formatDateTime(user?.createdAt || "")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 