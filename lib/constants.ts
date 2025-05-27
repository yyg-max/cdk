// 项目分类枚举映射
export const PROJECT_CATEGORIES = {
  AI: "人工智能",
  SOFTWARE: "软件工具", 
  GAME: "游戏娱乐",
  EDUCATION: "教育学习",
  RESOURCE: "资源分享",
  LIFE: "生活服务",
  OTHER: "其他"
} as const

// 分发模式枚举映射
export const DISTRIBUTION_MODES = {
  SINGLE: "SINGLE",
  MULTI: "MULTI", 
  MANUAL: "MANUAL"
} as const

// 项目状态枚举映射
export const PROJECT_STATUS = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED"
} as const

// 申请状态枚举映射
export const APPLICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const

// 获取项目分类选项数组
export const getCategoryOptions = () => {
  return Object.entries(PROJECT_CATEGORIES).map(([key, label]) => ({
    value: key,
    label
  }))
}

// 获取项目分类标签
export const getCategoryLabel = (category: keyof typeof PROJECT_CATEGORIES) => {
  return PROJECT_CATEGORIES[category] || category
}

// 分发模式选项
export const getDistributionModeOptions = () => [
  { 
    value: DISTRIBUTION_MODES.SINGLE, 
    label: "一码一用", 
    description: "一个邀请码一人使用"
  },
  { 
    value: DISTRIBUTION_MODES.MULTI, 
    label: "一码多用", 
    description: "一个邀请码多人使用"
  },
  { 
    value: DISTRIBUTION_MODES.MANUAL, 
    label: "申请-邀请", 
    description: "用户申请后发放"
  }
]

// 前端显示用的分发模式映射（用于兼容前端组件）
export const DISTRIBUTION_MODE_DISPLAY = {
  SINGLE: "single",
  MULTI: "multi",
  MANUAL: "manual"
} as const

// 项目状态选项
export const getProjectStatusOptions = () => [
  { value: PROJECT_STATUS.ACTIVE, label: "活跃" },
  { value: PROJECT_STATUS.PAUSED, label: "暂停" },
  { value: PROJECT_STATUS.COMPLETED, label: "已完成" },
  { value: PROJECT_STATUS.EXPIRED, label: "已过期" }
]

// 申请状态选项
export const getApplicationStatusOptions = () => [
  { value: APPLICATION_STATUS.PENDING, label: "申请中" },
  { value: APPLICATION_STATUS.APPROVED, label: "已通过" },
  { value: APPLICATION_STATUS.REJECTED, label: "已拒绝" }
] 