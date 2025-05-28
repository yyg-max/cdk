import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth-utils'
import { auth } from '@/lib/auth'
import { z } from 'zod'

/**
 * 密码更新请求数据验证
 */
const passwordUpdateSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, '密码至少8位').max(128, '密码最多128位'),
})

/**
 * 更新用户密码
 * PUT /api/account/password
 * 
 * 支持两种情况：
 * 1. 第三方用户首次设置密码（无需当前密码）
 * 2. 已有密码用户修改密码（需要当前密码验证）
 */
export async function PUT(request: NextRequest) {
  try {
    // 使用统一的认证中间件
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const validatedData = passwordUpdateSchema.parse(body)
    
    const { currentPassword, newPassword } = validatedData
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

    // 如果是第三方用户且没有设置过密码，直接设置密码
    if (userSource === 'linuxdo' && !hasPassword) {
      try {
        await auth.api.setPassword({
          body: { newPassword },
          headers: request.headers
        })
        
        return NextResponse.json({
          success: true,
          message: '密码设置成功'
        })
      } catch (setPasswordError: unknown) {
        const errorMessage = setPasswordError instanceof Error 
          ? setPasswordError.message 
          : '密码设置失败'
        
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        )
      }
    } else {
      // 普通用户或已设置密码的第三方用户需要验证当前密码
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: '请输入当前密码' },
          { status: 400 }
        )
      }

      // 使用Better Auth的changePassword API
      try {
        await auth.api.changePassword({
          body: {
            currentPassword,
            newPassword
          },
          headers: request.headers
        })
        
        return NextResponse.json({
          success: true,
          message: '密码修改成功'
        })
      } catch (changePasswordError: unknown) {
        const errorMessage = changePasswordError instanceof Error 
          ? changePasswordError.message 
          : '当前密码错误'
        
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('密码更新失败:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '密码更新失败，请稍后重试' },
      { status: 500 }
    )
  }
} 