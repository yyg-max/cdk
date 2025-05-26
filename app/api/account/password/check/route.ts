import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userSource = session.user.source

    // 获取auth上下文来检查用户是否已有密码
    const ctx = await auth.$context
    const accounts = await ctx.internalAdapter.findAccounts(userId)
    const credentialAccount = accounts.find(account => account.providerId === 'credential')
    const hasPassword = !!(credentialAccount && credentialAccount.password)

    return NextResponse.json({
      success: true,
      data: {
        hasPassword,
        isThirdPartyUser: userSource === 'linuxdo',
        needsCurrentPassword: hasPassword // 如果有密码就需要验证当前密码
      }
    })
  } catch (error) {
    console.error('检查密码状态失败:', error)
    
    return NextResponse.json(
      { success: false, error: '检查密码状态失败，请稍后重试' },
      { status: 500 }
    )
  }
} 