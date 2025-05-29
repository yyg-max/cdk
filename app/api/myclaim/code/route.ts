import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DistributionMode } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
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

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const claimId = searchParams.get('claimId')
    const mode = searchParams.get('mode')

    if (!projectId || !mode) {
      return NextResponse.json(
        { error: "参数不完整" },
        { status: 400 }
      )
    }

    // 根据分发模式处理不同的查询
    let codeContent = null

    if (mode === DistributionMode.SINGLE) {
      // 对于一码一用，直接查询SingleCodeClaim表
      if (!claimId) {
        return NextResponse.json(
          { error: "缺少claimId参数" },
          { status: 400 }
        )
      }

      const claim = await prisma.singleCodeClaim.findFirst({
        where: {
          id: claimId,
          projectId: projectId,
          claimerId: userId,
          isClaimed: true
        },
        select: {
          content: true
        }
      })

      if (!claim) {
        return NextResponse.json(
          { error: "未找到对应的邀请码记录" },
          { status: 404 }
        )
      }

      codeContent = claim.content
    } 
    else if (mode === DistributionMode.MULTI) {
      // 对于一码多用，需要查询项目的inviteCodes字段
      const project = await prisma.shareProject.findFirst({
        where: {
          id: projectId
        },
        select: {
          inviteCodes: true,
          distributionMode: true
        }
      })

      if (!project || project.distributionMode !== DistributionMode.MULTI) {
        return NextResponse.json(
          { error: "项目不存在或不是一码多用模式" },
          { status: 404 }
        )
      }

      // 验证用户是否已领取过该项目
      const claim = await prisma.multiCodeClaim.findFirst({
        where: {
          projectId: projectId,
          claimerId: userId
        }
      })

      if (!claim) {
        return NextResponse.json(
          { error: "您尚未领取该项目" },
          { status: 403 }
        )
      }

      // 解析多用码并随机返回一个
      if (project.inviteCodes) {
        try {
          const codes = JSON.parse(project.inviteCodes)
          if (Array.isArray(codes) && codes.length > 0) {
            // 对于已领取的多用码项目，每次返回固定的码（用户ID作为种子）
            const index = userId.charCodeAt(0) % codes.length
            codeContent = codes[index]
          }
        } catch (e) {
          console.error("解析邀请码失败:", e)
        }
      }
    }
    else if (mode === DistributionMode.MANUAL) {
      // 对于手动申请，查询是否有已批准的记录
      const application = await prisma.manualApplication.findFirst({
        where: {
          projectId: projectId,
          applicantId: userId,
          status: 'APPROVED'
        },
        include: {
          project: {
            select: {
              inviteCodes: true
            }
          }
        }
      })

      if (!application) {
        return NextResponse.json(
          { error: "您的申请尚未获得批准" },
          { status: 403 }
        )
      }

      // 手动申请模式下，管理员可能在邀请码中存储了内容
      if (application.project.inviteCodes) {
        try {
          const codes = JSON.parse(application.project.inviteCodes)
          if (Array.isArray(codes) && codes.length > 0) {
            // 对于已批准的申请，返回第一个码
            codeContent = codes[0]
          }
        } catch (e) {
          console.error("解析邀请码失败:", e)
        }
      }
    }

    if (!codeContent) {
      return NextResponse.json(
        { error: "未找到邀请码内容" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      content: codeContent
    })

  } catch (error) {
    console.error("获取邀请码失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
} 