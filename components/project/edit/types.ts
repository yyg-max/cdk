import type { 
  Project,
  ProjectCategory, 
  DistributionMode, 
  ProjectStatus
} from '../read/types'

/**
 * 项目编辑组件属性接口
 */
export interface ProjectEditProps {
  /** 要编辑的项目数据 */
  readonly project: Project
}

/**
 * 基本信息编辑表单数据接口
 */
export interface BasicInfoFormData {
  /** 项目名称 */
  name: string
  /** 项目描述 */
  description: string
  /** 项目分类 */
  category: ProjectCategory
  /** 使用地址 */
  usageUrl: string
  /** 使用教程 */
  tutorial: string
  /** 项目状态 */
  status: ProjectStatus
}

/**
 * 基本信息编辑组件属性接口
 */
export interface EditBasicInfoProps {
  /** 表单数据 */
  formData: BasicInfoFormData
  /** 更新表单数据的回调函数 */
  setFormData: (data: Partial<BasicInfoFormData>) => void
}

/**
 * 分发内容编辑表单数据接口
 */
export interface DistributionContentFormData {
  /** 分发模式（不可编辑） */
  readonly distributionMode: DistributionMode
  /** 密码选项：keep(保持)、new(新密码)、none(无密码) */
  passwordOption: 'keep' | 'new' | 'none'
  /** 新密码内容 */
  newPassword: string
  /** 单个邀请码（一码多用模式） */
  singleInviteCode: string
  /** 新增邀请码列表（一码一用模式） */
  newInviteCodes: string
  /** 申请问题1 */
  question1: string
  /** 申请问题2 */
  question2: string
  /** 新增配额数量 */
  additionalQuota: number
  /** 当前总配额 */
  readonly totalQuota: number
}

/**
 * 分发内容编辑组件属性接口
 */
export interface EditDistributionContentProps {
  /** 表单数据 */
  formData: DistributionContentFormData
  /** 更新表单数据的回调函数 */
  setFormData: (data: Partial<DistributionContentFormData>) => void
  /** 项目信息 */
  readonly project: Project
}

/**
 * 领取限制编辑表单数据接口
 */
export interface ClaimRestrictionsFormData {
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date | null
  /** 是否需要 LinuxDo 认证 */
  requireLinuxdo: boolean
  /** 最低信任等级 */
  minTrustLevel: number
  /** 最低风险阈值 */
  minRiskThreshold: number
}

/**
 * 领取限制编辑组件属性接口
 */
export interface EditClaimRestrictionsProps {
  /** 表单数据 */
  formData: ClaimRestrictionsFormData
  /** 更新表单数据的回调函数 */
  setFormData: (data: Partial<ClaimRestrictionsFormData>) => void
}

/**
 * 项目更新请求数据接口
 * 用于 API 请求
 */
export interface ProjectUpdateRequest {
  /** 项目ID */
  readonly id: string
  /** 项目名称 */
  name?: string
  /** 项目描述 */
  description?: string
  /** 项目分类 */
  category?: ProjectCategory
  /** 使用地址 */
  usageUrl?: string | null
  /** 使用教程 */
  tutorial?: string | null
  /** 项目状态 */
  status?: ProjectStatus
  /** 开始时间 */
  startTime?: Date
  /** 结束时间 */
  endTime?: Date | null
  /** 是否需要 LinuxDo 认证 */
  requireLinuxdo?: boolean
  /** 最低信任等级 */
  minTrustLevel?: number
  /** 最低风险阈值 */
  minRiskThreshold?: number
  /** 领取密码 */
  claimPassword?: string | null
  /** 总配额 */
  totalQuota?: number
  /** 新增邀请码列表（一码一用模式） */
  newInviteCodes?: readonly string[]
  /** 邀请码内容（一码多用模式） */
  inviteCodes?: string | null
  /** 申请问题1 */
  question1?: string | null
  /** 申请问题2 */
  question2?: string | null
}

/**
 * 项目更新响应数据接口
 */
export interface ProjectUpdateResponse {
  /** 操作是否成功 */
  success: boolean
  /** 更新后的项目数据 */
  data?: {
    project: Project
  }
  /** 错误信息 */
  error?: string
  /** 附加消息 */
  message?: string
}

/**
 * 标签页配置接口
 */
export interface TabOption {
  /** 标签页ID */
  readonly id: string
  /** 标签页标题 */
  readonly title: string
  /** 标签页图标组件 */
  readonly icon: React.ComponentType<{ className?: string }>
} 