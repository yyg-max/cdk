import { NextRequest, NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

/**
 * 验证请求数据的schema
 */
const updateAutoUpdateSchema = z.object({
  autoupdate: z.boolean()
})

/**
 * 更新自动同步设置
 * PUT /api/account/autoupdate
 * 
 * 仅适用于Linux Do用户，控制登录时是否自动更新个人信息
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

    const userId = authResult.userId!

    // 检查用户是否是Linux Do用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { source: true }
    })

    if (user?.source !== "linuxdo") {
      return NextResponse.json(
        { success: false, error: "该功能仅适用于Linux Do用户" },
        { status: 400 }
      )
    }

    // 解析请求数据
    const body = await request.json()
    const validatedData = updateAutoUpdateSchema.parse(body)

    // 更新自动更新设置
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        autoupdate: validatedData.autoupdate,
        updatedAt: new Date()
      },
      select: {
        autoupdate: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: "自动更新设置已保存",
      autoupdate: updatedUser.autoupdate
    })

  } catch (error) {
    console.error("更新自动更新设置失败:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "数据格式错误",
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    )
  }
} 