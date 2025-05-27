/**
 * 分发模式枚举类型
 */
export type DistributionModeEnum = 
  | 'SINGLE' 
  | 'MULTI' 
  | 'MANUAL'

/**
 * 项目状态枚举类型
 */
export type ProjectStatusEnum = 
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'EXPIRED'

/**
 * 标签类型定义
 */
export interface ProjectTag {
  id: string
  name: string
}

/**
 * 创建者类型定义
 */
export interface ProjectCreator {
  id: string
  name: string
  nickname?: string
  image?: string
}

/**
 * 项目类型定义
 */
export interface Project {
  id: string
  name: string
  description: string
  category: string
  tags?: ProjectTag[]
  usageUrl?: string
  totalQuota: number
  claimedCount: number
  remainingQuota: number
  tutorial?: string
  distributionMode: DistributionModeEnum
  isPublic: boolean
  startTime: string
  endTime?: string
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  status: ProjectStatusEnum
  createdAt: string
  updatedAt: string
  creator: ProjectCreator
  hasPassword?: boolean
  claimPassword?: string | null
  inviteCodes?: string | null
  question1?: string | null
  question2?: string | null
  isCreator?: boolean
  claimsData?: ProjectClaimsData
}

/**
 * 项目声明数据类型
 */
export interface ProjectClaimsData {
  singleCodeClaimsCount: number
  multiCodeClaimsCount: number
  manualApplicationsCount: number
  pendingApplicationsCount: number
  recentClaims: ProjectClaim[]
  hasMore: boolean
  totalCount: number
}

/**
 * 项目声明类型
 */
export interface ProjectClaim {
  id: string
  claimerId: string
  claimerName: string
  claimedAt: string
  type: 'single' | 'multi' | 'manual'
}

/**
 * 过滤器值类型
 */
export type FilterValue = string | 'all'

/**
 * 过滤器类型定义
 */
export interface Filters {
  category: FilterValue
  status: FilterValue
  distributionMode: FilterValue
  isPublic: FilterValue
  requireLinuxdo: FilterValue
  tagId: FilterValue
  keyword: string
}

/**
 * 可排序字段类型
 */
export type SortableField = 
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'name'
  | 'claimedCount'
  | 'totalQuota'

/**
 * 排序方向类型
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 排序类型定义
 */
export interface Sort {
  sortBy: SortableField
  sortOrder: SortDirection
}

/**
 * 分页类型定义
 */
export interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 项目信息组件Props
 */
export interface ProjectInfoProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
}

/**
 * 项目编辑组件Props
 */
export interface ProjectEditProps {
  project: Project
}

/**
 * 项目请求数据类型
 */
export interface ProjectRequestData {
  id: string
  name: string
  description: string
  category: string
  usageUrl?: string
  tutorial?: string
  status: string | ProjectStatusEnum
  startTime: Date
  endTime: Date | null
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  claimPassword?: string | null
  totalQuota?: number
  newInviteCodes?: string[]
  inviteCodes?: string
  question1?: string
  question2?: string | null
} 