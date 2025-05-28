/**
 * 账户模块类型定义
 */

/**
 * 扩展用户类型以包含数据库中的额外字段
 */
export interface ExtendedUser {
  id: string
  name: string
  nickname?: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  source?: string
  trustLevel?: number | null
  banned?: boolean
  banReason?: string | null
  autoupdate?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * 密码状态响应
 */
export interface PasswordStatusResponse {
  hasPassword: boolean
  isThirdPartyUser: boolean
  needsCurrentPassword: boolean
}

/**
 * API统一响应格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

/**
 * 账户组件通用属性
 */
export interface AccountComponentProps {
  user?: ExtendedUser
  onUpdateSuccess?: () => Promise<void>
} 