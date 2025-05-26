"use client"

import { useEffect, useState } from "react"
import { KeyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { ExtendedUser } from "./types"

interface PasswordSecurityProps {
  user?: ExtendedUser
}

interface PasswordStatus {
  hasPassword: boolean
  isThirdPartyUser: boolean
  needsCurrentPassword: boolean
}

export function PasswordSecurity({ user }: PasswordSecurityProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(
    null
  )
  const [isCheckingPassword, setIsCheckingPassword] = useState(true)
  
  /**
   * 检查用户密码状态
   */
  useEffect(() => {
    const checkPasswordStatus = async (): Promise<void> => {
      try {
        const response = await fetch("/api/account/password/check", {
          credentials: "include",
        })

        const data = await response.json()

        if (data.success) {
          setPasswordStatus(data.data)
        }
      } catch (error) {
        console.error("检查密码状态失败:", error)
      } finally {
        setIsCheckingPassword(false)
      }
    }

    if (user) {
      checkPasswordStatus()
    }
  }, [user])

  /**
   * 处理密码修改
   */
  const handleChangePassword = async (): Promise<void> => {
    if (!passwordStatus) return

    if (newPassword !== confirmPassword) {
      toast.error("新密码与确认密码不匹配")
      return
    }

    // 如果需要当前密码但没有输入
    if (passwordStatus.needsCurrentPassword && !currentPassword) {
      toast.error("请输入当前密码")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/account/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordStatus.needsCurrentPassword
            ? currentPassword
            : undefined,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          data.message ||
            (!passwordStatus.hasPassword ? "密码设置成功！" : "密码修改成功！"),
          {
            description: "您现在可以使用新密码登录",
            duration: 3000,
          }
        )

        // 清空表单并更新状态
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")

        // 更新密码状态
        setPasswordStatus((prev) =>
          prev
            ? { ...prev, hasPassword: true, needsCurrentPassword: true }
            : null
        )
      } else {
        toast.error(data.error || "操作失败", {
          description: "请检查输入信息后重试",
          duration: 4000,
        })
      }
    } catch (error) {
      console.error("密码操作失败:", error)
      toast.error("操作失败", {
        description: "网络错误，请检查连接后重试",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 检查表单是否可以提交
   */
  const isFormValid = (): boolean => {
    if (!passwordStatus) return false
    if (!newPassword || !confirmPassword) return false
    if (passwordStatus.needsCurrentPassword && !currentPassword) return false
    return true
  }

  // 如果正在检查密码状态，显示加载状态
  if (isCheckingPassword) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              密码安全
            </h2>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="text-center text-slate-500">检查密码状态中...</div>
        </div>
      </div>
    )
  }

  // 如果没有获取到密码状态，不显示组件
  if (!passwordStatus) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {!passwordStatus.hasPassword ? "设置密码" : "密码安全"}
          </h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleChangePassword}
          disabled={isLoading || !isFormValid()}
        >
          {isLoading
            ? "处理中..."
            : !passwordStatus.hasPassword
            ? "设置密码"
            : "修改密码"}
        </Button>
      </div>

      <div className="space-y-6">
        {passwordStatus.isThirdPartyUser && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {!passwordStatus.hasPassword
                ? "您当前通过第三方账户登录，可以设置密码以便使用邮箱密码登录。"
                : "您已设置密码，修改密码需要验证当前密码。"}
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {passwordStatus.needsCurrentPassword && (
            <div className="space-y-2 md:col-span-2">
              <Label
                htmlFor="current-password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                当前密码
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="输入当前密码"
                className="h-10"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              新密码
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="设置新密码"
              className="h-10"
            />
            <p className="text-xs text-slate-500">
              密码至少8位，包含字母和数字
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              确认新密码
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 