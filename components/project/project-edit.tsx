"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, CheckCircle, AlertCircle, Check, X, Save } from "lucide-react"
import { ProjectEditProps, ProjectRequestData, ProjectStatusEnum } from "./edit/types"
import { EditBasicInfo } from "./edit/basic-info"
import { EditDistributionContent } from "./edit/distribution-content"
import { EditClaimRestrictions } from "./edit/claim-restrictions"

interface TabOption {
  id: string
  title: string
  icon: React.ElementType
}

export default function ProjectEdit({ project }: ProjectEditProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 如果不是创建者，重定向到dashboard
  useEffect(() => {
    if (!project.isCreator) {
      router.push('/dashboard')
    }
  }, [project.isCreator, router])
  
  // 初始化表单数据
  const [formData, setFormData] = useState({
    // 基本信息 - 可编辑
    name: project.name,
    description: project.description,
    category: project.category,
    usageUrl: project.usageUrl || '',
    tutorial: project.tutorial || '',
    status: project.status,
    
    // 分发设置 - 部分可编辑
    distributionMode: project.distributionMode, // 不可编辑
    isPublic: project.isPublic,                // 不可编辑
    passwordOption: project.hasPassword ? "keep" : "none", // 密码选项：keep(保持), new(新密码), none(无密码)
    newPassword: "", // 新密码内容
    newInviteCodes: '',                       // 新增邀请码（一码一用模式）
    singleInviteCode: project.inviteCodes ? JSON.parse(project.inviteCodes)[0] : '', // 一码多用模式
    question1: project.question1 || '',
    question2: project.question2 || '',
    
    // 领取限制 - 可编辑
    startTime: new Date(project.startTime),
    endTime: project.endTime ? new Date(project.endTime) : null,
    requireLinuxdo: project.requireLinuxdo,
    minTrustLevel: project.minTrustLevel,
    minRiskThreshold: project.minRiskThreshold,
    
    // 不可变字段
    totalQuota: project.totalQuota,           // 不可直接编辑
    additionalQuota: 0                        // 可以增加配额
  })
  
  // 定义标签页配置
  const tabs: TabOption[] = [
    {
      id: "basic",
      title: "基本信息",
      icon: Info
    },
    {
      id: "distribution",
      title: "分发设置",
      icon: CheckCircle
    },
    {
      id: "restrictions",
      title: "领取限制",
      icon: AlertCircle
    }
  ]
  
  // 检查各个标签页的有效性
  const validateBasicInfo = () => {
    return !!(formData.name && formData.category && formData.status)
  }
  
  const validateDistribution = () => {
    // 分发模式特定验证
    if (formData.additionalQuota > 0) {
      if (formData.distributionMode === "SINGLE") {
        // 一码一用模式需要检查邀请码数量
        const newCodes = formData.newInviteCodes.split('\n').filter(code => code.trim());
        return newCodes.length === formData.additionalQuota;
      }
    }
    
    if (formData.distributionMode === "SINGLE") {
      return true;
    } else if (formData.distributionMode === "MULTI") {
      return !!formData.singleInviteCode;
    } else if (formData.distributionMode === "MANUAL") {
      return !!formData.question1;
    }
    return false;
  }
  
  const validateRestrictions = () => {
    return !!(formData.startTime && 
      (formData.requireLinuxdo ? formData.minTrustLevel >= 0 : true) && 
      formData.minRiskThreshold >= 30 && formData.minRiskThreshold <= 90)
  }
  
  // 获取标签页状态
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
  
  // 获取缺失的数据信息
  const getMissingData = (): string[] => {
    const missing: string[] = []
    
    // 检查基本信息
    if (!formData.name) missing.push("项目名称")
    if (!formData.category) missing.push("项目分类")
    if (!formData.status) missing.push("项目状态")
    
    // 检查分发内容
    if (formData.additionalQuota > 0 && formData.distributionMode === "SINGLE") {
      const newCodes = formData.newInviteCodes.split('\n').filter(code => code.trim());
      if (newCodes.length !== formData.additionalQuota) {
        missing.push(`新增邀请码数量不匹配（需要${formData.additionalQuota}个，当前${newCodes.length}个）`)
      }
    }
    
    if (formData.distributionMode === "MULTI" && !formData.singleInviteCode) {
      missing.push("邀请码/链接")
    }
    
    if (formData.distributionMode === "MANUAL" && !formData.question1) {
      missing.push("问题1")
    }
    
    // 检查领取限制
    if (!formData.startTime) missing.push("开始时间")
    if (formData.requireLinuxdo && formData.minTrustLevel < 0) missing.push("最低信任等级")
    if (formData.minRiskThreshold < 30 || formData.minRiskThreshold > 90) missing.push("风控阈值")
    
    return missing
  }
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证表单
    if (!validateBasicInfo()) {
      toast.error("请完成基本信息填写")
      setActiveTab("basic")
      return
    }
    
    if (!validateDistribution()) {
      if (formData.additionalQuota > 0 && formData.distributionMode === "SINGLE") {
        const newCodes = formData.newInviteCodes.split('\n').filter(code => code.trim());
        if (newCodes.length !== formData.additionalQuota) {
          toast.error(`新增邀请码数量(${newCodes.length})与新增配额(${formData.additionalQuota})不一致`)
        }
      }
      toast.error("请完成分发设置")
      setActiveTab("distribution")
      return
    }
    
    if (!validateRestrictions()) {
      toast.error("请完成领取限制设置")
      setActiveTab("restrictions")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 准备请求数据
      const requestData: ProjectRequestData = {
        id: project.id,
        
        // 基本信息
        name: formData.name,
        description: formData.description,
        category: formData.category,
        usageUrl: formData.usageUrl,
        tutorial: formData.tutorial,
        status: formData.status,
        
        // 领取限制
        startTime: formData.startTime,
        endTime: formData.endTime,
        requireLinuxdo: formData.requireLinuxdo,
        minTrustLevel: formData.minTrustLevel,
        minRiskThreshold: formData.minRiskThreshold,
      }
      
      // 处理密码
      if (formData.passwordOption === "new" && formData.newPassword) {
        // 设置新密码
        requestData.claimPassword = formData.newPassword;
      } else if (formData.passwordOption === "none") {
        // 取消密码
        requestData.claimPassword = null;
      }
      // 保持原密码不传此字段
      
      // 处理额外配额 - 适用于所有分发模式
      if (formData.additionalQuota > 0) {
        requestData.totalQuota = formData.totalQuota + formData.additionalQuota
        
        // 一码一用模式需要添加邀请码
        if (formData.distributionMode === "SINGLE") {
          const newCodes = formData.newInviteCodes.split('\n').filter(code => code.trim());
          
          if (newCodes.length !== formData.additionalQuota) {
            toast.error(`新增邀请码数量(${newCodes.length})与新增配额(${formData.additionalQuota})不一致`)
            setIsSubmitting(false)
            return
          }
          
          // 发送新邀请码数组
          requestData.newInviteCodes = newCodes
        }
      }
      
      // 一码多用模式
      if (formData.distributionMode === "MULTI") {
        if (!formData.singleInviteCode.trim()) {
          toast.error("请填写邀请码")
          setIsSubmitting(false)
          return
        }
        requestData.inviteCodes = JSON.stringify([formData.singleInviteCode.trim()])
      }
      
      // 申请-邀请模式
      if (formData.distributionMode === "MANUAL") {
        if (!formData.question1.trim()) {
          toast.error("请填写问题1")
          setIsSubmitting(false)
          return
        }
        requestData.question1 = formData.question1.trim()
        requestData.question2 = formData.question2.trim() || null
      }
      
      // 发送更新请求
      const response = await fetch('/api/projects/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新失败')
      }
      
      toast.success('项目更新成功')
      
      // 重新加载页面以获取最新数据
      router.refresh()
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新失败'
      toast.error(`更新失败: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return <EditBasicInfo 
          formData={{
            name: formData.name,
            description: formData.description,
            category: formData.category,
            usageUrl: formData.usageUrl,
            tutorial: formData.tutorial,
            status: formData.status as string // 确保类型兼容性
          }} 
          setFormData={(data) => {
            // 手动处理数据更新，确保类型兼容
            const updatedFormData = { ...formData };
            
            // 只更新已定义的字段
            if (data.name !== undefined) updatedFormData.name = data.name;
            if (data.description !== undefined) updatedFormData.description = data.description;
            if (data.category !== undefined) updatedFormData.category = data.category;
            if (data.usageUrl !== undefined) updatedFormData.usageUrl = data.usageUrl;
            if (data.tutorial !== undefined) updatedFormData.tutorial = data.tutorial;
            if (data.status !== undefined) updatedFormData.status = data.status as ProjectStatusEnum;
            
            setFormData(updatedFormData);
          }} 
        />
      case "distribution":
        return <EditDistributionContent 
          formData={formData} 
          setFormData={(data) => setFormData({ ...formData, ...data })} 
          project={project} 
        />
      case "restrictions":
        return <EditClaimRestrictions 
          formData={formData} 
          setFormData={(data) => setFormData({ ...formData, ...data })} 
        />
      default:
        return null
    }
  }
  
  const isFormValid = validateBasicInfo() && validateDistribution() && validateRestrictions()
  const missingData = getMissingData()
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex mb-8 justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                编辑项目
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                管理和更新您的项目
              </p>
            </div>
            <Button 
              onClick={() => router.back()}
              variant="ghost"
              className="flex items-center space-x-1"
            >
              <span>返回上一页</span>
            </Button>
          </div>
          
          {/* 标签页导航和保存按钮 */}
          <div className="space-y-6">
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
              
              {/* 保存更改按钮 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormValid}
                      className="bg-black hover:bg-gray-800 text-white flex items-center space-x-1 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin mr-1" />
                          <span>保存中...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          <span>保存更改</span>
                        </>
                      )}
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
            
            {/* 标签页内容 */}
            <div className="py-3">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
