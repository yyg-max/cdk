import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import type { 
  Prisma, 
  ProjectCategory, 
  ProjectStatus 
} from "@prisma/client"

/**
 * 生成邀请码哈希值
 * 
 * @description 为邀请码生成 SHA-256 哈希值，用于快速查找和去重
 * @param content - 邀请码内容
 * @returns 哈希值字符串
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * 批量创建一码一用记录（优化版本）
 * 
 * @description 使用事务批量插入邀请码记录，确保数据一致性
 * @param projectId - 项目ID
 * @param inviteCodes - 邀请码数组
 * @returns 创建的记录数量
 */
async function createSingleCodeClaimsOptimized(
  projectId: string, 
  inviteCodes: readonly string[]
): Promise<number> {
  // 预处理：生成哈希值和去重
  const uniqueCodes = [...new Set(inviteCodes)]
  const codeData = uniqueCodes.map(code => ({
    content: code,
    contentHash: generateContentHash(code),
    projectId: projectId,
    isClaimed: false
  }))

  // 批量插入（使用事务确保一致性）
  await prisma.$transaction(async (tx) => {
    // 检查是否有重复的哈希值
    const existingHashes = await tx.singleCodeClaim.findMany({
      where: {
        projectId: projectId,
        contentHash: {
          in: codeData.map(item => item.contentHash)
        }
      },
      select: { contentHash: true }
    })

    const existingHashSet = new Set(existingHashes.map(item => item.contentHash))
    const newCodeData = codeData.filter(item => !existingHashSet.has(item.contentHash))

    if (newCodeData.length > 0) {
      // 使用createMany进行批量插入
      await tx.singleCodeClaim.createMany({
        data: newCodeData,
        skipDuplicates: true
      })
    }
  })

  return uniqueCodes.length
}

/**
 * 项目编辑 API - PUT 方法
 * 
 * @description 更新项目信息，支持基本信息、分发设置、领取限制等的修改
 * @param request - Next.js 请求对象
 * @returns Promise<NextResponse> - 更新结果
 * 
 * @example
 * PUT /api/projects/edit
 * {
 *   "id": "project-123",
 *   "name": "新项目名称",
 *   "description": "项目描述",
 *   "category": "AI",
 *   "status": "ACTIVE"
 * }
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取当前用户
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
    
    // 解析请求体
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
    
    // 验证项目ID
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json(
        { success: false, error: "缺少项目ID" },
        { status: 400 }
      )
    }
    
    // 查询项目并验证所有权
    const project = await prisma.shareProject.findUnique({
      where: { id: body.id },
      select: {
        id: true,
        creatorId: true,
        totalQuota: true,
        claimedCount: true,
        distributionMode: true,
        claimPassword: true,
        inviteCodes: true
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      )
    }
    
    // 验证用户是否是项目创建者
    if (project.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: "无权编辑此项目" },
        { status: 403 }
      )
    }
    
    // 构建更新数据
    const updateData: Prisma.ShareProjectUpdateInput = {}
    
    // 基本信息
    if (body.name !== undefined) updateData.name = body.name as string
    if (body.description !== undefined) updateData.description = body.description as string
    if (body.category !== undefined) updateData.category = body.category as ProjectCategory
    if (body.usageUrl !== undefined) updateData.usageUrl = (body.usageUrl as string) || null
    if (body.tutorial !== undefined) updateData.tutorial = (body.tutorial as string) || null
    
    // 数量限制
    const originalTotalQuota = project.totalQuota;
    let newInviteCodes: readonly string[] = [];
    
    if (body.totalQuota !== undefined) {
      const totalQuota = body.totalQuota as number
      const claimedCount = project.claimedCount || 0
      if (totalQuota < claimedCount) {
        return NextResponse.json(
          { success: false, error: `总数量不能小于已领取数量 ${claimedCount}` },
          { status: 400 }
        )
      }
      
      // 一码一用模式处理新增邀请码
      if (project.distributionMode === "SINGLE" && totalQuota > originalTotalQuota && body.newInviteCodes) {
        const additionalQuota = totalQuota - originalTotalQuota;
        const inviteCodes = body.newInviteCodes as string[]
        
        // 验证新增邀请码数量是否匹配新增配额
        if (inviteCodes.length !== additionalQuota) {
          return NextResponse.json(
            { success: false, error: `新增邀请码数量(${inviteCodes.length})与新增配额(${additionalQuota})不一致` },
            { status: 400 }
          )
        }
        
        newInviteCodes = inviteCodes;
        
        // 更新项目中存储的所有邀请码
        let existingCodes: string[] = [];
        if (project.inviteCodes) {
          try {
            existingCodes = JSON.parse(project.inviteCodes) as string[];
          } catch (e) {
            console.error("解析现有邀请码失败:", e);
            existingCodes = [];
          }
        }
        
        // 合并现有邀请码和新邀请码
        const allCodes = [...existingCodes, ...newInviteCodes];
        updateData.inviteCodes = JSON.stringify(allCodes);
      }
      
      updateData.totalQuota = totalQuota;
    } else if (body.newInviteCodes && project.distributionMode === "SINGLE") {
      // 如果只提供了新邀请码但没有提供totalQuota
      const inviteCodes = body.newInviteCodes as string[]
      const additionalQuota = inviteCodes.length;
      const newTotalQuota = originalTotalQuota + additionalQuota;
      
      updateData.totalQuota = newTotalQuota;
      newInviteCodes = inviteCodes;
      
      // 更新项目中存储的所有邀请码
      let existingCodes: string[] = [];
      if (project.inviteCodes) {
        try {
          existingCodes = JSON.parse(project.inviteCodes) as string[];
        } catch (e) {
          console.error("解析现有邀请码失败:", e);
          existingCodes = [];
        }
      }
      
      // 合并现有邀请码和新邀请码
      const allCodes = [...existingCodes, ...newInviteCodes];
      updateData.inviteCodes = JSON.stringify(allCodes);
    }
    
    // 可见性和密码
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic as boolean
    
    // 密码处理
    if (body.claimPassword !== undefined) {
      const claimPassword = body.claimPassword as string | null
      if (claimPassword) {
        // 加密新密码
        const hashedPassword = await bcrypt.hash(claimPassword, 10)
        updateData.claimPassword = hashedPassword
      } else {
        // 移除密码
        updateData.claimPassword = null
      }
    }
    
    // 邀请码（一码多用模式或手动邀请模式）
    if (body.inviteCodes !== undefined && project.distributionMode !== "SINGLE") {
      updateData.inviteCodes = body.inviteCodes as string
    }
    
    // 问题
    if (body.question1 !== undefined) updateData.question1 = (body.question1 as string) || null
    if (body.question2 !== undefined) updateData.question2 = (body.question2 as string) || null
    
    // 时间设置
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime as string)
    if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime as string) : null
    
    // 安全设置
    if (body.requireLinuxdo !== undefined) updateData.requireLinuxdo = body.requireLinuxdo as boolean
    if (body.minTrustLevel !== undefined) updateData.minTrustLevel = body.minTrustLevel as number
    if (body.minRiskThreshold !== undefined) updateData.minRiskThreshold = body.minRiskThreshold as number
    
    // 状态
    if (body.status !== undefined) updateData.status = body.status as ProjectStatus
    
    // 更新项目
    const updatedProject = await prisma.shareProject.update({
      where: { id: body.id as string },
      data: updateData,
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
    
    // 为一码一用模式创建新的邀请码记录
    if (newInviteCodes.length > 0 && project.distributionMode === "SINGLE") {
      const createdCount = await createSingleCodeClaimsOptimized(project.id, newInviteCodes);
      console.log(`一码一用模式：已添加 ${createdCount} 个新邀请码记录`);
    }
    
    // 计算实际领取数量
    const actualClaimedCount = updatedProject._count.singleCodeClaims + 
                             updatedProject._count.multiCodeClaims + 
                             updatedProject._count.manualApplications
    
    // 计算剩余名额
    const remainingQuota = Math.max(0, updatedProject.totalQuota - actualClaimedCount)
    
    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          category: updatedProject.category,
          tags: updatedProject.tags.map(tagRelation => ({
            id: tagRelation.tag.id,
            name: tagRelation.tag.name
          })),
          usageUrl: updatedProject.usageUrl,
          totalQuota: updatedProject.totalQuota,
          claimedCount: actualClaimedCount,
          remainingQuota,
          tutorial: updatedProject.tutorial,
          distributionMode: updatedProject.distributionMode,
          isPublic: updatedProject.isPublic,
          startTime: updatedProject.startTime.toISOString(),
          endTime: updatedProject.endTime?.toISOString() || null,
          requireLinuxdo: updatedProject.requireLinuxdo,
          minTrustLevel: updatedProject.minTrustLevel,
          minRiskThreshold: updatedProject.minRiskThreshold,
          status: updatedProject.status,
          createdAt: updatedProject.createdAt.toISOString(),
          updatedAt: updatedProject.updatedAt.toISOString(),
          hasPassword: !!updatedProject.claimPassword,
          creator: updatedProject.creator,
          isCreator: true,
          inviteCodes: updatedProject.inviteCodes,
          question1: updatedProject.question1,
          question2: updatedProject.question2
        }
      }
    })
    
  } catch (error) {
    console.error("编辑项目失败:", error)
    const errorMessage = error instanceof Error ? error.message : "编辑项目时发生未知错误"
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试", message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 获取项目详情 API - GET 方法
 * 
 * @description 获取项目详情信息，仅创建者可获取完整信息（包括邀请码等敏感数据）
 * @param request - Next.js 请求对象
 * @returns Promise<NextResponse> - 项目详情响应
 * 
 * @example
 * GET /api/projects/edit?id=project-123
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目ID" },
        { status: 400 }
      )
    }
    
    // 获取当前用户
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
    
    // 查询项目
    const project = await prisma.shareProject.findUnique({
      where: { id: projectId },
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
        { success: false, error: "项目不存在" },
        { status: 404 }
      )
    }
    
    // 检查用户是否为创建者
    const isCreator = project.creatorId === userId
    
    // 计算实际领取数量
    const actualClaimedCount = project._count.singleCodeClaims + 
                             project._count.multiCodeClaims + 
                             project._count.manualApplications
    
    // 计算剩余名额
    const remainingQuota = Math.max(0, project.totalQuota - actualClaimedCount)
    
    // 根据用户权限返回不同级别的信息
    const projectData = {
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
      startTime: project.startTime,
      endTime: project.endTime,
      requireLinuxdo: project.requireLinuxdo,
      minTrustLevel: project.minTrustLevel,
      minRiskThreshold: project.minRiskThreshold,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      hasPassword: !!project.claimPassword,
      creator: project.creator
    }
    
    // 仅对创建者返回完整信息
    if (isCreator) {
      return NextResponse.json({
        success: true,
        data: {
          project: {
            ...projectData,
            // 完整权限信息
            claimPassword: project.claimPassword,
            inviteCodes: project.inviteCodes,
            question1: project.question1,
            question2: project.question2,
            isCreator: true
          }
        }
      })
    } else {
      // 对非创建者返回基本信息
      return NextResponse.json({
        success: true,
        data: {
          project: {
            ...projectData,
            isCreator: false
          }
        }
      })
    }
    
  } catch (error) {
    console.error("获取项目详情失败:", error)
    const errorMessage = error instanceof Error ? error.message : "获取项目详情时发生未知错误"
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试", message: errorMessage },
      { status: 500 }
    )
  }
}
