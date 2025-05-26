"use client"

import { useSession } from "@/lib/auth-client"

import { BasicInfo } from "@/components/account/BasicInfo"
import { LinuxDoAuth } from "@/components/account/LinuxDoAuth"
import { PasswordSecurity } from "@/components/account/PasswordSecurity"
import { ExtendedUser } from "@/components/account/types"
import { Separator } from "@/components/ui/separator"

export default function AccountPage() {
  const { data: session, refetch } = useSession()
  const user = session?.user as ExtendedUser | undefined

  /**
   * 处理更新成功回调
   */
  const handleUpdateSuccess = async (): Promise<void> => {
    // 重新获取用户数据
    await refetch()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            账户设置
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            管理您的个人资料和账户信息
          </p>
        </div>

        <div className="space-y-8">
          {/* 基本信息 */}
          <Separator className="my-8" />
          <BasicInfo user={user} onUpdateSuccess={handleUpdateSuccess} />

          {/* 第三方认证信息 */}
          <Separator className="my-8" />
          <LinuxDoAuth user={user} onUpdateSuccess={handleUpdateSuccess} />

          {/* 密码安全 */}
          <Separator className="my-8" />
          <PasswordSecurity user={user} />
        </div>
      </div>
    </div>
  )
}
