import { NextResponse, NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * 删除项目API
 * 
 * 请求体：
 * {
 *   projectIds: string[] // 要删除的项目ID数组
 * }
 * 
 * 响应：
 * {
 *   success: boolean,
 *   error?: string,
 *   data?: {
 *     deletedCount: number // 成功删除的项目数量
 *   }
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    // 使用Better Auth获取当前用户ID
    const session = await auth.api.getSession({
      headers: req.headers
    })
    
    // 检查用户是否已登录
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "未授权访问" }, { status: 401 })
    }
    
    // 获取用户ID
    const userId = session.user.id
    
    // 检查用户是否被禁用
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { banned: true, banReason: true }
    })
    
    if (user?.banned) {
      return NextResponse.json({ 
        success: false, 
        error: `账户已被禁用${user.banReason ? `: ${user.banReason}` : ''}` 
      }, { status: 403 })
    }

    // 解析请求体
    const body = await req.json()
    const { projectIds } = body

    // 验证请求参数
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供有效的项目ID列表" },
        { status: 400 }
      )
    }

    // 检查用户是否有权限删除这些项目
    const projects = await prisma.shareProject.findMany({
      where: {
        id: { in: projectIds },
      },
      select: {
        id: true,
        creatorId: true,
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

    // 如果有些项目用户无权限删除，记录下来
    const unauthorizedCount = projectIds.length - authorizedProjects.length
    // 记录有已领取记录无法删除的项目数量
    const hasClaimsCount = authorizedProjects.length - safeToDeleteProjectIds.length

    // 如果没有可以安全删除的项目，则返回错误
    if (safeToDeleteProjectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "所有选中的项目都已被用户领取或申请通过，无法删除。如需停用，请将项目状态设置为已完成或已过期。"
      }, { status: 400 })
    }

    // 使用事务处理删除操作
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

    // 返回删除结果
    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleteResult,
        unauthorizedCount: unauthorizedCount > 0 ? unauthorizedCount : undefined,
        skippedCount: hasClaimsCount > 0 ? hasClaimsCount : undefined
      },
      message: `成功删除 ${deleteResult} 个项目${
        unauthorizedCount > 0 ? `，${unauthorizedCount} 个项目因权限不足未删除` : ''
      }${
        hasClaimsCount > 0 ? `，${hasClaimsCount} 个项目因已被领取或申请通过而跳过删除` : ''
      }`
    })
  } catch (error) {
    console.error("删除项目失败:", error)
    return NextResponse.json(
      { success: false, error: "删除项目时发生错误" },
      { status: 500 }
    )
  }
}
