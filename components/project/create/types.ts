// 项目类型定义文件

// 分发模式枚举类型
export type DistributionModeType = "SINGLE" | "MULTI" | "MANUAL"

// 基本信息表单数据
export interface BasicInfoFormData {
  name?: string
  description?: string
  category?: string
  selectedTags?: string[]
  usageUrl?: string
  totalQuota?: number
  tutorial?: string
}

// 分发内容表单数据
export interface DistributionFormData {
  distributionMode?: DistributionModeType
  isPublic?: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
}

// 领取限制表单数据
export interface ClaimRestrictionsFormData {
  startTime?: Date
  endTime?: Date | null
  requireLinuxdo?: boolean
  minTrustLevel?: number
  minRiskThreshold?: number
}

// 完整项目表单数据
export interface ProjectFormData extends BasicInfoFormData, DistributionFormData, ClaimRestrictionsFormData {}

// 组件props接口
export interface BasicInfoProps {
  formData: BasicInfoFormData
  setFormData: (data: BasicInfoFormData) => void
}

export interface DistributionContentProps {
  formData: DistributionFormData
  setFormData: (data: DistributionFormData) => void
  totalQuota: number
}

export interface ClaimRestrictionsProps {
  formData: ClaimRestrictionsFormData
  setFormData: (data: ClaimRestrictionsFormData) => void
}

// 更新表单数据的通用类型
export type FormDataUpdater<T> = (data: T) => void

// 信任等级定义类型
export interface TrustLevel {
  value: number
  label: string
}

// 分发模式选项类型
export interface DistributionModeOption {
  value: DistributionModeType
  label: string
  description: string
}

// API请求数据类型定义
export interface CreateProjectRequest {
  // 基本信息
  name: string
  description?: string
  category: string
  selectedTags?: string[]
  usageUrl?: string
  totalQuota: number
  tutorial?: string
  
  // 分发内容
  distributionMode: DistributionModeType
  isPublic: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
  
  // 领取限制
  startTime: string // ISO 8601 格式
  endTime?: string | null
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
}

// API响应类型
export interface CreateProjectResponse {
  success: boolean
  message: string
  data?: {
    id: string
    name: string
    description: string
    category: string
    distributionMode: string
    totalQuota: number
    isPublic: boolean
    createdAt: string
    tags: {
      id: string
      name: string
    }[]
    creator: {
      id: string
      name: string
      email: string
    }
  }
  error?: string
  details?: string
} 