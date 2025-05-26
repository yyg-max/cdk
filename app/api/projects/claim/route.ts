import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

interface ClaimRequest {
  projectId: string
  inviteCode: string
  claimPassword?: string
}

// 生成邀请码哈希值
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body: ClaimRequest = await request.json()
    
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

    // 获取项目信息（使用索引优化查询）
    const project = await prisma.shareProject.findFirst({
      where: {
        id: body.projectId,
        status: "active",
        startTime: { lte: new Date() },
        OR: [
          { endTime: null },
          { endTime: { gte: new Date() } }
        ]
      },
      select: {
        id: true,
        distributionMode: true,
        totalQuota: true,
        claimedCount: true,
        claimPassword: true,
        inviteCodes: true,
        requireLinuxdo: true,
        minTrustLevel: true,
        minRiskThreshold: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或已过期" },
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
      if (!body.claimPassword) {
        return NextResponse.json(
          { error: "请输入领取密码" },
          { status: 400 }
        )
      }
      
      const isPasswordValid = await bcrypt.compare(body.claimPassword, project.claimPassword)
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

    // 根据分发模式处理领取逻辑
    let result
    if (project.distributionMode === "single") {
      result = await handleSingleCodeClaim(project.id, body.inviteCode, userId)
    } else if (project.distributionMode === "multi") {
      result = await handleMultiCodeClaim(project.id, body.inviteCode, userId, project.inviteCodes)
    } else {
      return NextResponse.json(
        { error: "手动邀请模式不支持直接领取" },
        { status: 400 }
      )
    }

    if (result.success) {
      // 更新项目的已领取数量（使用原子操作）
      await prisma.shareProject.update({
        where: { id: project.id },
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
  } finally {
    await prisma.$disconnect()
  }
}

// 处理一码一用领取
async function handleSingleCodeClaim(projectId: string, inviteCode: string, userId: string) {
  const contentHash = generateContentHash(inviteCode)
  
  // 使用事务确保原子性
  return await prisma.$transaction(async (tx) => {
    // 查找可用的邀请码（使用哈希索引快速查找）
    const claim = await tx.singleCodeClaim.findFirst({
      where: {
        projectId: projectId,
        contentHash: contentHash,
        isClaimed: false
      }
    })

    if (!claim) {
      return { success: false, error: "邀请码无效或已被使用" }
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
async function handleMultiCodeClaim(projectId: string, inviteCode: string, userId: string, inviteCodesJson: string | null) {
  if (!inviteCodesJson) {
    return { success: false, error: "项目配置错误" }
  }

  try {
    const inviteCodes = JSON.parse(inviteCodesJson)
    if (!inviteCodes.includes(inviteCode)) {
      return { success: false, error: "邀请码无效" }
    }
  } catch {
    return { success: false, error: "项目配置错误" }
  }

  // 检查用户是否已经领取过
  const existingClaim = await prisma.multiCodeClaim.findUnique({
    where: {
      projectId_claimerId: {
        projectId: projectId,
        claimerId: userId
      }
    }
  })

  if (existingClaim) {
    return { success: false, error: "您已经领取过该项目" }
  }

  // 创建领取记录
  await prisma.multiCodeClaim.create({
    data: {
      projectId: projectId,
      claimerId: userId
    }
  })

  return { 
    success: true, 
    message: "领取成功",
    data: { content: inviteCode }
  }
} 