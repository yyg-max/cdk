/**
 * Share 项目模块统一类型定义文件
 * 
 * 本文件作为整个 Share 项目模块的核心类型定义，提供：
 * 1. 基于 Prisma 原生枚举的类型安全性
 * 2. 统一的 Project 接口，供所有子模块使用
 * 3. 完整的 API 请求/响应接口定义
 * 4. 通用组件属性接口
 * 
 * 其他模块的类型设计原则：
 * - components/project/edit/types.ts: 直接使用本文件的 Project 接口
 * - components/project/create/types.ts: 使用独立的表单数据接口，避免耦合
 * - 所有 Prisma 枚举类型统一从本文件导入
 */

import type { 
  ProjectCategory, 
  DistributionMode, 
  ProjectStatus
} from '@prisma/client'

// 重新导出 Prisma 原生类型，供其他模块使用
export type { 
  ProjectCategory, 
  DistributionMode, 
  ProjectStatus 
} from '@prisma/client'

/**
 * 项目标签类型定义
 * 用于项目分类和检索
 */
export interface ProjectTag {
  /** 标签唯一标识符 */
  readonly id: string
  /** 标签名称 */
  readonly name: string
}

/**
 * 项目创建者类型定义
 * 包含创建者的基本信息
 */
export interface ProjectCreator {
  /** 用户唯一标识符 */
  readonly id: string
  /** 用户名 */
  readonly name: string
  /** 用户昵称（可选） */
  readonly nickname?: string | null
  /** 用户头像URL（可选） */
  readonly image?: string | null
}

/**
 * 项目主要数据类型
 * 包含项目的完整信息
 */
export interface Project {
  /** 项目唯一标识符 */
  readonly id: string
  /** 项目名称 */
  readonly name: string
  /** 项目描述 */
  readonly description: string
  /** 项目分类，使用 Prisma 枚举类型 */
  readonly category: ProjectCategory
  /** 项目标签数组 */
  readonly tags?: readonly ProjectTag[]
  /** 使用地址URL（可选） */
  readonly usageUrl?: string | null
  /** 总配额数量 */
  readonly totalQuota: number
  /** 已领取数量 */
  readonly claimedCount: number
  /** 剩余配额数量 */
  readonly remainingQuota: number
  /** 使用教程（可选） */
  readonly tutorial?: string | null
  /** 分发模式，使用 Prisma 枚举类型 */
  readonly distributionMode: DistributionMode
  /** 是否公开显示 */
  readonly isPublic: boolean
  /** 开始时间 ISO 字符串 */
  readonly startTime: string
  /** 结束时间 ISO 字符串（可选） */
  readonly endTime?: string | null
  /** 是否需要 LinuxDo 认证 */
  readonly requireLinuxdo: boolean
  /** 最低信任等级要求 */
  readonly minTrustLevel: number
  /** 最低风险阈值要求 */
  readonly minRiskThreshold: number
  /** 项目状态，使用 Prisma 枚举类型 */
  readonly status: ProjectStatus
  /** 创建时间 ISO 字符串 */
  readonly createdAt: string
  /** 更新时间 ISO 字符串 */
  readonly updatedAt: string
  /** 项目创建者信息 */
  readonly creator: ProjectCreator
  /** 是否有领取密码 */
  readonly hasPassword?: boolean
  /** 领取密码（仅创建者可见） */
  readonly claimPassword?: string | null
  /** 邀请码内容（仅创建者可见） */
  readonly inviteCodes?: string | null
  /** 申请问题1（仅手动邀请模式） */
  readonly question1?: string | null
  /** 申请问题2（仅手动邀请模式） */
  readonly question2?: string | null
  /** 当前用户是否为项目创建者 */
  readonly isCreator?: boolean
  /** 项目声明统计数据（按需加载） */
  readonly claimsData?: ProjectClaimsData
}

/**
 * 项目声明统计数据类型
 * 包含项目的各种声明统计信息
 */
export interface ProjectClaimsData {
  /** 一码一用声明数量 */
  readonly singleCodeClaimsCount: number
  /** 一码多用声明数量 */
  readonly multiCodeClaimsCount: number
  /** 手动申请已批准数量 */
  readonly manualApplicationsCount: number
  /** 待处理申请数量 */
  readonly pendingApplicationsCount: number
  /** 最近声明记录列表 */
  readonly recentClaims: readonly ProjectClaim[]
  /** 是否还有更多记录 */
  readonly hasMore: boolean
  /** 总记录数 */
  readonly totalCount: number
}

/**
 * 项目声明记录类型
 * 表示用户领取项目的记录
 */
export interface ProjectClaim {
  /** 声明记录唯一标识符 */
  readonly id: string
  /** 领取者用户ID */
  readonly claimerId: string
  /** 领取者用户名（显示名称） */
  readonly claimerName: string
  /** 领取时间 ISO 字符串 */
  readonly claimedAt: string
  /** 领取类型：一码一用、一码多用或手动申请 */
  readonly type: 'single' | 'multi' | 'manual'
}

/**
 * 过滤器值类型
 * 表示过滤条件的值，可以是具体值或 'all' 表示全部
 */
export type FilterValue = string | 'all'

/**
 * 项目筛选条件类型
 * 用于项目列表的筛选功能
 */
export interface Filters {
  /** 项目分类筛选 */
  category: FilterValue
  /** 项目状态筛选 */
  status: FilterValue
  /** 分发模式筛选 */
  distributionMode: FilterValue
  /** 公开状态筛选 */
  isPublic: FilterValue
  /** 认证要求筛选 */
  requireLinuxdo: FilterValue
  /** 标签ID筛选 */
  tagId: FilterValue
  /** 关键词搜索 */
  keyword: string
}

/**
 * 可排序字段类型
 * 定义可用于排序的项目字段
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
 * 定义排序的方向
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 排序配置类型
 * 包含排序字段和方向
 */
export interface Sort {
  /** 排序字段 */
  sortBy: SortableField
  /** 排序方向 */
  sortOrder: SortDirection
}

/**
 * 分页信息类型
 * 包含分页的所有相关信息
 */
export interface Pagination {
  /** 当前页码（从1开始） */
  page: number
  /** 每页条目数量 */
  limit: number
  /** 总条目数量 */
  totalCount: number
  /** 总页数 */
  totalPages: number
  /** 是否有下一页 */
  hasNext: boolean
  /** 是否有上一页 */
  hasPrev: boolean
}

/**
 * 泛型基础组件属性接口
 * 为减少重复代码，提供通用的组件属性基础接口
 * 
 * @template T - 主要数据类型
 */
export interface BaseComponentProps<T> {
  /** 是否显示加载状态 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
  /** 主要数据 */
  data?: T | null
  /** 组件类名 */
  className?: string
}

/**
 * 项目信息详情组件属性
 * 继承基础组件属性并添加特定功能
 */
export interface ProjectInfoProps extends BaseComponentProps<Project> {
  /** 要显示的项目信息 */
  project: Project | null
  /** 对话框是否打开 */
  isOpen: boolean
  /** 关闭对话框的回调函数 */
  onClose: () => void
} 

/**
 * 项目列表组件属性
 * 用于项目列表的展示和交互
 */
export interface ProjectListProps extends BaseComponentProps<readonly Project[]> {
  /** 项目列表数据 */
  projects?: readonly Project[]
  /** 分页信息 */
  pagination?: Pagination
  /** 筛选条件 */
  filters?: Filters
  /** 排序配置 */
  sort?: Sort
  /** 筛选条件变更回调 */
  onFiltersChange?: (filters: Filters) => void
  /** 排序配置变更回调 */
  onSortChange?: (sort: Sort) => void
  /** 分页变更回调 */
  onPaginationChange?: (pagination: Pagination) => void
  /** 项目选择回调 */
  onProjectSelect?: (project: Project) => void
}

/**
 * API 响应基础接口
 * 所有 API 响应都应遵循此结构
 */
export interface BaseApiResponse<T = unknown> {
  /** 操作是否成功 */
  success: boolean
  /** 响应数据（成功时提供） */
  data?: T
  /** 错误信息（失败时提供） */
  error?: string
  /** 附加消息 */
  message?: string
}

/**
 * 项目搜索 API 响应数据类型
 */
export interface ProjectSearchResponseData {
  /** 项目列表 */
  projects: readonly Project[]
  /** 分页信息 */
  pagination: Pagination
  /** 当前筛选条件 */
  filters: Filters
  /** 当前排序配置 */
  sort: Sort
}

/**
 * 项目搜索 API 响应类型
 */
export type ProjectSearchResponse = BaseApiResponse<ProjectSearchResponseData>

/**
 * 项目状态 API 响应类型
 */
export type ProjectStatusResponse = BaseApiResponse<ProjectClaimsData>

/**
 * 项目删除 API 请求类型
 */
export interface ProjectDeleteRequest {
  /** 要删除的项目ID数组 */
  projectIds: readonly string[]
}

/**
 * 项目删除 API 响应数据类型
 */
export interface ProjectDeleteResponseData {
  /** 成功删除的项目数量 */
  deletedCount: number
  /** 因权限不足未删除的项目数量（可选） */
  unauthorizedCount?: number
  /** 因已被领取而跳过删除的项目数量（可选） */
  skippedCount?: number
}

/**
 * 项目删除 API 响应类型
 */
export type ProjectDeleteResponse = BaseApiResponse<ProjectDeleteResponseData> 