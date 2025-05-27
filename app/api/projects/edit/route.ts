import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import type { Prisma, ProjectCategory, DistributionMode, ProjectStatus } from "@prisma/client"

// 编辑项目请求类型
interface EditProjectRequest {
  id: string
  name?: string
  description?: string
  category?: string
  tagId?: string
  usageUrl?: string
  totalQuota?: number
  tutorial?: string
  distributionMode?: string
  isPublic?: boolean
  claimPassword?: string | null
  inviteCodes?: string | null
  newInviteCodes?: string[] // 新增的邀请码（一码一用模式）
  question1?: string | null
  question2?: string | null
  startTime?: Date
  endTime?: Date | null
  requireLinuxdo?: boolean
  minTrustLevel?: number
  minRiskThreshold?: number
  status?: string
}

// 生成邀请码哈希值
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// 批量创建一码一用记录（优化版本）
async function createSingleCodeClaimsOptimized(projectId: string, inviteCodes: string[]) {
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

export async function PUT(request: NextRequest) {
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
    const body: EditProjectRequest = await request.json()
    
    // 验证项目ID
    if (!body.id) {
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
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category as ProjectCategory
    // tagId已经改为多对多关系，需要单独处理
    if (body.usageUrl !== undefined) updateData.usageUrl = body.usageUrl || null
    if (body.tutorial !== undefined) updateData.tutorial = body.tutorial || null
    
    // 数量限制
    const originalTotalQuota = project.totalQuota;
    let newInviteCodes: string[] = [];
    
    if (body.totalQuota !== undefined) {
      const claimedCount = project.claimedCount || 0
      if (body.totalQuota < claimedCount) {
        return NextResponse.json(
          { success: false, error: `总数量不能小于已领取数量 ${claimedCount}` },
          { status: 400 }
        )
      }
      
      // 一码一用模式处理新增邀请码
      if (project.distributionMode === "SINGLE" && body.totalQuota > originalTotalQuota && body.newInviteCodes) {
        const additionalQuota = body.totalQuota - originalTotalQuota;
        
        // 验证新增邀请码数量是否匹配新增配额
        if (body.newInviteCodes.length !== additionalQuota) {
          return NextResponse.json(
            { success: false, error: `新增邀请码数量(${body.newInviteCodes.length})与新增配额(${additionalQuota})不一致` },
            { status: 400 }
          )
        }
        
        newInviteCodes = body.newInviteCodes;
        
        // 更新项目中存储的所有邀请码
        let existingCodes: string[] = [];
        if (project.inviteCodes) {
          try {
            existingCodes = JSON.parse(project.inviteCodes);
          } catch (e) {
            console.error("解析现有邀请码失败:", e);
            existingCodes = [];
          }
        }
        
        // 合并现有邀请码和新邀请码
        const allCodes = [...existingCodes, ...newInviteCodes];
        updateData.inviteCodes = JSON.stringify(allCodes);
      }
      
      updateData.totalQuota = body.totalQuota;
    } else if (body.newInviteCodes && project.distributionMode === "SINGLE") {
      // 如果只提供了新邀请码但没有提供totalQuota
      const additionalQuota = body.newInviteCodes.length;
      const newTotalQuota = originalTotalQuota + additionalQuota;
      
      updateData.totalQuota = newTotalQuota;
      newInviteCodes = body.newInviteCodes;
      
      // 更新项目中存储的所有邀请码
      let existingCodes: string[] = [];
      if (project.inviteCodes) {
        try {
          existingCodes = JSON.parse(project.inviteCodes);
        } catch (e) {
          console.error("解析现有邀请码失败:", e);
          existingCodes = [];
        }
      }
      
      // 合并现有邀请码和新邀请码
      const allCodes = [...existingCodes, ...newInviteCodes];
      updateData.inviteCodes = JSON.stringify(allCodes);
    }
    
    // 分发模式
    if (body.distributionMode !== undefined) {
      // 分发模式不能随意修改，需要检查是否已有领取
      if (project.distributionMode !== body.distributionMode && project.claimedCount > 0) {
        return NextResponse.json(
          { success: false, error: "已有用户领取，无法修改分发模式" },
          { status: 400 }
        )
      }
      updateData.distributionMode = body.distributionMode as DistributionMode
    }
    
    // 可见性和密码
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic
    
    // 密码处理
    if (body.claimPassword !== undefined) {
      if (body.claimPassword) {
        // 加密新密码
        const hashedPassword = await bcrypt.hash(body.claimPassword, 10)
        updateData.claimPassword = hashedPassword
      } else {
        // 移除密码
        updateData.claimPassword = null
      }
    }
    
    // 邀请码（一码多用模式或手动邀请模式）
    if (body.inviteCodes !== undefined && project.distributionMode !== "SINGLE") {
      updateData.inviteCodes = body.inviteCodes
    }
    
    // 问题
    if (body.question1 !== undefined) updateData.question1 = body.question1 || null
    if (body.question2 !== undefined) updateData.question2 = body.question2 || null
    
    // 时间设置
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime)
    if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime) : null
    
    // 安全设置
    if (body.requireLinuxdo !== undefined) updateData.requireLinuxdo = body.requireLinuxdo
    if (body.minTrustLevel !== undefined) updateData.minTrustLevel = body.minTrustLevel
    if (body.minRiskThreshold !== undefined) updateData.minRiskThreshold = body.minRiskThreshold
    
    // 状态
    if (body.status !== undefined) updateData.status = body.status as ProjectStatus
    
    // 更新项目
    const updatedProject = await prisma.shareProject.update({
      where: { id: body.id },
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
        }
      }
    })
    
    // 为一码一用模式创建新的邀请码记录
    if (newInviteCodes.length > 0 && project.distributionMode === "SINGLE") {
      const createdCount = await createSingleCodeClaimsOptimized(project.id, newInviteCodes);
      console.log(`一码一用模式：已添加 ${createdCount} 个新邀请码记录`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        project: {
          ...updatedProject,
          hasPassword: !!updatedProject.claimPassword
        }
      }
    })
    
  } catch (error) {
    console.error("编辑项目失败:", error)
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
}

// 获取项目详情（仅创建者可获取完整信息，包括邀请码等）
export async function GET(request: NextRequest) {
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
    return NextResponse.json(
      { success: false, error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
}
