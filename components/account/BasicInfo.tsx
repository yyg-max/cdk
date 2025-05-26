"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, UsersRound } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { ExtendedUser } from "./types"

interface BasicInfoProps {
  user?: ExtendedUser
  onUpdateSuccess?: () => void
}

export function BasicInfo({ user, onUpdateSuccess }: BasicInfoProps) {
  // 表单状态 - 确保初始值不为undefined
  const [nickname, setNickname] = useState(user?.nickname || user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.image || "")
  const [isLoading, setIsLoading] = useState(false)

  // 验证错误状态
  const [nicknameError, setNicknameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [avatarError, setAvatarError] = useState("")

  // 当user数据变化时更新表单值
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || user.name || "")
      setEmail(user.email || "")
      setAvatarUrl(user.image || "")
      // 清除错误状态
      setNicknameError("")
      setEmailError("")
      setAvatarError("")
    }
  }, [user])

  /**
   * 格式化中国时区时间
   */
  const formatChineseTime = (dateString: string | Date): string => {
    if (!dateString) return "时间未知"

    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  /**
   * 验证邮箱格式
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * 验证URL格式并防止注入
   */
  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim() === "") return true

    try {
      const urlObj = new URL(url)
      return urlObj.protocol === "http:" || urlObj.protocol === "https:"
    } catch {
      return false
    }
  }

  /**
   * 实时验证昵称
   */
  const validateNickname = (value: string): void => {
    const trimmed = value.trim()
    if (trimmed && trimmed.length > 16) {
      setNicknameError("昵称不能超过16个字符")
    } else {
      setNicknameError("")
    }
  }

  /**
   * 实时验证邮箱
   */
  const validateEmail = (value: string): void => {
    const trimmed = value.trim()
    if (!trimmed) {
      setEmailError("邮箱地址不能为空")
    } else if (!isValidEmail(trimmed)) {
      setEmailError("请输入有效的邮箱地址")
    } else {
      setEmailError("")
    }
  }

  /**
   * 实时验证头像链接
   */
  const validateAvatar = (value: string): void => {
    const trimmed = value.trim()
    if (trimmed && !isValidUrl(trimmed)) {
      setAvatarError("请输入有效的头像链接")
    } else {
      setAvatarError("")
    }
  }

  /**
   * 前端验证
   */
  const validateForm = (): boolean => {
    // 触发所有字段的验证
    validateNickname(nickname)
    validateEmail(email)
    validateAvatar(avatarUrl)

    // 检查是否有任何错误
    const trimmedNickname = nickname.trim()
    const trimmedEmail = email.trim()
    const trimmedAvatarUrl = avatarUrl.trim()

    const hasNicknameError = trimmedNickname && trimmedNickname.length > 16
    const hasEmailError = !trimmedEmail || !isValidEmail(trimmedEmail)
    const hasAvatarError = trimmedAvatarUrl && !isValidUrl(trimmedAvatarUrl)

    return !hasNicknameError && !hasEmailError && !hasAvatarError
  }

  /**
   * 保存用户资料
   */
  const handleSaveProfile = async (): Promise<void> => {
    // 前端验证
    const isValid = validateForm()
    if (!isValid) {
      toast.error("验证失败", {
        description: "请检查并修正表单中的错误",
        duration: 4000,
      })
      return
    }

    setIsLoading(true)

    try {
      const trimmedNickname = nickname.trim()
      const trimmedEmail = email.trim()
      const trimmedAvatarUrl = avatarUrl.trim()

      const response = await fetch("/api/account/basic", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          nickname: trimmedNickname || undefined, // 昵称可以为空
          email: trimmedEmail, // 邮箱不能为空
          image: trimmedAvatarUrl || undefined, // 头像可以为空
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("基本信息更新成功！", {
          description: "您的个人信息已成功保存",
          duration: 3000,
        })

        // 立即执行回调，不刷新页面
        if (onUpdateSuccess) {
          onUpdateSuccess()
        }
      } else {
        toast.error("更新失败", {
          description: data.error || "请稍后重试",
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("保存失败:", error)
      toast.error("保存失败", {
        description: "网络错误，请检查连接后重试",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            基本信息
          </h2>
        </div>
        <Button
          size="sm"
          className="bg-slate-900 hover:bg-black"
          onClick={handleSaveProfile}
          disabled={isLoading}
        >
          {isLoading ? "保存中..." : "保存更改"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* 头像和基本信息 */}
        <div className="flex items-start gap-6 mb-6">
          <div className="relative group">
            <Avatar className="h-16 w-16 ring-2 ring-slate-300 dark:ring-slate-600 shadow-md">
              <AvatarImage src={avatarUrl || user?.image || undefined} />
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 text-white dark:text-slate-800 border-2 border-slate-200 dark:border-slate-700">
                {(user?.nickname || user?.name || "")
                  .slice(0, 2)
                  .toUpperCase() || "UN"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1">
            <div>
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mt-2">
                {user?.name || "暂未设置用户名"} &nbsp;
                <span className="text-lg text-slate-600 dark:text-slate-400">
                  ({user?.nickname || user?.name || "暂未设置昵称"})
                </span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {email || user?.email || "暂未设置邮箱"}
              </p>
            </div>
          </div>
        </div>

        {/* 表单字段 */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              用户名
            </Label>
            <Input
              id="username"
              value={user?.name || ""}
              className="h-10 bg-slate-50 dark:bg-slate-800/50"
              placeholder="您的平台用户名"
              readOnly
            />
            <p className="text-xs text-slate-500">
              用户名在平台中唯一，无法修改
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="nickname"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              昵称 <span className="text-slate-400">(可选)</span>
            </Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                validateNickname(e.target.value)
              }}
              placeholder="您在平台使用的昵称（最多16字符）"
              className={`h-10 ${
                nicknameError
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
              maxLength={16}
            />
            <p
              className={`text-xs ${
                nicknameError ? "text-red-500" : "text-slate-500"
              }`}
            >
              {nicknameError || "平台昵称，可随时修改，最多16个字符"}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              邮箱地址 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                validateEmail(e.target.value)
              }}
              className={`h-10 ${
                emailError ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
              placeholder="您的邮箱地址（必填）"
              required
            />
            <div className="flex items-center gap-2">
              <p
                className={`text-xs ${
                  emailError ? "text-red-500" : "text-slate-500"
                }`}
              >
                {emailError || (
                  <>
                    绑定的邮箱地址，必须填写 &nbsp;
                    {user?.emailVerified ? (
                      <span className="text-green-600">✓ 邮箱已验证</span>
                    ) : (
                      <span className="text-orange-600">⚠ 邮箱未验证</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="avatar"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              头像链接 <span className="text-slate-400">(可选)</span>
            </Label>
            <Input
              id="avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                validateAvatar(e.target.value)
              }}
              placeholder="https://example.com/avatar.jpg"
              className={`h-10 ${
                avatarError ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
            />
            <p
              className={`text-xs ${
                avatarError ? "text-red-500" : "text-slate-500"
              }`}
            >
              {avatarError || "平台个人头像，仅支持 http/https 链接"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              注册时间
            </Label>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CalendarIcon className="h-4 w-4" />
              {formatChineseTime(user?.createdAt || "")}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              最近更改
            </Label>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CalendarIcon className="h-4 w-4" />
              {formatChineseTime(user?.updatedAt || "")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 