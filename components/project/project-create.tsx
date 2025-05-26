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

interface ProjectFormData {
  // 基本信息
  name?: string
  description?: string
  category?: string
  selectedTags?: string[]
  usageUrl?: string
  totalQuota?: number
  tutorial?: string
  
  // 分发内容
  distributionMode?: string
  isPublic?: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
  
  // 领取限制
  startTime?: Date
  endTime?: Date | null
  requireLinuxdo?: boolean
  minTrustLevel?: number
  minRiskThreshold?: number
}

export function ProjectCreate() {
  const [activeTab, setActiveTab] = useState("basic")
  const [formData, setFormData] = useState<ProjectFormData>({
    category: "人工智能",
    totalQuota: 10,
    distributionMode: "single",
    isPublic: true,
    startTime: new Date(),
    endTime: null,
    requireLinuxdo: true,
    minTrustLevel: 2,
    minRiskThreshold: 80
  })

  const tabs = [
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
  ]

  // 验证各个配置部分
  const validateBasicInfo = () => {
    return !!(formData.name && formData.category && formData.totalQuota && formData.totalQuota > 0)
  }

  const validateDistribution = () => {
    if (formData.distributionMode === "single") {
      return !!(formData.inviteCodes && formData.inviteCodes.length === formData.totalQuota)
    } else if (formData.distributionMode === "multi") {
      return !!formData.singleInviteCode
    } else if (formData.distributionMode === "manual") {
      return !!formData.question1
    }
    return false
  }

  const validateRestrictions = () => {
    return !!(formData.startTime && formData.minRiskThreshold)
  }

  // 验证表单数据
  const validateForm = () => {
    return validateBasicInfo() && validateDistribution() && validateRestrictions()
  }

  // 获取缺失的数据信息
  const getMissingData = () => {
    const missing: string[] = []
    
    // 检查基本信息
    if (!formData.name) missing.push("项目名称")
    if (!formData.category) missing.push("项目分类")
    if (!formData.totalQuota || formData.totalQuota <= 0) missing.push("分配名额")
    
    // 检查分发内容
    if (formData.distributionMode === "single") {
      if (!formData.inviteCodes || formData.inviteCodes.length === 0) {
        missing.push("邀请码/链接")
      } else if (formData.inviteCodes.length !== formData.totalQuota) {
        missing.push(`邀请码数量不匹配（需要${formData.totalQuota}个，当前${formData.inviteCodes.length}个）`)
      }
    } else if (formData.distributionMode === "multi") {
      if (!formData.singleInviteCode) missing.push("邀请码/链接")
    } else if (formData.distributionMode === "manual") {
      if (!formData.question1) missing.push("问题1")
    }
    
    // 检查领取限制
    if (!formData.startTime) missing.push("开始时间")
    if (!formData.minRiskThreshold) missing.push("风控阈值")
    
    return missing
  }

  // 获取配置状态
  const getTabStatus = (tabId: string) => {
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      const missingItems = getMissingData()
      toast.error("请完成所有必填项", {
        description: `缺少：${missingItems.join("、")}`,
        duration: 4000,
      })
      return
    }

    try {
      // 准备API请求数据
      const requestData = {
        // 基本信息
        name: formData.name!,
        description: formData.description,
        category: formData.category!,
        selectedTags: formData.selectedTags,
        usageUrl: formData.usageUrl,
        totalQuota: formData.totalQuota!,
        tutorial: formData.tutorial,
        
        // 分发内容
        distributionMode: formData.distributionMode!,
        isPublic: formData.isPublic!,
        claimPassword: formData.claimPassword,
        inviteCodes: formData.inviteCodes,
        singleInviteCode: formData.singleInviteCode,
        question1: formData.question1,
        question2: formData.question2,
        
        // 领取限制
        startTime: formData.startTime!.toISOString(),
        endTime: formData.endTime?.toISOString() || null,
        requireLinuxdo: formData.requireLinuxdo!,
        minTrustLevel: formData.minTrustLevel!,
        minRiskThreshold: formData.minRiskThreshold!
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || "创建失败")
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

  const renderTabContent = () => {
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

  const isFormValid = validateForm()
  const missingData = getMissingData()

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
                  disabled={!isFormValid}
                  className="bg-black hover:bg-gray-800 text-white flex items-center space-x-1 disabled:opacity-50 px-3 py-2 h-auto text-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>创建项目</span>
                </Button>
              </div>
            </TooltipTrigger>
            {!isFormValid && (
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium text-sm">请完成以下必填项：</p>
                  <ul className="text-xs space-y-0.5">
                    {missingData.map((item, index) => (
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
