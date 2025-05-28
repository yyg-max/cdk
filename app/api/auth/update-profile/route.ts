import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ErrorResponse, UserUpdateResponse, LinuxDoProfile } from '@/lib/types/auth'

/**
 * 更新用户个人资料API
 * 从Linux Do获取最新数据并更新用户信息
 * 
 * @param request - NextRequest请求对象
 * @returns NextResponse响应对象
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return NextResponse.json<ErrorResponse>(
        { error: '用户未登录' },
        { status: 401 }
      )
    }

    // 检查用户是否是Linux Do用户
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: 'linuxdo'
      }
    })

    if (!account) {
      return NextResponse.json<ErrorResponse>(
        { error: '该账户不是Linux Do用户' },
        { status: 400 }
      )
    }

    // 使用保存的access token调用Linux Do API
    const response = await fetch('https://connect.linux.do/api/user', {
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Linux Do API调用失败' },
        { status: 500 }
      )
    }

    const profile = await response.json() as LinuxDoProfile

    // 获取用户的自动更新设置
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { autoupdate: true }
    })

    // 根据自动更新设置决定更新哪些字段
    const updateData: Record<string, unknown> = {
      trustLevel: profile.trust_level || 0, // 总是更新信任等级
      updatedAt: new Date()
    }

    // 如果开启了自动更新，则更新所有信息
    if (currentUser?.autoupdate) {
      updateData.nickname = profile.name // Linux Do的name字段作为昵称
      updateData.image = profile.avatar_url // 更新头像
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: updateData
    })

    return NextResponse.json<UserUpdateResponse>({
      success: true,
      message: '用户信息更新成功',
      user: {
        nickname: updatedUser.nickname || undefined,
        image: updatedUser.image || undefined,
        trustLevel: updatedUser.trustLevel || undefined,
        updatedAt: updatedUser.updatedAt
      }
    })

  } catch (error: unknown) {
    // 断言error为Error类型以安全地访问message属性
    const errorObj = error as Error;
    console.error('更新用户信息失败:', errorObj)
    
    return NextResponse.json<ErrorResponse>(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
} 