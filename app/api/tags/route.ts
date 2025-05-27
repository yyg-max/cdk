import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// 获取所有标签
export async function GET(request: NextRequest) {
  try {
    // 使用Better Auth的getSession方法获取当前session
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    // 检查session是否存在且有效
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      )
    }

    // 获取所有标签
    const tags = await prisma.projectTag.findMany({
      orderBy: {
        name: 'asc' // 按名称升序排列
      }
    })

    return NextResponse.json({
      success: true,
      tags
    })
  } catch (error) {
    console.error("获取标签失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
} 