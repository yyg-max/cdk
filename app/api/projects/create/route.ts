import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { authenticateUser } from "@/lib/auth-utils"
import type { ProjectCategory, DistributionMode } from "@prisma/client"
import { CreateProjectRequest, CreateProjectResponse } from "@/components/project/create/types"

/**
 * 单个邀请码记录接口
 */
interface SingleCodeData {
  readonly content: string
  readonly contentHash: string
  readonly projectId: string
  readonly isClaimed: boolean
}

/**
 * 生成邀请码哈希值
 * @param content - 邀请码内容
 * @returns SHA256 哈希值
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * 批量创建一码一用记录（优化版本）
 * @param projectId - 项目ID
 * @param inviteCodes - 邀请码列表
 * @returns 创建的邀请码数量
 */
async function createSingleCodeClaimsOptimized(projectId: string, inviteCodes: string[]): Promise<number> {
  // 预处理：生成哈希值和去重
  const uniqueCodes = [...new Set(inviteCodes)]
  const codeData: SingleCodeData[] = uniqueCodes.map(code => ({
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
 * 项目创建 API 路由
 * POST /api/projects/create
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json()
    
    // 数据验证
    const validationError = validateProjectData(body)
    if (validationError) {
      return NextResponse.json<CreateProjectResponse>(
        { 
          success: false,
          message: "数据验证失败",
          error: "数据验证失败", 
          details: validationError 
        },
        { status: 400 }
      )
    }

    // 统一认证检查
    const authResult = await authenticateUser(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json<CreateProjectResponse>(
        { 
          success: false,
          message: authResult.error || "用户未登录或认证失败",
          error: authResult.error || "用户未登录或认证失败" 
        },
        { status: authResult.status || 401 }
      )
    }

    const creatorId = authResult.userId

    // 处理多个标签
    const tagIds: string[] = []
    if (body.selectedTags && body.selectedTags.length > 0) {
      // 处理所有选择的标签
      for (const tagName of body.selectedTags) {
        // 查找或创建每个标签
        let tag = await prisma.projectTag.findUnique({
          where: { name: tagName }
        })
        
        if (!tag) {
          tag = await prisma.projectTag.create({
            data: { name: tagName }
          })
        }
        
        tagIds.push(tag.id)
      }
    }

    // 处理密码加密
    let hashedPassword: string | null = null
    if (body.claimPassword) {
      hashedPassword = await bcrypt.hash(body.claimPassword, 12)
    }

    // 处理邀请码数据
    let inviteCodesJson: string | null = null

    if (body.distributionMode === "SINGLE" && body.inviteCodes) {
      inviteCodesJson = JSON.stringify(body.inviteCodes)
    } else if (body.distributionMode === "MULTI" && body.singleInviteCode) {
      inviteCodesJson = JSON.stringify([body.singleInviteCode])
    }

    // 创建项目
    const project = await prisma.shareProject.create({
      data: {
        // 基本信息
        name: body.name,
        description: body.description || "",
        category: body.category as ProjectCategory,
        // 标签关系会在后面创建
        usageUrl: body.usageUrl,
        totalQuota: body.totalQuota,
        tutorial: body.tutorial,
        
        // 分发内容
        distributionMode: body.distributionMode as DistributionMode,
        isPublic: body.isPublic,
        claimPassword: hashedPassword,
        inviteCodes: inviteCodesJson,
        question1: body.question1,
        question2: body.question2,
        
        // 领取限制
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        requireLinuxdo: body.requireLinuxdo,
        minTrustLevel: body.minTrustLevel,
        minRiskThreshold: body.minRiskThreshold,
        
        // 元数据
        creatorId: creatorId
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
            email: true
          }
        }
      }
    })
    
    // 创建项目与标签的关联关系
    if (tagIds.length > 0) {
      await Promise.all(
        tagIds.map(tagId => 
          prisma.projectsOnTags.create({
            data: {
              projectId: project.id,
              tagId: tagId
            }
          })
        )
      )
      
      // 重新查询项目以获取最新的标签关系
      const updatedProject = await prisma.shareProject.findUnique({
        where: { id: project.id },
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
              email: true
            }
          }
        }
      })
      
      if (updatedProject) {
        Object.assign(project, updatedProject)
      }
    }

    // 根据分发模式创建相应的记录
    if (body.distributionMode === "SINGLE" && body.inviteCodes) {
      // 一码一用：使用优化的批量创建方法
      const createdCount = await createSingleCodeClaimsOptimized(project.id, body.inviteCodes)
      console.log(`一码一用模式：已创建 ${createdCount} 个邀请码记录`)
    } 
    // 一码多用模式：邀请码存储在项目的inviteCodes字段中，用户领取时才创建MultiCodeClaim记录
    // 手动邀请模式：用户申请时才创建ManualApplication记录

    return NextResponse.json<CreateProjectResponse>({
      success: true,
      message: "项目创建成功",
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        category: project.category,
        distributionMode: project.distributionMode,
        totalQuota: project.totalQuota,
        isPublic: project.isPublic,
        createdAt: project.createdAt.toISOString(),
        tags: project.tags.map(tagRelation => ({
          id: tagRelation.tag.id,
          name: tagRelation.tag.name
        })),
        creator: {
          id: project.creator.id,
          name: project.creator.name,
          email: project.creator.email
        }
      }
    })

  } catch (error) {
    console.error("创建项目失败:", error)
    
    // 处理Prisma错误
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json<CreateProjectResponse>(
          { 
            success: false,
            message: "项目名称已存在，请使用其他名称",
            error: "项目名称已存在，请使用其他名称" 
          },
          { status: 409 }
        )
      }
    }

    return NextResponse.json<CreateProjectResponse>(
      { 
        success: false,
        message: "服务器内部错误，请稍后重试",
        error: "服务器内部错误，请稍后重试" 
      },
      { status: 500 }
    )
  }
}

/**
 * 数据验证函数
 * @param data - 项目创建请求数据
 * @returns 验证错误信息，无错误时返回 null
 */
function validateProjectData(data: CreateProjectRequest): string | null {
  // 基本信息验证
  if (!data.name || data.name.trim().length === 0) {
    return "项目名称不能为空"
  }
  if (data.name.length > 16) {
    return "项目名称不能超过16个字符"
  }
  if (data.description && data.description.length > 64) {
    return "项目描述不能超过64个字符"
  }
  if (!data.category) {
    return "项目分类不能为空"
  }
  if (!data.totalQuota || data.totalQuota <= 0 || data.totalQuota > 1000) {
    return "分配名额必须在1-1000之间"
  }
  if (data.tutorial && data.tutorial.length > 256) {
    return "使用教程不能超过256个字符"
  }

  // 分发模式验证
  if (!["SINGLE", "MULTI", "MANUAL"].includes(data.distributionMode)) {
    return "分发模式无效"
  }

  // 一码一用模式验证
  if (data.distributionMode === "SINGLE") {
    if (!data.inviteCodes || data.inviteCodes.length === 0) {
      return "一码一用模式必须提供邀请码"
    }
    if (data.inviteCodes.length !== data.totalQuota) {
      return `邀请码数量(${data.inviteCodes.length})必须等于分配名额(${data.totalQuota})`
    }
  }

  // 一码多用模式验证
  if (data.distributionMode === "MULTI") {
    if (!data.singleInviteCode || data.singleInviteCode.trim().length === 0) {
      return "一码多用模式必须提供邀请码"
    }
  }

  // 手动邀请模式验证
  if (data.distributionMode === "MANUAL") {
    if (!data.question1 || data.question1.trim().length === 0) {
      return "手动邀请模式必须设置问题1"
    }
    if (data.question1.length > 16) {
      return "问题1不能超过16个字符"
    }
    if (data.question2 && data.question2.length > 16) {
      return "问题2不能超过16个字符"
    }
  }

  // 密码验证
  if (data.claimPassword && data.claimPassword.length < 6) {
    return "领取密码至少需要6位字符"
  }

  // 时间验证
  if (!data.startTime) {
    return "开始时间不能为空"
  }
  
  const startTime = new Date(data.startTime)
  if (isNaN(startTime.getTime())) {
    return "开始时间格式无效"
  }

  if (data.endTime) {
    const endTime = new Date(data.endTime)
    if (isNaN(endTime.getTime())) {
      return "结束时间格式无效"
    }
    if (endTime <= startTime) {
      return "结束时间必须晚于开始时间"
    }
  }

  // 信任等级验证
  if (data.requireLinuxdo) {
    if (![0, 1, 2, 3, 4].includes(data.minTrustLevel)) {
      return "信任等级必须在0-4之间"
    }
  }

  // 风控阈值验证
  if (!data.minRiskThreshold || data.minRiskThreshold < 30 || data.minRiskThreshold > 90) {
    return "风控阈值必须在30-90之间"
  }

  return null
}
