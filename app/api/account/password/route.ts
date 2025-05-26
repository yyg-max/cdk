import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const passwordUpdateSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, '密码至少8位').max(128, '密码最多128位'),
})

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = passwordUpdateSchema.parse(body)
    
    const { currentPassword, newPassword } = validatedData
    const userSource = session.user.source
    const userId = session.user.id

    // 获取auth上下文来检查用户是否已有密码
    const ctx = await auth.$context
    const accounts = await ctx.internalAdapter.findAccounts(userId)
    const credentialAccount = accounts.find(account => account.providerId === 'credential')
    const hasPassword = credentialAccount && credentialAccount.password

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
      } catch (setPasswordError: any) {
        return NextResponse.json(
          { success: false, error: setPasswordError.message || '密码设置失败' },
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
      } catch (changePasswordError: any) {
        return NextResponse.json(
          { success: false, error: changePasswordError.message || '当前密码错误' },
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