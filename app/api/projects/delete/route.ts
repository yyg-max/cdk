import { NextResponse, NextRequest } from "next/server"
import { authenticateUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import type { ProjectDeleteResponse } from "@/components/project/read/types"

/**
 * 删除项目API
 * 
 * @description 批量删除用户创建的项目，但不允许删除已被用户领取的项目
 * 
 * @param req - Next.js请求对象，包含要删除的项目ID数组
 * @returns Promise<NextResponse<ProjectDeleteResponse>> - 删除结果响应
 * 
 * @example
 * // 请求体
 * {
 *   "projectIds": ["proj_123", "proj_456"]
 * }
 * 
 * // 响应体
 * {
 *   "success": true,
 *   "data": {
 *     "deletedCount": 2
 *   },
 *   "message": "成功删除 2 个项目"
 * }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse<ProjectDeleteResponse>> {
  try {
    // 使用统一的认证中间件
    const authResult = await authenticateUser(req)
    
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error || "认证失败" 
        }, 
        { status: authResult.status || 401 }
      )
    }
    
    const userId = authResult.userId!

    // 解析请求体，使用类型安全的方式
    let requestBody: unknown
    try {
      requestBody = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "请求体格式无效" },
        { status: 400 }
      )
    }

    // 类型安全的请求数据验证
    if (!requestBody || typeof requestBody !== 'object' || requestBody === null) {
      return NextResponse.json(
        { success: false, error: "请求体不能为空" },
        { status: 400 }
      )
    }

    const body = requestBody as Record<string, unknown>
    const { projectIds } = body

    // 验证 projectIds 参数
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供有效的项目ID列表" },
        { status: 400 }
      )
    }

    // 验证所有 projectIds 都是字符串
    if (!projectIds.every((id): id is string => typeof id === 'string')) {
      return NextResponse.json(
        { success: false, error: "项目ID必须为字符串类型" },
        { status: 400 }
      )
    }

    // 检查用户是否有权限删除这些项目，并获取领取统计信息
    const projects = await prisma.shareProject.findMany({
      where: {
        id: { in: projectIds },
      },
      select: {
        id: true,
        creatorId: true,
        name: true,
        distributionMode: true,
        // 获取已领取和申请记录的计数，用于检查是否有用户已领取
        _count: {
          select: {
            singleCodeClaims: {
              where: { isClaimed: true }
            },
            multiCodeClaims: true,
            manualApplications: {
              where: { status: "APPROVED" }
            }
          }
        }
      },
    })

    // 过滤出用户有权限删除的项目
    const authorizedProjects = projects.filter(project => project.creatorId === userId)
    
    if (authorizedProjects.length === 0) {
      return NextResponse.json(
        { success: false, error: "您没有权限删除指定的项目" },
        { status: 403 }
      )
    }

    // 检查哪些项目有已领取的记录
    const projectsWithClaims = authorizedProjects.filter(
      project => 
        project._count.singleCodeClaims > 0 || 
        project._count.multiCodeClaims > 0 || 
        project._count.manualApplications > 0
    )

    // 如果所有请求删除的项目都有已领取记录，则拒绝删除
    if (projectsWithClaims.length === authorizedProjects.length) {
      return NextResponse.json(
        { 
          success: false, 
          error: "无法删除这些项目，因为它们已经被用户领取或申请通过。如需停用，请将项目状态设置为已完成或已过期。" 
        },
        { status: 400 }
      )
    }

    // 获取可以安全删除的项目ID（没有已领取记录的项目）
    const safeToDeleteProjectIds = authorizedProjects
      .filter(project => 
        project._count.singleCodeClaims === 0 && 
        project._count.multiCodeClaims === 0 && 
        project._count.manualApplications === 0
      )
      .map(project => project.id)

    // 计算统计信息
    const unauthorizedCount = projectIds.length - authorizedProjects.length
    const hasClaimsCount = authorizedProjects.length - safeToDeleteProjectIds.length

    // 如果没有可以安全删除的项目，则返回错误
    if (safeToDeleteProjectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "所有选中的项目都已被用户领取或申请通过，无法删除。如需停用，请将项目状态设置为已完成或已过期。"
      }, { status: 400 })
    }

    // 使用数据库事务处理删除操作
    const deleteResult = await prisma.$transaction(async (tx) => {
      // 对于每个可以安全删除的项目，删除相关联数据
      for (const projectId of safeToDeleteProjectIds) {
        // 1. 删除未领取的一码一用邀请码
        await tx.singleCodeClaim.deleteMany({
          where: {
            projectId,
            isClaimed: false // 只删除未被领取的
          }
        })

        // 2. 删除项目标签关联
        await tx.projectsOnTags.deleteMany({
          where: {
            projectId
          }
        })

        // 3. 删除项目本身
        await tx.shareProject.delete({
          where: {
            id: projectId
          }
        })
      }

      return safeToDeleteProjectIds.length
    })

    // 构建响应消息
    const messages: string[] = [`成功删除 ${deleteResult} 个项目`]
    if (unauthorizedCount > 0) {
      messages.push(`${unauthorizedCount} 个项目因权限不足未删除`)
    }
    if (hasClaimsCount > 0) {
      messages.push(`${hasClaimsCount} 个项目因已被领取或申请通过而跳过删除`)
    }

    // 返回删除结果
    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleteResult,
        ...(unauthorizedCount > 0 && { unauthorizedCount }),
        ...(hasClaimsCount > 0 && { skippedCount: hasClaimsCount })
      },
      message: messages.join('，')
    })
    
  } catch (error) {
    console.error("删除项目失败:", error)
    const errorMessage = error instanceof Error ? error.message : "删除项目时发生未知错误"
    return NextResponse.json(
      { success: false, error: "删除项目时发生错误", message: errorMessage },
      { status: 500 }
    )
  }
}
