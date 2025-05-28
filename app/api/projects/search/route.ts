import { NextRequest, NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { APPLICATION_STATUS, PROJECT_STATUS } from "@/lib/constants"
import type { Prisma, ProjectCategory, DistributionMode, ProjectStatus } from "@prisma/client"
import type { ProjectSearchResponse } from "@/components/project/read/types"

// 定义 Prisma 查询结果类型
type ProjectWithIncludes = Prisma.ShareProjectGetPayload<{
  include: {
    tags: {
      include: {
        tag: true
      }
    }
    creator: {
      select: {
        id: true
        name: true
        nickname: true
        image: true
      }
    }
    _count: {
      select: {
        singleCodeClaims: {
          where: { isClaimed: true }
        }
        multiCodeClaims: true
        manualApplications: {
          where: { status: 'APPROVED' }
        }
      }
    }
  }
}>

/**
 * 查询参数类型定义
 * 定义所有可能的查询参数及其类型
 */
interface SearchParams {
  // 分页参数
  /** 页码，从1开始 */
  page?: string
  /** 每页条目数，最大50 */
  limit?: string
  
  // 筛选参数
  /** 项目分类筛选 */
  category?: string
  /** 分发模式筛选 */
  distributionMode?: string
  /** 项目状态筛选 */
  status?: string
  /** 公开状态筛选 */
  isPublic?: string
  /** LinuxDo认证要求筛选 */
  requireLinuxdo?: string
  /** 标签ID筛选 */
  tagId?: string
  
  // 搜索参数
  /** 关键词搜索 */
  keyword?: string
  
  // 排序参数
  /** 排序字段 */
  sortBy?: string // createdAt, claimedCount, totalQuota, name
  /** 排序方向 */
  sortOrder?: string // asc, desc
  
  // 个人查询参数
  /** 指定用户ID查询 */
  userId?: string
  /** 查询当前用户创建的项目 */
  myProjects?: string // "true" 表示查询当前用户创建的项目
  /** 查询当前用户领取的项目 */
  myClaims?: string // "true" 表示查询当前用户领取的项目
}

/**
 * 项目搜索API
 * 
 * @description 支持多种筛选条件和排序方式的项目搜索接口
 * 
 * @param request - Next.js请求对象，包含查询参数
 * @returns Promise<NextResponse<ProjectSearchResponse>> - 搜索结果响应
 * 
 * @example
 * // 基础搜索
 * GET /api/projects/search?page=1&limit=10&category=AI&status=ACTIVE
 * 
 * // 关键词搜索
 * GET /api/projects/search?keyword=GPT&sortBy=createdAt&sortOrder=desc
 * 
 * // 个人项目查询
 * GET /api/projects/search?myProjects=true&page=1&limit=5
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProjectSearchResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const params: SearchParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      category: searchParams.get('category') || undefined,
      distributionMode: searchParams.get('distributionMode') || undefined,
      status: searchParams.get('status') || undefined,
      isPublic: searchParams.get('isPublic') || undefined,
      requireLinuxdo: searchParams.get('requireLinuxdo') || undefined,
      tagId: searchParams.get('tagId') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      userId: searchParams.get('userId') || undefined,
      myProjects: searchParams.get('myProjects') || undefined,
      myClaims: searchParams.get('myClaims') || undefined,
    }

    // 验证分页参数
    const page = Math.max(1, parseInt(params.page || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(params.limit || '10'))) // 限制每页最多50条
    const skip = (page - 1) * limit

    // 获取当前用户信息（如果需要个人查询功能）
    let currentUserId: string | null = null
    if (params.myProjects === 'true' || params.myClaims === 'true') {
      const authResult = await authenticateUser(request)
      
      if (!authResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: authResult.error || "需要登录才能查询个人项目" 
          },
          { status: authResult.status || 401 }
        )
      }
      
      currentUserId = authResult.userId!
    }

    // 构建查询条件
    const where: Prisma.ShareProjectWhereInput = {}

    // 基础筛选条件
    if (params.category) {
      where.category = params.category as ProjectCategory
    }
    
    if (params.distributionMode) {
      where.distributionMode = params.distributionMode as DistributionMode
    }
    
    if (params.status) {
      where.status = params.status as ProjectStatus
    }
    
    if (params.isPublic !== undefined) {
      where.isPublic = params.isPublic === 'true'
    }
    
    if (params.requireLinuxdo !== undefined) {
      where.requireLinuxdo = params.requireLinuxdo === 'true'
    }
    
    if (params.tagId) {
      where.tags = {
        some: {
          tagId: params.tagId
        }
      }
    }

    // 关键词搜索 - 在项目名称、描述和教程中搜索
    if (params.keyword) {
      where.OR = [
        { name: { contains: params.keyword } },
        { description: { contains: params.keyword } },
        { tutorial: { contains: params.keyword } }
      ]
    }

    // 个人项目查询
    if (params.myProjects === 'true' && currentUserId) {
      where.creatorId = currentUserId
    } else if (params.userId) {
      where.creatorId = params.userId
    }

    // 用户领取的项目查询
    if (params.myClaims === 'true' && currentUserId) {
      where.OR = [
        {
          singleCodeClaims: {
            some: {
              claimerId: currentUserId
            }
          }
        },
        {
          multiCodeClaims: {
            some: {
              claimerId: currentUserId
            }
          }
        },
        {
          manualApplications: {
            some: {
              applicantId: currentUserId,
              status: APPLICATION_STATUS.APPROVED
            }
          }
        }
      ]
    }

    // 构建排序条件
    let orderBy: Prisma.ShareProjectOrderByWithRelationInput[] = []
    const validSortFields = ['createdAt', 'claimedCount', 'totalQuota', 'name', 'updatedAt', 'status']
    const sortField = validSortFields.includes(params.sortBy!) ? params.sortBy : 'createdAt'
    const sortDirection = params.sortOrder === 'asc' ? 'asc' : 'desc'
    
    // 特殊处理状态排序 - 使用数据库级别的自定义排序
    if (sortField === 'status') {
      // 无法直接在 Prisma 中使用 CASE WHEN，所以我们使用多重排序
      // 首先获取所有数据，然后在应用层排序
      orderBy = [{ createdAt: 'desc' }] // 先按创建时间排序作为基准
    } else {
      // 为其他字段创建正确的排序对象
      const sortObj: Prisma.ShareProjectOrderByWithRelationInput = {}
      if (sortField === 'createdAt') {
        sortObj.createdAt = sortDirection
      } else if (sortField === 'claimedCount') {
        sortObj.claimedCount = sortDirection
      } else if (sortField === 'totalQuota') {
        sortObj.totalQuota = sortDirection
      } else if (sortField === 'name') {
        sortObj.name = sortDirection
      } else if (sortField === 'updatedAt') {
        sortObj.updatedAt = sortDirection
      }
      orderBy = [sortObj]
    }

    // 执行查询
    const [allProjects, totalCount] = await Promise.all([
      // 标准查询，前端会处理状态排序
      prisma.shareProject.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true
            }
          },
          _count: {
            select: {
              singleCodeClaims: {
                where: { isClaimed: true }
              },
              multiCodeClaims: true,
              manualApplications: {
                where: { status: APPLICATION_STATUS.APPROVED }
              }
            }
          }
        }
      }),
      prisma.shareProject.count({ where })
    ])

    // 计算总页数
    const totalPages = Math.ceil(totalCount / limit)

    // 处理返回数据，确保类型安全
    const processedProjects = allProjects.map((project: ProjectWithIncludes) => {
      // 计算实际领取数量
      const actualClaimedCount = project._count.singleCodeClaims + 
                                project._count.multiCodeClaims + 
                                project._count.manualApplications

      // 计算剩余名额
      const remainingQuota = Math.max(0, project.totalQuota - actualClaimedCount)

      // 判断项目状态
      let currentStatus = project.status
      const now = new Date()
      
      if (project.endTime && now > project.endTime) {
        currentStatus = PROJECT_STATUS.EXPIRED
      } else if (actualClaimedCount >= project.totalQuota) {
        currentStatus = PROJECT_STATUS.COMPLETED
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        tags: project.tags.map(tagRelation => ({
          id: tagRelation.tag.id,
          name: tagRelation.tag.name
        })),
        usageUrl: project.usageUrl,
        totalQuota: project.totalQuota,
        claimedCount: actualClaimedCount,
        remainingQuota,
        tutorial: project.tutorial,
        distributionMode: project.distributionMode,
        isPublic: project.isPublic,
        startTime: project.startTime.toISOString(),
        endTime: project.endTime?.toISOString() || null,
        requireLinuxdo: project.requireLinuxdo,
        minTrustLevel: project.minTrustLevel,
        minRiskThreshold: project.minRiskThreshold,
        status: currentStatus,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        hasPassword: !!project.claimPassword,
        claimPassword: project.claimPassword,
        creator: project.creator
      }
    })

    // 返回搜索结果，使用统一的响应格式
    return NextResponse.json({
      success: true,
      data: {
        projects: processedProjects,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          category: params.category || 'all',
          distributionMode: params.distributionMode || 'all',
          status: params.status || 'all',
          isPublic: params.isPublic || 'all',
          requireLinuxdo: params.requireLinuxdo || 'all',
          tagId: params.tagId || 'all',
          keyword: params.keyword || ''
        },
        sort: {
          sortBy: sortField as 'status' | 'createdAt' | 'updatedAt' | 'name' | 'claimedCount' | 'totalQuota',
          sortOrder: sortDirection
        }
      }
    })

  } catch (error) {
    console.error("查询项目失败:", error)
    const errorMessage = error instanceof Error ? error.message : "查询项目时发生未知错误"
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试", message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 获取项目统计数据API
 * 
 * @description 支持获取项目分类、标签、统计信息等数据
 * 
 * @param request - Next.js请求对象，包含操作类型
 * @returns Promise<NextResponse> - 统计数据响应
 * 
 * @example
 * // 获取分类统计
 * POST /api/projects/search
 * { "action": "getCategories" }
 * 
 * // 获取标签列表
 * POST /api/projects/search  
 * { "action": "getTags" }
 */
export async function POST(request: NextRequest) {
  try {
    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "请求体格式无效" },
        { status: 400 }
      )
    }

    if (!requestBody || typeof requestBody !== 'object' || requestBody === null) {
      return NextResponse.json(
        { success: false, error: "请求体不能为空" },
        { status: 400 }
      )
    }

    const body = requestBody as Record<string, unknown>
    const { action } = body

    if (typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: "操作类型必须为字符串" },
        { status: 400 }
      )
    }

    if (action === 'getCategories') {
      // 获取所有项目分类及其项目数量
      const categories = await prisma.shareProject.groupBy({
        by: ['category'],
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: categories.map(item => ({
          name: item.category,
          count: item._count.category
        }))
      })
    }

    if (action === 'getTags') {
      // 获取所有标签及其使用次数
      const tags = await prisma.projectTag.findMany({
        include: {
          _count: {
            select: {
              projects: true
            }
          }
        },
        orderBy: {
          projects: {
            _count: 'desc'
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          count: tag._count.projects
        }))
      })
    }

    if (action === 'getStats') {
      // 获取系统统计信息
      const [totalProjects, activeProjects, totalUsers, totalClaims] = await Promise.all([
        prisma.shareProject.count(),
        prisma.shareProject.count({
          where: { status: PROJECT_STATUS.ACTIVE }
        }),
        prisma.user.count(),
        Promise.all([
          prisma.singleCodeClaim.count({ where: { isClaimed: true } }),
          prisma.multiCodeClaim.count(),
          prisma.manualApplication.count({ where: { status: APPLICATION_STATUS.APPROVED } })
        ]).then(([single, multi, manual]) => single + multi + manual)
      ])

      return NextResponse.json({
        success: true,
        data: {
          totalProjects,
          activeProjects,
          totalUsers,
          totalClaims
        }
      })
    }

    return NextResponse.json(
      { success: false, error: "不支持的操作类型" },
      { status: 400 }
    )

  } catch (error) {
    console.error("获取数据失败:", error)
    const errorMessage = error instanceof Error ? error.message : "获取数据时发生未知错误"
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试", message: errorMessage },
      { status: 500 }
    )
  }
}
