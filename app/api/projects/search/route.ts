import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { APPLICATION_STATUS, PROJECT_STATUS } from "@/lib/constants"
import type { Prisma } from "@prisma/client"

// 定义 Prisma 查询结果类型
type ProjectWithIncludes = Prisma.ShareProjectGetPayload<{
  include: {
    tag: true
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

// 查询参数类型定义
interface SearchParams {
  // 分页参数
  page?: string
  limit?: string
  
  // 筛选参数
  category?: string
  distributionMode?: string
  status?: string
  isPublic?: string
  requireLinuxdo?: string
  tagId?: string
  
  // 搜索参数
  keyword?: string
  
  // 排序参数
  sortBy?: string // createdAt, claimedCount, totalQuota, name
  sortOrder?: string // asc, desc
  
  // 个人查询参数
  userId?: string
  myProjects?: string // "true" 表示查询当前用户创建的项目
  myClaims?: string // "true" 表示查询当前用户领取的项目
}

export async function GET(request: NextRequest) {
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

    // 获取当前用户信息（如果需要）
    let currentUserId: string | null = null
    if (params.myProjects === 'true' || params.myClaims === 'true') {
      try {
        const session = await auth.api.getSession({
          headers: request.headers
        })
        currentUserId = session?.user?.id || null
        
        if (!currentUserId) {
          return NextResponse.json(
            { error: "需要登录才能查询个人项目" },
            { status: 401 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          { error: "认证失败" },
          { status: 401 }
        )
      }
    }

    // 构建查询条件
    const where: any = {}

    // 基础筛选条件
    if (params.category) {
      where.category = params.category
    }
    
    if (params.distributionMode) {
      where.distributionMode = params.distributionMode
    }
    
    if (params.status) {
      where.status = params.status
    }
    
    if (params.isPublic !== undefined) {
      where.isPublic = params.isPublic === 'true'
    }
    
    if (params.requireLinuxdo !== undefined) {
      where.requireLinuxdo = params.requireLinuxdo === 'true'
    }
    
    if (params.tagId) {
      where.tagId = params.tagId
    }

    // 关键词搜索
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
              status: 'approved'
            }
          }
        }
      ]
    }

    // 构建排序条件
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    const validSortFields = ['createdAt', 'claimedCount', 'totalQuota', 'name', 'updatedAt']
    const sortField = validSortFields.includes(params.sortBy!) ? params.sortBy : 'createdAt'
    const sortDirection = params.sortOrder === 'asc' ? 'asc' : 'desc'
    orderBy[sortField!] = sortDirection

    // 执行查询
    const [projects, totalCount] = await Promise.all([
      prisma.shareProject.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tag: true,
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

    // 处理返回数据
    const processedProjects = projects.map((project: ProjectWithIncludes) => {
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
        tag: project.tag,
        usageUrl: project.usageUrl,
        totalQuota: project.totalQuota,
        claimedCount: actualClaimedCount,
        remainingQuota,
        tutorial: project.tutorial,
        distributionMode: project.distributionMode,
        isPublic: project.isPublic,
        startTime: project.startTime,
        endTime: project.endTime,
        requireLinuxdo: project.requireLinuxdo,
        minTrustLevel: project.minTrustLevel,
        minRiskThreshold: project.minRiskThreshold,
        status: currentStatus,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        hasPassword: !!project.claimPassword,
        claimPassword: project.claimPassword,
        creator: project.creator
      }
    })

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
          category: params.category,
          distributionMode: params.distributionMode,
          status: params.status,
          isPublic: params.isPublic,
          requireLinuxdo: params.requireLinuxdo,
          tagId: params.tagId,
          keyword: params.keyword
        },
        sort: {
          sortBy: sortField,
          sortOrder: sortDirection
        }
      }
    })

  } catch (error) {
    console.error("查询项目失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
}

// 获取项目分类列表
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'getCategories') {
      // 获取所有项目分类
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
      // 获取所有标签
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
      // 获取统计信息
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
      { error: "不支持的操作" },
      { status: 400 }
    )

  } catch (error) {
    console.error("获取数据失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
}
