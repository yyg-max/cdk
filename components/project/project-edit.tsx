"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CalendarIcon, Save, Loader2, Info, CheckCircle, AlertCircle, Check, X, Infinity } from "lucide-react"
import { getCategoryOptions, getProjectStatusOptions } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"

// 项目类型定义
interface Project {
  id: string
  name: string
  description: string
  category: string
  tag?: {
    id: string
    name: string
  }
  usageUrl?: string
  totalQuota: number
  claimedCount: number
  remainingQuota: number
  tutorial?: string
  distributionMode: string
  isPublic: boolean
  startTime: string
  endTime?: string
  requireLinuxdo: boolean
  minTrustLevel: number
  minRiskThreshold: number
  status: string
  createdAt: string
  updatedAt: string
  hasPassword?: boolean
  claimPassword?: string | null
  inviteCodes?: string | null
  question1?: string | null
  question2?: string | null
  isCreator: boolean
  creator: {
    id: string
    name: string
    nickname?: string
    image?: string
  }
}

interface ProjectEditProps {
  project: Project
}

export default function ProjectEdit({ project }: ProjectEditProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  
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
  
  // 新增：邀请码管理状态
  const [codeInput, setCodeInput] = useState("")
  const [batchInput, setBatchInput] = useState("")
  const [previewCodes, setPreviewCodes] = useState<string[]>([])
  const [importPreview, setImportPreview] = useState({ total: 0, unique: 0 })
  
  // 批量输入变化时计算导入预览
  useEffect(() => {
    if (batchInput) {
      const codes = batchInput.split(/[,，\n]/).map(code => code.trim()).filter(Boolean)
      const uniqueCodes = codes.filter(code => !previewCodes.includes(code))
      setImportPreview({ 
        total: codes.length, 
        unique: uniqueCodes.length 
      })
    } else {
      setImportPreview({ total: 0, unique: 0 })
    }
  }, [batchInput, previewCodes])
  
  // 新增：解析当前项目的邀请码
  useEffect(() => {
    if (project.inviteCodes) {
      try {
        const existingCodes = JSON.parse(project.inviteCodes)
        setPreviewCodes(existingCodes)
      } catch (e) {
        console.error("解析邀请码失败:", e)
        setPreviewCodes([])
      }
    }
  }, [project.inviteCodes])
  
  // 新增：邀请码管理函数
  const addInviteCode = () => {
    if (!codeInput.trim()) return
    
    // 检查是否已存在相同的邀请码
    if (previewCodes.includes(codeInput.trim())) {
      toast.error("该邀请码已存在")
      return
    }
    
    // 更新预览
    const updatedPreviewCodes = [...previewCodes, codeInput.trim()]
    setPreviewCodes(updatedPreviewCodes)
    
    // 更新表单数据 - 将新添加的邀请码添加到newInviteCodes
    const updatedNewInviteCodes = formData.newInviteCodes 
      ? formData.newInviteCodes + "\n" + codeInput.trim() 
      : codeInput.trim()
    
    setFormData({
      ...formData,
      newInviteCodes: updatedNewInviteCodes,
      additionalQuota: updatedNewInviteCodes.split('\n').filter(code => code.trim()).length
    })
    
    // 清空输入框
    setCodeInput("")
  }
  
  const removeInviteCode = (indexToRemove: number) => {
    // 如果要移除的是原有邀请码，需要提示用户
    if (indexToRemove < previewCodes.length - formData.newInviteCodes.split('\n').filter(Boolean).length) {
      toast.error("无法删除已有邀请码，只能新增")
      return
    }
    
    // 更新预览
    const updatedPreviewCodes = previewCodes.filter((_, index) => index !== indexToRemove)
    setPreviewCodes(updatedPreviewCodes)
    
    // 更新表单数据
    const newCodes = formData.newInviteCodes.split('\n').filter(Boolean)
    // 计算在新邀请码中的索引
    const indexInNewCodes = indexToRemove - (previewCodes.length - newCodes.length)
    const updatedNewCodes = newCodes.filter((_, i) => i !== indexInNewCodes)
    
    setFormData({
      ...formData,
      newInviteCodes: updatedNewCodes.join('\n'),
      additionalQuota: updatedNewCodes.length
    })
  }
  
  const parseCodesFromText = () => {
    if (!batchInput.trim()) return
    
    // 解析邀请码
    const newCodes = batchInput.split(/[,，\n]/).map(code => code.trim()).filter(Boolean)
    
    // 去重：排除已有的邀请码
    const uniqueNewCodes = newCodes.filter(code => !previewCodes.includes(code))
    
    if (uniqueNewCodes.length === 0) {
      toast.error("没有新的邀请码需要添加")
      return
    }
    
    // 更新预览
    const updatedPreviewCodes = [...previewCodes, ...uniqueNewCodes]
    setPreviewCodes(updatedPreviewCodes)
    
    // 更新表单数据
    const currentNewCodes = formData.newInviteCodes.split('\n').filter(Boolean)
    const allNewCodes = [...currentNewCodes, ...uniqueNewCodes]
    
    setFormData({
      ...formData,
      newInviteCodes: allNewCodes.join('\n'),
      additionalQuota: allNewCodes.length
    })
    
    // 清空批量输入
    setBatchInput("")
    
    // 提示信息
    if (uniqueNewCodes.length > 0) {
      toast.success(`成功导入 ${uniqueNewCodes.length} 个邀请码`)
    }
    if (newCodes.length > uniqueNewCodes.length) {
      toast.info(`跳过 ${newCodes.length - uniqueNewCodes.length} 个重复邀请码`)
    }
  }
  
  // 定义标签页配置
  const tabs = [
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
      const requestData: any = {
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
      
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 设置为无限期
  const setInfiniteEndTime = () => {
    setFormData({...formData, endTime: null})
  }
  
  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return renderBasicInfo()
      case "distribution":
        return renderDistributionSettings()
      case "restrictions":
        return renderRestrictions()
      default:
        return null
    }
  }
  
  // 基本信息标签页
  const renderBasicInfo = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">项目名称 *</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              maxLength={16}
              required
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">项目分类 *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({...formData, category: value})}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {getCategoryOptions().map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="usageUrl" className="text-sm font-medium">使用链接</Label>
            <Input 
              id="usageUrl" 
              type="url"
              value={formData.usageUrl}
              onChange={(e) => setFormData({...formData, usageUrl: e.target.value})}
              placeholder="https://example.com"
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">项目状态 *</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({...formData, status: value})}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {getProjectStatusOptions().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">项目描述</Label>
          <Textarea 
            id="description" 
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            maxLength={64}
            placeholder="请描述项目的用途和内容"
            className="min-h-[80px]"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tutorial" className="text-sm font-medium">使用教程</Label>
          <Textarea 
            id="tutorial" 
            value={formData.tutorial}
            onChange={(e) => setFormData({...formData, tutorial: e.target.value})}
            placeholder="在这里添加使用教程，支持Markdown格式"
            className="min-h-[200px]"
          />
        </div>
      </div>
    )
  }
  
  // 分发设置标签页
  const renderDistributionSettings = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">分发模式</Label>
          <div className="p-2.5 bg-gray-50 border rounded-md text-gray-600 text-sm">
            {formData.distributionMode === "SINGLE" && "一码一用（每个邀请码仅能使用一次）"}
            {formData.distributionMode === "MULTI" && "一码多用（多人使用同一个邀请码）"}
            {formData.distributionMode === "MANUAL" && "申请-邀请（用户申请，管理员批准）"}
          </div>
        </div>
        
        {/* 密码设置 - 所有模式都可修改 */}
        <div className="space-y-2">
          <Label htmlFor="passwordOption" className="text-sm font-medium">领取密码</Label>
          <Select 
            value={formData.passwordOption} 
            onValueChange={(value) => setFormData({...formData, passwordOption: value})}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="选择密码选项" />
            </SelectTrigger>
            <SelectContent>
              {project.hasPassword && (
                <SelectItem value="keep">保持原密码不变</SelectItem>
              )}
              <SelectItem value="new">设置新密码</SelectItem>
              <SelectItem value="none">不设置密码</SelectItem>
            </SelectContent>
          </Select>
          
          {formData.passwordOption === "new" && (
            <div className="mt-2">
              <Input 
                id="newPassword" 
                type="text"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="请输入新密码"
                className="h-10"
              />
            </div>
          )}
        </div>
        
        {/* 增加配额 - 所有模式都可以 */}
        <div className="space-y-2">
          <Label htmlFor="additionalQuota" className="text-sm font-medium">新增配额 (当前总配额: {formData.totalQuota})</Label>
          <Input 
            id="additionalQuota" 
            type="number"
            min={0}
            max={1000 - formData.totalQuota}
            value={formData.additionalQuota}
            onChange={(e) => setFormData({...formData, additionalQuota: parseInt(e.target.value) || 0})}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground mt-1">
            可添加配额数量上限: {1000 - formData.totalQuota}
          </p>
        </div>
        
        {/* 一码一用模式 - 需要邀请码 */}
        {formData.distributionMode === "SINGLE" && (
          <div className="space-y-4">
            {/* 邀请码管理区域 */}
            {formData.additionalQuota > 0 && (
              <div className="p-3 rounded-lg border border-dashed bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    邀请码管理 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      已有: {previewCodes.length - formData.newInviteCodes.split('\n').filter(Boolean).length}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${
                      formData.newInviteCodes.split('\n').filter(Boolean).length === formData.additionalQuota
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}>
                      新增: {formData.newInviteCodes.split('\n').filter(Boolean).length} / {formData.additionalQuota}
                    </Badge>
                  </div>
                </div>
                
                {/* 邀请码预览区域 */}
                {previewCodes.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">邀请码预览</span>
                      <span className="text-xs text-gray-500">总计: {previewCodes.length}</span>
                    </div>
                    {previewCodes.map((code, index) => {
                      const isExisting = index < previewCodes.length - formData.newInviteCodes.split('\n').filter(Boolean).length;
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center gap-3 p-2 rounded ${
                            isExisting ? 'bg-gray-100' : 'bg-green-50'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isExisting ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                          <code className="flex-1 text-sm font-mono truncate">{code}</code>
                          {!isExisting && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInviteCode(index)}
                              className="h-8 w-8 p-0 hover:bg-red-100 text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* 如果邀请码数量与配额不匹配，显示提示 */}
                    {formData.additionalQuota > 0 && 
                     formData.newInviteCodes.split('\n').filter(Boolean).length !== formData.additionalQuota && (
                      <div className="text-center p-2 bg-yellow-50 text-yellow-700 text-xs rounded-md mt-2">
                        请继续添加 
                        <strong> {formData.additionalQuota - formData.newInviteCodes.split('\n').filter(Boolean).length} </strong> 
                        个邀请码以满足新增配额要求
                      </div>
                    )}
                  </div>
                )}
                
                {/* 添加单个邀请码 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="输入邀请码或链接"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInviteCode();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addInviteCode}
                    disabled={!codeInput.trim() || formData.newInviteCodes.split('\n').filter(Boolean).length >= formData.additionalQuota}
                    className="h-10 px-4"
                  >
                    添加
                  </Button>
                </div>
                
                {/* 批量导入区域 */}
                <div className="space-y-2">
                  <Label htmlFor="batchCodes" className="text-xs text-muted-foreground">批量导入</Label>
                  <div className="space-y-2">
                    <Textarea
                      id="batchCodes"
                      placeholder="支持多种快速导入格式：code1,code2,code3 或 每行一个邀请码"
                      rows={3}
                      value={batchInput}
                      onChange={(e) => setBatchInput(e.target.value)}
                      className="resize-none text-sm"
                    />
                    {batchInput.trim() && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>可导入: <span className={importPreview.unique > 0 ? "text-green-600 font-medium" : "text-gray-500"}>{importPreview.unique}</span></span>
                        {importPreview.total !== importPreview.unique && (
                          <span>重复: <span className="text-yellow-600 font-medium">{importPreview.total - importPreview.unique}</span></span>
                        )}
                        <span>总计: {importPreview.total}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={parseCodesFromText}
                        disabled={!batchInput.trim() || importPreview.unique === 0 || formData.newInviteCodes.split('\n').filter(Boolean).length >= formData.additionalQuota}
                        className="h-8"
                      >
                        导入
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBatchInput("")}
                        disabled={!batchInput}
                        className="h-8"
                      >
                        清空
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded-md border border-yellow-200">
                  <p>请确保新增邀请码数量与新增配额相等。</p>
                  <p>新增邀请码将添加到项目中，并自动创建相应的一码一用记录。</p>
                  <p>注意：系统会自动检测并跳过重复的邀请码。</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 一码多用模式 - 可修改邀请码 */}
        {formData.distributionMode === "MULTI" && (
          <div className="space-y-2">
            <Label htmlFor="singleInviteCode" className="text-sm font-medium">邀请码/链接 *</Label>
            <Input 
              id="singleInviteCode" 
              value={formData.singleInviteCode}
              onChange={(e) => setFormData({...formData, singleInviteCode: e.target.value})}
              placeholder="输入通用邀请码"
              className="h-10"
            />
          </div>
        )}
        
        {/* 申请-邀请模式 - 可修改问题 */}
        {formData.distributionMode === "MANUAL" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="question1" className="text-sm font-medium">问题1 *</Label>
              <Input 
                id="question1" 
                value={formData.question1}
                onChange={(e) => setFormData({...formData, question1: e.target.value})}
                placeholder="例如：你为什么需要这个资源？"
                maxLength={16}
                className="h-10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="question2" className="text-sm font-medium">问题2 (可选)</Label>
              <Input 
                id="question2" 
                value={formData.question2}
                onChange={(e) => setFormData({...formData, question2: e.target.value})}
                placeholder="例如：你如何使用这个资源？"
                maxLength={16}
                className="h-10"
              />
            </div>
          </>
        )}
      </div>
    )
  }
  
  // 领取限制标签页
  const renderRestrictions = () => {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-medium">开始时间 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startTime ? (
                    format(formData.startTime, "yyyy-MM-dd HH:mm:ss")
                  ) : (
                    <span>选择日期时间</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startTime}
                  onSelect={(date) => date && setFormData({...formData, startTime: date})}
                  initialFocus
                />
                <div className="p-3 border-t border-border">
                  <Input
                    type="time"
                    step="1"
                    value={format(formData.startTime, "HH:mm:ss")}
                    onChange={(e) => {
                      const [hours, minutes, seconds] = e.target.value.split(':').map(Number);
                      const newDate = new Date(formData.startTime);
                      newDate.setHours(hours || 0);
                      newDate.setMinutes(minutes || 0);
                      newDate.setSeconds(seconds || 0);
                      setFormData({...formData, startTime: newDate});
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="endTime" className="text-sm font-medium">结束时间</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={setInfiniteEndTime}
                className="h-7 text-xs"
              >
                <Infinity className="h-3 w-3 mr-1" /> 无限期
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.endTime ? (
                    format(formData.endTime, "yyyy-MM-dd HH:mm:ss")
                  ) : (
                    <span>无限期</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.endTime || undefined}
                  onSelect={(date) => setFormData({...formData, endTime: date || null})}
                  initialFocus
                />
                {formData.endTime && (
                  <div className="p-3 border-t border-border">
                    <Input
                      type="time"
                      step="1"
                      value={formData.endTime ? format(formData.endTime, "HH:mm:ss") : ""}
                      onChange={(e) => {
                        if (formData.endTime) {
                          const [hours, minutes, seconds] = e.target.value.split(':').map(Number);
                          const newDate = new Date(formData.endTime);
                          newDate.setHours(hours || 0);
                          newDate.setMinutes(minutes || 0);
                          newDate.setSeconds(seconds || 0);
                          setFormData({...formData, endTime: newDate});
                        }
                      }}
                    />
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* LinuxDo认证设置 */}
        <div className="space-y-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Switch
                id="requireLinuxdo"
                checked={formData.requireLinuxdo}
                onCheckedChange={(checked) => setFormData({...formData, requireLinuxdo: checked, minTrustLevel: checked ? formData.minTrustLevel : 0})}
                className="data-[state=checked]:bg-blue-600"
              />
              <div>
                <Label htmlFor="requireLinuxdo" className="text-sm font-medium">需要LinuxDo认证 *</Label>
                <p className="text-xs text-muted-foreground">开启后用户需要通过LinuxDo认证才能领取</p>
              </div>
            </div>
          </div>
          
          {formData.requireLinuxdo && (
            <div className=" space-y-2 mt-2">
              <Label htmlFor="minTrustLevel" className="text-sm font-medium">最低信任等级 *</Label>
              <Select 
                value={formData.minTrustLevel.toString()} 
                onValueChange={(value) => setFormData({...formData, minTrustLevel: parseInt(value)})}
              >
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="选择信任等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0级 (无要求)</SelectItem>
                  <SelectItem value="1">1级</SelectItem>
                  <SelectItem value="2">2级</SelectItem>
                  <SelectItem value="3">3级</SelectItem>
                  <SelectItem value="4">4级</SelectItem>
                  <SelectItem value="5">5级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="minRiskThreshold" className="text-sm font-medium">最低风控阈值: {formData.minRiskThreshold}</Label>
              <span className="text-xs text-muted-foreground">
                {formData.minRiskThreshold}
              </span>
            </div>
            <Slider
              value={[formData.minRiskThreshold]}
              min={30}
              max={90}
              step={1}
              onValueChange={(value) => setFormData({...formData, minRiskThreshold: value[0]})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>宽松 30</span>
              <span>平衡 60</span>
              <span>严格 90</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex mb-8 justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              我的项目
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              查看和管理您的项目
            </p>
          </div>
          <Button 
            onClick={() => router.back()}
            variant="ghost"
            className="flex items-center space-x-1 h"
          >
            <span>返回上一页</span>
          </Button>
        </div>
        
        {/* 标签页导航 */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
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
            
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-black hover:bg-gray-800 text-white flex items-center space-x-1 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              <span>保存更改</span>
            </Button>
          </div>
          
          {/* 标签页内容 */}
          <div className="py-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
