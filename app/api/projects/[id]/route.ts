import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

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

// 转换项目数据格式
function transformProject(project: ProjectWithIncludes) {
  // 计算已领取数量
  let claimedCount = 0
  if (project.distributionMode === 'SINGLE') {
    claimedCount = project._count.singleCodeClaims
  } else if (project.distributionMode === 'MULTI') {
    claimedCount = project._count.multiCodeClaims
  } else if (project.distributionMode === 'MANUAL') {
    claimedCount = project._count.manualApplications
  }

  // 计算剩余名额
  const remainingQuota = Math.max(0, project.totalQuota - claimedCount)

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    category: project.category,
    distributionMode: project.distributionMode,
    totalQuota: project.totalQuota,
    claimedCount,
    remainingQuota,
    startTime: project.startTime.toISOString(),
    endTime: project.endTime?.toISOString() || null,
    status: project.status,
    isPublic: project.isPublic,
    requireLinuxdo: project.requireLinuxdo,
    minTrustLevel: project.minTrustLevel,
    hasPassword: !!project.claimPassword,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    creator: {
      id: project.creator.id,
      name: project.creator.name,
      nickname: project.creator.nickname,
      image: project.creator.image,
    },
    tags: project.tags.map(projectTag => ({
      id: projectTag.tag.id,
      name: projectTag.tag.name,
    }))
  }
}

/**
 * 获取项目详情 API
 * 
 * 此API用于项目分享页面，允许查看所有状态的项目：
 * - 公开/私有项目都可查看
 * - 活跃/非活跃状态都可查看
 * - 这是设计决定：分享链接应该始终有效，不受项目状态变更影响
 * 
 * @param request - NextRequest
 * @param params - 路由参数，包含项目ID
 * @returns 项目详情数据或错误信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: "缺少项目ID" },
        { status: 400 }
      )
    }

    // 查询项目详情 - 移除isPublic限制，允许查看所有状态的项目
    const project = await prisma.shareProject.findUnique({
      where: {
        id: projectId,
        // 注意：不再限制 isPublic，分享页面应支持查看所有项目
      },
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
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在" },
        { status: 404 }
      )
    }

    // 转换数据格式
    const transformedProject = transformProject(project)

    return NextResponse.json({
      success: true,
      data: transformedProject
    })

  } catch (error) {
    console.error("获取项目详情失败:", error)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
} 