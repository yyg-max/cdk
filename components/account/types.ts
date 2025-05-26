// 扩展用户类型以包含数据库中的额外字段
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