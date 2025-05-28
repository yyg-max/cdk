import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateUser } from "@/lib/auth-utils"

/**
 * 获取所有标签 API
 * GET /api/tags
 * @param request - Next.js 请求对象
 * @returns 标签列表或错误信息
 */
export async function GET(request: NextRequest) {
  try {
    // 统一认证检查
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "未授权访问" },
        { status: authResult.status || 401 }
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