import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface CreateTagRequest {
  name: string
}

export async function POST(request: NextRequest) {
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

    // 获取请求体
    const body: CreateTagRequest = await request.json()
    
    // 验证请求数据
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "标签名称不能为空" },
        { status: 400 }
      )
    }

    if (body.name.length > 20) {
      return NextResponse.json(
        { error: "标签名称不能超过20个字符" },
        { status: 400 }
      )
    }

    // 检查标签是否已存在
    const existingTag = await prisma.projectTag.findUnique({
      where: { name: body.name.trim() }
    })

    if (existingTag) {
      return NextResponse.json(
        { error: "标签已存在", tag: existingTag },
        { status: 409 }
      )
    }

    // 创建新标签
    const tag = await prisma.projectTag.create({
      data: { name: body.name.trim() }
    })

    return NextResponse.json({
      success: true,
      message: "标签创建成功",
      tag
    })
  } catch (error) {
    console.error("创建标签失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
} 