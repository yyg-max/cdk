import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DistributionMode, ProjectStatus } from "@prisma/client"

/**
 * 检查项目领取状态和要求 API
 * 
 * 用于项目分享页面，检查：
 * 1. 用户是否已经领取过该项目
 * 2. 用户是否符合项目的领取要求
 * 3. 如果已领取，返回领取的内容
 * 
 * @param request - NextRequest
 * @param params - 路由参数，包含项目ID
 * @returns 领取状态检查结果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: "缺少项目ID" },
        { status: 400 }
      )
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

    // 获取项目基本信息（支持查看所有状态的项目）
    const project = await prisma.shareProject.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        distributionMode: true,
        totalQuota: true,
        claimedCount: true,
        startTime: true,
        endTime: true,
        requireLinuxdo: true,
        minTrustLevel: true,
        minRiskThreshold: true,
        claimPassword: true,
        usageUrl: true,
        tutorial: true,
        inviteCodes: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在" },
        { status: 404 }
      )
    }

    // 获取用户信息
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
      return NextResponse.json({
        success: true,
        data: {
          claimed: false,
          canClaim: false,
          reason: "用户状态异常",
          requirements: {
            userStatus: false,
            projectActive: false,
            timeValid: false,
            quotaAvailable: false,
            linuxdoAuth: false,
            trustLevel: false
          }
        }
      })
    }

    // 1. 检查用户是否已经领取过
    const existingClaim = await checkExistingClaim(projectId, userId, project.distributionMode)
    
    if (existingClaim.claimed) {
      // 已领取，返回领取内容
      return NextResponse.json({
        success: true,
        data: {
          claimed: true,
          content: existingClaim.content,
          usageUrl: project.usageUrl,
          tutorial: project.tutorial,
          claimedAt: existingClaim.claimedAt
        }
      })
    }

    // 2. 检查项目状态和领取要求
    const requirements = checkClaimRequirements(project, user)
    
    // 判断是否可以领取
    const canClaim = Object.values(requirements).every(req => req === true)
    
    // 生成具体的不符合原因
    let reason = ""
    if (!requirements.userStatus) {
      reason = "用户状态异常"
    } else if (!requirements.projectActive) {
      reason = "项目已暂停或结束"
    } else if (!requirements.timeValid) {
      reason = checkTimeStatus(project.startTime, project.endTime)
    } else if (!requirements.quotaAvailable) {
      reason = "名额已满"
    } else if (!requirements.linuxdoAuth) {
      reason = "需要 LinuxDo 认证"
    } else if (!requirements.trustLevel) {
      reason = `需要信任等级 ${project.minTrustLevel} 或以上`
    }

    return NextResponse.json({
      success: true,
      data: {
        claimed: false,
        canClaim,
        reason,
        requirements,
        needPassword: !!project.claimPassword,
        usageUrl: project.usageUrl,
        tutorial: project.tutorial,
        projectInfo: {
          name: project.name,
          status: project.status,
          totalQuota: project.totalQuota,
          claimedCount: project.claimedCount,
          remainingQuota: Math.max(0, project.totalQuota - project.claimedCount),
          distributionMode: project.distributionMode
        }
      }
    })

  } catch (error) {
    console.error("检查领取状态失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
}

/**
 * 检查用户是否已经领取过项目
 * 
 * @param projectId - 项目ID
 * @param userId - 用户ID
 * @param distributionMode - 分发模式
 * @returns 领取状态信息
 */
async function checkExistingClaim(projectId: string, userId: string, distributionMode: DistributionMode) {
  if (distributionMode === DistributionMode.SINGLE) {
    const claim = await prisma.singleCodeClaim.findFirst({
      where: {
        projectId: projectId,
        claimerId: userId,
        isClaimed: true
      },
      select: {
        content: true,
        claimedAt: true
      }
    })
    
    return {
      claimed: !!claim,
      content: claim?.content,
      claimedAt: claim?.claimedAt
    }
  } else if (distributionMode === DistributionMode.MULTI) {
    const claim = await prisma.multiCodeClaim.findFirst({
      where: {
        projectId: projectId,
        claimerId: userId
      },
      select: {
        claimedAt: true
      }
    })
    
    if (claim) {
      // 获取多用码内容
      const project = await prisma.shareProject.findUnique({
        where: { id: projectId },
        select: { inviteCodes: true }
      })
      
      let inviteCodes: string[] = []
      if (project?.inviteCodes) {
        try {
          inviteCodes = JSON.parse(project.inviteCodes)
        } catch {
          // 解析失败时使用空数组
        }
      }
      
      const randomCode = inviteCodes.length > 0 
        ? inviteCodes[Math.floor(Math.random() * inviteCodes.length)]
        : ''
      
      return {
        claimed: true,
        content: randomCode,
        claimedAt: claim.claimedAt
      }
    }
    
    return { claimed: false }
  } else if (distributionMode === DistributionMode.MANUAL) {
    const application = await prisma.manualApplication.findFirst({
      where: {
        projectId: projectId,
        applicantId: userId,
        status: 'APPROVED'
      },
      select: {
        processedAt: true
      }
    })
    
    return {
      claimed: !!application,
      content: application ? "申请已通过，请联系项目创建者获取具体内容。" : undefined,
      claimedAt: application?.processedAt
    }
  }
  
  return { claimed: false }
}

/**
 * 检查项目领取要求
 * 
 * @param project - 项目信息
 * @param user - 用户信息
 * @returns 各项要求的检查结果
 */
function checkClaimRequirements(
  project: {
    status: ProjectStatus
    totalQuota: number
    claimedCount: number
    startTime: Date
    endTime: Date | null
    requireLinuxdo: boolean
    minTrustLevel: number
  },
  user: {
    trustLevel: number | null
    source: string
    banned: boolean
  }
) {
  const now = new Date()
  
  return {
    userStatus: !user.banned,
    projectActive: project.status === ProjectStatus.ACTIVE,
    timeValid: now >= project.startTime && (!project.endTime || now <= project.endTime),
    quotaAvailable: project.claimedCount < project.totalQuota,
    linuxdoAuth: !project.requireLinuxdo || user.source === "linuxdo",
    trustLevel: !project.requireLinuxdo || (user.trustLevel || 0) >= project.minTrustLevel
  }
}

/**
 * 检查时间状态并返回具体原因
 * 
 * @param startTime - 开始时间
 * @param endTime - 结束时间
 * @returns 时间状态描述
 */
function checkTimeStatus(startTime: Date, endTime: Date | null): string {
  const now = new Date()
  
  if (now < startTime) {
    return "项目尚未开始"
  } else if (endTime && now > endTime) {
    return "项目已过期"
  }
  
  return "时间要求满足"
} 