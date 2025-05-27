import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// 转换时间为中国时区 (UTC+8)
const formatToChineseTime = (date: Date) => {
  return new Date(date.getTime() + (8 * 60 * 60 * 1000)).toISOString()
}

// 验证请求数据的schema
const updateBasicInfoSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  image: z.string().optional().refine((val) => {
    if (!val || val === "") return true // 允许空字符串
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, { message: "头像链接格式无效" })
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

    // 解析请求数据
    const body = await request.json()
    const validatedData = updateBasicInfoSchema.parse(body)

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date() // 手动设置更新时间
    }
    
    if (validatedData.nickname !== undefined) {
      updateData.nickname = validatedData.nickname
    }
    
    if (validatedData.email !== undefined) {
      // 检查邮箱是否已被其他用户使用
      if (validatedData.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: validatedData.email,
            id: { not: session.user.id }
          }
        })
        
        if (existingUser) {
          return NextResponse.json(
            { success: false, error: "该邮箱已被其他用户使用" },
            { status: 400 }
          )
        }
      }
      
      updateData.email = validatedData.email
      // 如果更改了邮箱，需要重新验证
      updateData.emailVerified = false
    }
    
    if (validatedData.image !== undefined) {
      updateData.image = validatedData.image || null
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        nickname: true,
        email: true,
        emailVerified: true,
        image: true,
        updatedAt: true
      }
    })

    const userWithChineseTime = {
      ...updatedUser,
      updatedAt: formatToChineseTime(updatedUser.updatedAt)
    }

    return NextResponse.json({
      success: true,
      message: "基本信息更新成功",
      user: userWithChineseTime
    })

  } catch (error) {
    console.error("更新基本信息失败:", error)
    
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