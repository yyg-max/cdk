import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DistributionMode, ProjectStatus } from "@prisma/client"

interface ClaimRequest {
  password?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    // 安全地解析请求体
    let body: ClaimRequest = {}
    try {
      const text = await request.text()
      if (text.trim()) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.error("JSON解析错误:", parseError)
      // 使用默认空对象，继续处理
    }
    
    // 获取当前用户
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "用户未登录" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 获取项目信息 - 移除isPublic限制，允许领取私有项目
    const project = await prisma.shareProject.findFirst({
      where: {
        id: projectId,
        status: ProjectStatus.ACTIVE, // 保持活跃状态检查
        // 注意：移除 isPublic 限制，因为用户能访问分享页面就应该允许尝试领取
        startTime: { lte: new Date() }, // 保持开始时间检查
        OR: [
          { endTime: null },
          { endTime: { gte: new Date() } } // 保持结束时间检查
        ]
      },
      select: {
        id: true,
        name: true,
        distributionMode: true,
        totalQuota: true,
        claimedCount: true,
        claimPassword: true,
        requireLinuxdo: true,
        minTrustLevel: true,
        minRiskThreshold: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在、未开始或已过期" },
        { status: 404 }
      )
    }

    // 检查名额是否已满
    if (project.claimedCount >= project.totalQuota) {
      return NextResponse.json(
        { error: "名额已满" },
        { status: 400 }
      )
    }

    // 验证领取密码
    if (project.claimPassword) {
      if (!body.password) {
        return NextResponse.json(
          { error: "请输入领取密码" },
          { status: 400 }
        )
      }
      
      const isPasswordValid = await bcrypt.compare(body.password, project.claimPassword)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "领取密码错误" },
          { status: 400 }
        )
      }
    }

    // 获取用户信息进行权限验证
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        trustLevel: true,
        source: true,
        banned: true
      }
    })

    if (!user || user.banned) {
      return NextResponse.json(
        { error: "用户状态异常" },
        { status: 403 }
      )
    }

    // LinuxDo认证检查
    if (project.requireLinuxdo && user.source !== "linuxdo") {
      return NextResponse.json(
        { error: "需要LinuxDo认证" },
        { status: 403 }
      )
    }

    // 信任等级检查
    if (project.requireLinuxdo && (user.trustLevel || 0) < project.minTrustLevel) {
      return NextResponse.json(
        { error: `需要信任等级${project.minTrustLevel}或以上` },
        { status: 403 }
      )
    }

    // 检查用户是否已经领取过
    const existingClaim = await checkExistingClaim(projectId, userId, project.distributionMode)
    if (existingClaim) {
      return NextResponse.json(
        { error: "您已经领取过此项目" },
        { status: 400 }
      )
    }

    // 根据分发模式处理领取逻辑
    let result
    if (project.distributionMode === DistributionMode.SINGLE) {
      result = await handleSingleCodeClaim(projectId, userId)
    } else if (project.distributionMode === DistributionMode.MULTI) {
      result = await handleMultiCodeClaim(projectId, userId)
    } else {
      return NextResponse.json(
        { error: "手动邀请模式需要管理员审核" },
        { status: 400 }
      )
    }

    if (result.success) {
      // 更新项目的已领取数量（使用原子操作）
      await prisma.shareProject.update({
        where: { id: projectId },
        data: {
          claimedCount: { increment: 1 }
        }
      })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error("领取失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
}

// 检查用户是否已经领取过
async function checkExistingClaim(projectId: string, userId: string, distributionMode: DistributionMode) {
  if (distributionMode === DistributionMode.SINGLE) {
    const existing = await prisma.singleCodeClaim.findFirst({
      where: {
        projectId: projectId,
        claimerId: userId,
        isClaimed: true
      }
    })
    return !!existing
  } else if (distributionMode === DistributionMode.MULTI) {
    const existing = await prisma.multiCodeClaim.findFirst({
      where: {
        projectId: projectId,
        claimerId: userId
      }
    })
    return !!existing
  } else if (distributionMode === DistributionMode.MANUAL) {
    const existing = await prisma.manualApplication.findFirst({
      where: {
        projectId: projectId,
        applicantId: userId,
        status: 'APPROVED'
      }
    })
    return !!existing
  }
  return false
}

// 处理一码一用领取
async function handleSingleCodeClaim(projectId: string, userId: string) {
  // 使用事务确保原子性
  return await prisma.$transaction(async (tx) => {
    // 查找可用的邀请码
    const claim = await tx.singleCodeClaim.findFirst({
      where: {
        projectId: projectId,
        isClaimed: false
      },
      orderBy: {
        createdAt: 'asc' // 按创建时间排序，先到先得
      }
    })

    if (!claim) {
      return { success: false, error: "暂无可用的邀请码" }
    }

    // 标记为已领取
    await tx.singleCodeClaim.update({
      where: { id: claim.id },
      data: {
        isClaimed: true,
        claimerId: userId,
        claimedAt: new Date()
      }
    })

    return { 
      success: true, 
      message: "领取成功",
      data: { content: claim.content }
    }
  })
}

// 处理一码多用领取
async function handleMultiCodeClaim(projectId: string, userId: string) {
  // 获取项目的多用码
  const project = await prisma.shareProject.findUnique({
    where: { id: projectId },
    select: { inviteCodes: true }
  })

  if (!project?.inviteCodes) {
    return { success: false, error: "项目配置错误" }
  }

  let inviteCodes: string[]
  try {
    inviteCodes = JSON.parse(project.inviteCodes)
  } catch {
    return { success: false, error: "邀请码格式错误" }
  }

  if (!inviteCodes || inviteCodes.length === 0) {
    return { success: false, error: "暂无可用的邀请码" }
  }

  // 随机选择一个邀请码
  const randomCode = inviteCodes[Math.floor(Math.random() * inviteCodes.length)]

  // 记录领取记录
  await prisma.multiCodeClaim.create({
    data: {
      projectId: projectId,
      claimerId: userId,
      claimedAt: new Date()
    }
  })

  return { 
    success: true, 
    message: "领取成功",
    data: { content: randomCode }
  }
} 