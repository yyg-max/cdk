"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, CheckCircle, AlertCircle, Check, X } from "lucide-react"
import { toast } from "sonner"
import { BasicInfo } from "./create/basic-info"
import { DistributionContent } from "./create/distribution-content"
import { ClaimRestrictions } from "./create/claim-restrictions"
import { 
  ProjectFormData, 
  CreateProjectRequest, 
  CreateProjectResponse, 
  DistributionModeType 
} from "./create/types"

/**
 * 标签页选项接口
 */
interface TabOption {
  readonly id: string
  readonly title: string
  readonly icon: React.ElementType
}

/**
 * 表单验证状态类型
 */
type ValidationStatus = {
  isValid: boolean
  missingFields: string[]
}

/**
 * 项目创建主组件
 * 统一管理项目创建流程的所有步骤
 */
export function ProjectCreate() {
  const [activeTab, setActiveTab] = useState<string>("basic")
  const [formData, setFormData] = useState<ProjectFormData>({
    category: "AI",
    totalQuota: 10,
    distributionMode: "SINGLE",
    isPublic: true,
    startTime: new Date(),
    endTime: null,
    requireLinuxdo: true,
    minTrustLevel: 2,
    minRiskThreshold: 80
  })

  /**
   * 标签页配置
   */
  const tabs: readonly TabOption[] = [
    {
      id: "basic",
      title: "基本信息",
      icon: Info
    },
    {
      id: "distribution",
      title: "分发内容",
      icon: CheckCircle
    },
    {
      id: "restrictions",
      title: "领取限制",
      icon: AlertCircle
    }
  ] as const

  /**
   * 验证基本信息部分
   * @returns 是否验证通过
   */
  const validateBasicInfo = (): boolean => {
    return !!(formData.name && formData.category && formData.totalQuota && formData.totalQuota > 0)
  }

  /**
   * 验证分发内容部分
   * @returns 是否验证通过
   */
  const validateDistribution = (): boolean => {
    const mode = formData.distributionMode as DistributionModeType
    
    if (mode === "SINGLE") {
      return !!(formData.inviteCodes && formData.inviteCodes.length === formData.totalQuota)
    } else if (mode === "MULTI") {
      return !!formData.singleInviteCode
    } else if (mode === "MANUAL") {
      return !!formData.question1
    }
    return false
  }

  /**
   * 验证领取限制部分
   * @returns 是否验证通过
   */
  const validateRestrictions = (): boolean => {
    return !!(formData.startTime && formData.minRiskThreshold)
  }

  /**
   * 验证整个表单
   * @returns 验证状态
   */
  const validateForm = (): ValidationStatus => {
    const isValid = validateBasicInfo() && validateDistribution() && validateRestrictions()
    const missingFields = getMissingFields()
    
    return {
      isValid,
      missingFields
    }
  }

  /**
   * 获取缺失的必填字段信息
   * @returns 缺失字段数组
   */
  const getMissingFields = (): string[] => {
    const missing: string[] = []
    
    // 检查基本信息
    if (!formData.name) missing.push("项目名称")
    if (!formData.category) missing.push("项目分类")
    if (!formData.totalQuota || formData.totalQuota <= 0) missing.push("分配名额")
    
    // 检查分发内容
    const mode = formData.distributionMode as DistributionModeType
    
    if (mode === "SINGLE") {
      if (!formData.inviteCodes || formData.inviteCodes.length === 0) {
        missing.push("邀请码/链接")
      } else if (formData.inviteCodes.length !== formData.totalQuota) {
        missing.push(`邀请码数量不匹配（需要${formData.totalQuota}个，当前${formData.inviteCodes.length}个）`)
      }
    } else if (mode === "MULTI") {
      if (!formData.singleInviteCode) missing.push("邀请码/链接")
    } else if (mode === "MANUAL") {
      if (!formData.question1) missing.push("问题1")
    }
    
    // 检查领取限制
    if (!formData.startTime) missing.push("开始时间")
    if (!formData.minRiskThreshold) missing.push("风控阈值")
    
    return missing
  }

  /**
   * 获取标签页的验证状态
   * @param tabId - 标签页ID
   * @returns 是否验证通过
   */
  const getTabStatus = (tabId: string): boolean => {
    switch (tabId) {
      case "basic":
        return validateBasicInfo()
      case "distribution":
        return validateDistribution()
      case "restrictions":
        return validateRestrictions()
      default:
        return false
    }
  }

  /**
   * 提交表单创建项目
   */
  const handleSubmit = async (): Promise<void> => {
    const validation = validateForm()
    
    if (!validation.isValid) {
      toast.error("请完成所有必填项", {
        description: `缺少：${validation.missingFields.join("、")}`,
        duration: 4000,
      })
      return
    }

    try {
      // 检查必填字段
      if (!formData.name || !formData.category || !formData.distributionMode || 
          !formData.totalQuota || !formData.startTime) {
        throw new Error("缺少必填字段")
      }

      // 准备API请求数据
      const requestData: CreateProjectRequest = {
        // 基本信息
        name: formData.name,
        description: formData.description,
        category: formData.category,
        selectedTags: formData.selectedTags,
        usageUrl: formData.usageUrl,
        totalQuota: formData.totalQuota,
        tutorial: formData.tutorial,
        
        // 分发内容
        distributionMode: formData.distributionMode as DistributionModeType,
        isPublic: formData.isPublic ?? true,
        claimPassword: formData.claimPassword,
        inviteCodes: formData.inviteCodes,
        singleInviteCode: formData.singleInviteCode,
        question1: formData.question1,
        question2: formData.question2,
        
        // 领取限制
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime?.toISOString() || null,
        requireLinuxdo: formData.requireLinuxdo ?? true,
        minTrustLevel: formData.minTrustLevel ?? 2,
        minRiskThreshold: formData.minRiskThreshold ?? 80
      }

      console.log("提交表单数据:", requestData)
      
      // 调用API
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const result: unknown = await response.json()
      
      // 安全断言API响应
      if (typeof result !== 'object' || result === null) {
        throw new Error("API响应格式错误")
      }
      
      const typedResult = result as CreateProjectResponse

      if (!response.ok) {
        throw new Error(typedResult.error || typedResult.details || "创建失败")
      }
      
      toast.success("项目创建成功！", {
        description: `项目"${formData.name}"已成功创建`,
        duration: 3000,
      })
      
      // 可以在这里重置表单或跳转页面
      // setFormData(initialFormData)
      
    } catch (error) {
      console.error("创建项目失败:", error)
      const errorMessage = error instanceof Error ? error.message : "请检查网络连接或稍后重试"
      toast.error("项目创建失败", {
        description: errorMessage,
        duration: 4000,
      })
    }
  }

  /**
   * 渲染当前标签页内容
   * @returns 标签页组件
   */
  const renderTabContent = (): React.ReactNode => {
    switch (activeTab) {
      case "basic":
        return (
          <BasicInfo 
            formData={formData} 
            setFormData={(data) => setFormData({ ...formData, ...data })}
          />
        )
      case "distribution":
        return (
          <DistributionContent 
            formData={formData} 
            setFormData={(data) => setFormData({ ...formData, ...data })}
            totalQuota={formData.totalQuota || 10}
          />
        )
      case "restrictions":
        return (
          <ClaimRestrictions 
            formData={formData} 
            setFormData={(data) => setFormData({ ...formData, ...data })}
          />
        )
      default:
        return null
    }
  }

  const validation = validateForm()

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toggle Group 导航和创建按钮 */}
        <div className="flex items-center justify-between">
          <ToggleGroup type="single" value={activeTab} onValueChange={setActiveTab} className="justify-start">
            {tabs.map((tab) => {
              const isCompleted = getTabStatus(tab.id)
              const StatusIcon = isCompleted ? Check : X
              
              return (
                <ToggleGroupItem 
                  key={tab.id} 
                  value={tab.id}
                  className={`flex items-center space-x-1 px-3 py-2 ${
                    isCompleted 
                      ? "bg-green-100 text-green-800 hover:bg-green-200 data-[state=on]:bg-green-200" 
                      : "bg-red-100 text-red-800 hover:bg-red-200 data-[state=on]:bg-red-200"
                  }`}
                >
                  <StatusIcon className="w-4 h-4" />
                  <span>{tab.title}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          {/* 创建项目按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleSubmit}
                  disabled={!validation.isValid}
                  className="bg-black hover:bg-gray-800 text-white flex items-center space-x-1 disabled:opacity-50 px-3 py-2 h-auto text-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>创建项目</span>
                </Button>
              </div>
            </TooltipTrigger>
            {!validation.isValid && (
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium text-sm">请完成以下必填项：</p>
                  <ul className="text-xs space-y-0.5">
                    {validation.missingFields.map((item, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <span className="w-1 h-1 bg-current rounded-full"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* 当前标签页内容 */}
        <div className="py-3">
          {renderTabContent()}
        </div>
      </div>
    </TooltipProvider>
  )
}
