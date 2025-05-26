import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// 验证请求数据的schema
const updateAutoUpdateSchema = z.object({
  autoupdate: z.boolean()
})

export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    // 检查用户是否是Linux Do用户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
      where: { id: session.user.id },
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