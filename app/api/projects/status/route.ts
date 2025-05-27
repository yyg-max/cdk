import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { DistributionMode } from "@prisma/client"

// 定义 API 响应类型
type ClaimRecord = {
  id: string
  claimerId: string
  claimerName: string
  claimedAt: string
  type: 'single' | 'multi' | 'manual'
}

// 项目状态信息响应类型
interface ProjectStatusResponse {
  success: boolean
  data?: {
    singleCodeClaimsCount: number
    multiCodeClaimsCount: number
    manualApplicationsCount: number
    pendingApplicationsCount: number
    recentClaims: ClaimRecord[]
    hasMore: boolean
    totalCount: number
  }
  error?: string
}

// 获取项目状态和领取记录
export async function GET(request: NextRequest): Promise<NextResponse<ProjectStatusResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') as string, 10) : 10
    
    // 参数验证
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目ID" },
        { status: 400 }
      )
    }
    
    // 验证用户登录状态
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "用户未登录" },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    
    // 查询项目基本信息，包括分发模式
    const project = await prisma.shareProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        creatorId: true,
        distributionMode: true,
        isPublic: true
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      )
    }
    
    // 检查权限：项目创建者或公开项目可以查看
    const isCreator = project.creatorId === userId
    if (!isCreator && !project.isPublic) {
      return NextResponse.json(
        { success: false, error: "无权查看此项目状态" },
        { status: 403 }
      )
    }
    
    // 计算统计数据
    const [singleCodeClaimsCount, multiCodeClaimsCount, manualApplicationsCount, pendingApplicationsCount] = 
      await Promise.all([
        // 已领取的一码一用记录数
        prisma.singleCodeClaim.count({
          where: {
            projectId,
            isClaimed: true
          }
        }),
        // 一码多用领取记录数
        prisma.multiCodeClaim.count({
          where: {
            projectId
          }
        }),
        // 已批准的申请记录数
        prisma.manualApplication.count({
          where: {
            projectId,
            status: 'APPROVED'
          }
        }),
        // 待处理的申请记录数
        prisma.manualApplication.count({
          where: {
            projectId,
            status: 'PENDING'
          }
        })
      ])
    
    // 根据分发模式确定总记录数
    const distributionMode = project.distributionMode as DistributionMode
    let totalCount = 0
    
    switch (distributionMode) {
      case 'SINGLE':
        totalCount = singleCodeClaimsCount
        break
      case 'MULTI':
        totalCount = multiCodeClaimsCount
        break
      case 'MANUAL':
        totalCount = manualApplicationsCount
        break
      default:
        totalCount = singleCodeClaimsCount + multiCodeClaimsCount + manualApplicationsCount
    }
    
    // 计算分页参数
    const skip = (page - 1) * pageSize
    const take = pageSize
    
    // 根据分发模式获取领取记录
    let recentClaims: ClaimRecord[] = []
    
    if (distributionMode === 'SINGLE') {
      // 获取一码一用记录
      const singleClaims = await prisma.singleCodeClaim.findMany({
        where: {
          projectId,
          isClaimed: true,
          claimerId: { not: null } // 确保有领取者
        },
        include: {
          claimer: {
            select: {
              id: true,
              name: true,
              nickname: true
            }
          }
        },
        orderBy: { claimedAt: 'desc' },
        skip,
        take
      })
      
      recentClaims = singleClaims.map(claim => ({
        id: claim.id,
        claimerId: claim.claimerId as string,
        claimerName: claim.claimer?.nickname || claim.claimer?.name || '未知用户',
        claimedAt: claim.claimedAt?.toISOString() || new Date().toISOString(),
        type: 'single' as const
      }))
    } 
    else if (distributionMode === 'MULTI') {
      // 获取一码多用记录
      const multiClaims = await prisma.multiCodeClaim.findMany({
        where: { projectId },
        include: {
          claimer: {
            select: {
              id: true,
              name: true,
              nickname: true
            }
          }
        },
        orderBy: { claimedAt: 'desc' },
        skip,
        take
      })
      
      recentClaims = multiClaims.map(claim => ({
        id: claim.id,
        claimerId: claim.claimerId,
        claimerName: claim.claimer?.nickname || claim.claimer?.name || '未知用户',
        claimedAt: claim.claimedAt.toISOString(),
        type: 'multi' as const
      }))
    }
    else if (distributionMode === 'MANUAL') {
      // 获取已批准的申请记录
      const manualClaims = await prisma.manualApplication.findMany({
        where: {
          projectId,
          status: 'APPROVED'
        },
        include: {
          applicant: {
            select: {
              id: true,
              name: true,
              nickname: true
            }
          }
        },
        orderBy: { processedAt: 'desc' },
        skip,
        take
      })
      
      recentClaims = manualClaims.map(claim => ({
        id: claim.id,
        claimerId: claim.applicantId,
        claimerName: claim.applicant?.nickname || claim.applicant?.name || '未知用户',
        claimedAt: claim.processedAt?.toISOString() || claim.appliedAt.toISOString(),
        type: 'manual' as const
      }))
    }
    else {
      // 混合模式，获取所有类型的记录并合并（一般不会走到这里，但为了健壮性添加）
      // 这里实现会更复杂，需要统一排序和分页，简化起见暂不实现
      // 如果需要此功能，应重构为联合查询
    }
    
    // 检查是否有更多记录
    const hasMore = totalCount > skip + recentClaims.length
    
    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        singleCodeClaimsCount,
        multiCodeClaimsCount,
        manualApplicationsCount,
        pendingApplicationsCount,
        recentClaims,
        hasMore,
        totalCount
      }
    })
    
  } catch (error) {
    console.error("获取项目状态失败:", error)
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
} 