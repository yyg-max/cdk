import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ProjectCategory, DistributionMode, Prisma } from "@prisma/client"
import { CreateProjectRequest, CreateProjectResponse } from "@/components/project/create/types"

// 定义 Prisma 查询结果类型
type ProjectWithIncludes = Prisma.ShareProjectGetPayload<{
  include: {
    tag: true
    creator: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

// 单个邀请码记录类型
interface SingleCodeData {
  content: string
  contentHash: string
  projectId: string
  isClaimed: boolean
}

// 生成邀请码哈希值
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// 批量创建一码一用记录（优化版本）
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

    // 获取当前用户ID
    const creatorId = await getCurrentUserId(request)
    if (!creatorId) {
      return NextResponse.json<CreateProjectResponse>(
        { 
          success: false,
          message: "用户未登录或认证失败",
          error: "用户未登录或认证失败" 
        },
        { status: 401 }
      )
    }

    // 处理标签
    let tagId: string | null = null
    if (body.selectedTags && body.selectedTags.length > 0) {
      // 使用第一个标签，如果有多个标签可以考虑其他处理方式
      const tagName = body.selectedTags[0]
      
      // 查找或创建标签
      let tag = await prisma.projectTag.findUnique({
        where: { name: tagName }
      })
      
      if (!tag) {
        tag = await prisma.projectTag.create({
          data: { name: tagName }
        })
      }
      
      tagId = tag.id
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
    const project: ProjectWithIncludes = await prisma.shareProject.create({
      data: {
        // 基本信息
        name: body.name,
        description: body.description || "",
        category: body.category as ProjectCategory,
        tagId: tagId,
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
        tag: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

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
        tag: project.tag ? {
          id: project.tag.id,
          name: project.tag.name
        } : undefined,
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

// 数据验证函数
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

// 使用Better Auth获取当前用户ID
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    // 使用Better Auth的getSession方法获取当前session
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    // 检查session是否存在且有效
    if (session?.user?.id) {
      // 检查用户是否被禁用
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { banned: true, banReason: true }
      })
      
      if (user?.banned) {
        console.log(`用户 ${session.user.id} 已被禁用: ${user.banReason || '无原因'}`)
        return null
      }
      
      return session.user.id
    }
    
    return null
    
  } catch (error) {
    console.error("获取用户session失败:", error)
    return null
  }
}
