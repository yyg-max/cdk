import { NextRequest, NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import type { DistributionMode } from "@prisma/client"
import type { ProjectStatusResponse, ProjectClaimsData } from "@/components/project/read/types"

/**
 * 领取记录类型定义
 * 表示单个用户的项目领取记录
 */
type ClaimRecord = {
  /** 记录唯一标识符 */
  readonly id: string
  /** 领取者用户ID */
  readonly claimerId: string
  /** 领取者显示名称 */
  readonly claimerName: string
  /** 领取时间 ISO 字符串 */
  readonly claimedAt: string
  /** 领取类型 */
  readonly type: 'single' | 'multi' | 'manual'
}

/**
 * 获取项目状态和领取记录API
 * 
 * @description 获取指定项目的详细状态信息，包括各种领取统计和最近的领取记录
 * 
 * @param request - Next.js请求对象，包含项目ID和分页参数
 * @returns Promise<NextResponse<ProjectStatusResponse>> - 项目状态响应
 * 
 * @example
 * GET /api/projects/status?projectId=proj_123&page=1&pageSize=10
 * 
 * // 响应体
 * {
 *   "success": true,
 *   "data": {
 *     "singleCodeClaimsCount": 5,
 *     "multiCodeClaimsCount": 12,
 *     "manualApplicationsCount": 3,
 *     "pendingApplicationsCount": 2,
 *     "recentClaims": [...],
 *     "hasMore": true,
 *     "totalCount": 20
 *   }
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProjectStatusResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize') as string, 10) : 10
    
    // 参数验证
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      return NextResponse.json(
        { success: false, error: "缺少有效的项目ID" },
        { status: 400 }
      )
    }
    
    // 验证分页参数
    const validatedPage = Math.max(1, isNaN(page) ? 1 : page)
    const validatedPageSize = Math.max(1, Math.min(50, isNaN(pageSize) ? 10 : pageSize)) // 限制最大50条
    
    // 使用统一的认证中间件
    const authResult = await authenticateUser(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error || "用户未登录" 
        },
        { status: authResult.status || 401 }
      )
    }
    
    const userId = authResult.userId!
    
    // 查询项目基本信息，包括分发模式和权限验证
    const project = await prisma.shareProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        creatorId: true,
        distributionMode: true,
        isPublic: true,
        name: true
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
    
    // 并行查询统计数据，提高性能
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
        // 如果有未知的分发模式，返回所有类型的总和
        totalCount = singleCodeClaimsCount + multiCodeClaimsCount + manualApplicationsCount
    }
    
    // 计算分页参数
    const skip = (validatedPage - 1) * validatedPageSize
    const take = validatedPageSize
    
    // 根据分发模式获取对应的领取记录
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
      
      recentClaims = singleClaims
        .filter(claim => claim.claimer && claim.claimedAt) // 过滤无效记录
        .map(claim => ({
          id: claim.id,
          claimerId: claim.claimerId as string,
          claimerName: claim.claimer?.nickname || claim.claimer?.name || '未知用户',
          claimedAt: claim.claimedAt!.toISOString(),
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
        claimedAt: (claim.processedAt || claim.appliedAt).toISOString(),
        type: 'manual' as const
      }))
    }
    // 注意：混合模式在当前设计中不常见，如果需要支持需要额外的联合查询逻辑
    
    // 检查是否有更多记录
    const hasMore = totalCount > skip + recentClaims.length
    
    // 构建响应数据
    const responseData: ProjectClaimsData = {
      singleCodeClaimsCount,
      multiCodeClaimsCount,
      manualApplicationsCount,
      pendingApplicationsCount,
      recentClaims,
      hasMore,
      totalCount
    }
    
    // 返回结果
    return NextResponse.json({
      success: true,
      data: responseData
    })
    
  } catch (error) {
    console.error("获取项目状态失败:", error)
    const errorMessage = error instanceof Error ? error.message : "获取项目状态时发生未知错误"
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试", message: errorMessage },
      { status: 500 }
    )
  }
} 