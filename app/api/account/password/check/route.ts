import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth-utils'
import { auth } from '@/lib/auth'
import type { PasswordStatusResponse } from '@/components/account/types'

/**
 * 检查用户密码状态
 * GET /api/account/password/check
 * 
 * 返回用户当前密码状态，用于前端决定显示设置密码还是修改密码界面
 */
export async function GET(request: NextRequest) {
  try {
    // 使用统一的认证中间件
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = authResult.userId!

    // 获取会话信息以确定用户来源
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: '会话已过期' },
        { status: 401 }
      )
    }

    const userSource = session.user.source

    // 获取auth上下文来检查用户是否已有密码
    const ctx = await auth.$context
    const accounts = await ctx.internalAdapter.findAccounts(userId)
    const credentialAccount = accounts.find(account => account.providerId === 'credential')
    const hasPassword = !!(credentialAccount && credentialAccount.password)

    const responseData: PasswordStatusResponse = {
        hasPassword,
        isThirdPartyUser: userSource === 'linuxdo',
        needsCurrentPassword: hasPassword // 如果有密码就需要验证当前密码
      }

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('检查密码状态失败:', error)
    
    return NextResponse.json(
      { success: false, error: '检查密码状态失败，请稍后重试' },
      { status: 500 }
    )
  }
} 