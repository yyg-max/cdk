/**
 * Linux Do用户个人资料接口
 */
export interface LinuxDoProfile {
  id: number | string;
  email: string;
  username: string;
  name: string;
  avatar_url: string;
  trust_level?: number;
}

/**
 * 系统用户接口
 */
export interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  emailVerified: boolean;
  source: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  banned: boolean;
  banReason?: string;
  trustLevel?: number;
  autoupdate: boolean;
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  error: string;
  banned?: boolean;
}

/**
 * 认证表单错误消息映射
 */
export interface ErrorMessages {
  [key: string]: string;
}

/**
 * 用户更新响应接口
 */
export interface UserUpdateResponse {
  success: boolean;
  message: string;
  user: {
    nickname?: string;
    image?: string;
    trustLevel?: number;
    updatedAt: Date;
  };
} 