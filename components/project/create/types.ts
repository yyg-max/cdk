/**
 * 项目创建模块类型定义文件
 * 统一管理项目创建相关的所有类型定义
 */

import type { 
  ProjectCategory, 
  DistributionMode 
} from '../read/types'

// 重新导出类型以保持向后兼容性
export type { ProjectCategory, DistributionMode }

/**
 * 分发模式枚举类型
 * 与 Prisma schema 中的 DistributionMode 保持一致
 */
export type DistributionModeType = DistributionMode

/**
 * 项目分类枚举类型
 * 与 Prisma schema 中的 ProjectCategory 保持一致
 */
export type ProjectCategoryType = ProjectCategory

/**
 * 基本信息表单数据接口
 */
export interface BasicInfoFormData {
  name?: string
  description?: string
  category?: ProjectCategoryType
  selectedTags?: string[]
  usageUrl?: string
  totalQuota?: number
  tutorial?: string
}

/**
 * 分发内容表单数据接口
 */
export interface DistributionFormData {
  distributionMode?: DistributionModeType
  isPublic?: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
}

/**
 * 领取限制表单数据接口
 */
export interface ClaimRestrictionsFormData {
  startTime?: Date
  endTime?: Date | null
  requireLinuxdo?: boolean
  minTrustLevel?: number
  minRiskThreshold?: number
}

/**
 * 完整项目表单数据接口
 * 继承所有子表单数据
 */
export interface ProjectFormData 
  extends BasicInfoFormData, 
          DistributionFormData, 
          ClaimRestrictionsFormData {}

/**
 * 更新表单数据的通用类型
 * @template T 表单数据类型
 */
export type FormDataUpdater<T> = (data: Partial<T>) => void

/**
 * 信任等级定义接口
 */
export interface TrustLevel {
  readonly value: number
  readonly label: string
}

/**
 * 分发模式选项接口
 */
export interface DistributionModeOption {
  readonly value: DistributionModeType
  readonly label: string
  readonly description: string
}

/**
 * 组件通用属性接口
 */
export interface BaseComponentProps<T> {
  formData: T
  setFormData: FormDataUpdater<T>
}

/**
 * 基本信息组件属性接口
 */
export type BasicInfoProps = BaseComponentProps<BasicInfoFormData>

/**
 * 分发内容组件属性接口
 */
export interface DistributionContentProps extends BaseComponentProps<DistributionFormData> {
  readonly totalQuota: number
}

/**
 * 领取限制组件属性接口
 */
export type ClaimRestrictionsProps = BaseComponentProps<ClaimRestrictionsFormData>

/**
 * API 请求数据接口
 * 用于项目创建 API 的请求体
 */
export interface CreateProjectRequest {
  // 基本信息
  name: string
  description?: string
  category: ProjectCategoryType
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

/**
 * 项目创建响应数据接口
 * 与主 Project 接口保持结构一致性
 */
export interface CreateProjectResponseData {
  /** 项目唯一标识符 */
    id: string
  /** 项目名称 */
    name: string
  /** 项目描述 */
    description: string
  /** 项目分类（字符串形式） */
    category: string
  /** 分发模式（字符串形式） */
    distributionMode: string
  /** 总配额数量 */
    totalQuota: number
  /** 是否公开显示 */
    isPublic: boolean
  /** 创建时间 ISO 字符串 */
    createdAt: string
  /** 项目标签数组 */
  tags: Array<{
    /** 标签ID */
      id: string
    /** 标签名称 */
      name: string
  }>
  /** 项目创建者信息 */
    creator: {
    /** 用户ID */
      id: string
    /** 用户名 */
      name: string
    /** 用户邮箱 */
      email: string
    }
  }

/**
 * 项目标签接口
 * 用于创建模块的标签操作
 */
export interface CreateProjectTag {
  readonly id: string
  readonly name: string
}

/**
 * API 响应接口
 * 统一的 API 响应格式
 */
export interface CreateProjectResponse {
  success: boolean
  message: string
  data?: CreateProjectResponseData
  error?: string
  details?: string
}

/**
 * 表单验证结果接口
 */
export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  errors: string[]
} 