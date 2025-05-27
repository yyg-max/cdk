"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Project, DistributionModeEnum } from "../read/types"

export interface EditDistributionContentProps {
  formData: {
    distributionMode: DistributionModeEnum
    passwordOption: string
    newPassword: string
    singleInviteCode: string
    newInviteCodes: string
    question1: string
    question2: string
    additionalQuota: number
    totalQuota: number
  }
  setFormData: (data: Partial<EditDistributionContentProps["formData"]>) => void
  project: Project
}

export function EditDistributionContent({ formData, setFormData, project }: EditDistributionContentProps) {
  const [codeInput, setCodeInput] = useState("")
  const [batchInput, setBatchInput] = useState("")
  const [previewCodes, setPreviewCodes] = useState<string[]>([])
  const [importPreview, setImportPreview] = useState({ total: 0, unique: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
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
  
  // 解析当前项目的邀请码
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
  
  const updateFormData = (field: string, value: string | number | boolean) => {
    setFormData({ [field as keyof EditDistributionContentProps["formData"]]: value })
  }
  
  // 添加单个邀请码
  const addInviteCode = () => {
    if (!codeInput.trim()) return
    
    // 检查是否已存在相同的邀请码
    if (previewCodes.includes(codeInput.trim())) {
      setErrorMsg("该邀请码已存在")
      return
    }
    
    // 检查是否超过配额
    if (formData.newInviteCodes.split('\n').filter(Boolean).length >= formData.additionalQuota) {
      setErrorMsg(`已达到新增配额 ${formData.additionalQuota}，无法添加更多邀请码`)
      return
    }
    
    // 更新预览
    const updatedPreviewCodes = [...previewCodes, codeInput.trim()]
    setPreviewCodes(updatedPreviewCodes)
    
    // 更新表单数据
    const updatedNewInviteCodes = formData.newInviteCodes 
      ? formData.newInviteCodes + "\n" + codeInput.trim() 
      : codeInput.trim()
    
    updateFormData("newInviteCodes", updatedNewInviteCodes)
    
    // 清空输入框
    setCodeInput("")
    setErrorMsg(null)
  }
  
  // 移除邀请码
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
    
    updateFormData("newInviteCodes", updatedNewCodes.join('\n'))
  }
  
  // 批量导入邀请码
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
    
    // 检查是否超过配额
    const currentNewCodes = formData.newInviteCodes.split('\n').filter(Boolean)
    const willExceedQuota = currentNewCodes.length + uniqueNewCodes.length > formData.additionalQuota
    
    let allNewCodes: string[]
    
    if (willExceedQuota) {
      // 如果会超过配额，只取能填满配额的部分
      const remainingSlots = formData.additionalQuota - currentNewCodes.length
      const limitedNewCodes = uniqueNewCodes.slice(0, remainingSlots)
      allNewCodes = [...currentNewCodes, ...limitedNewCodes]
      
      toast.warning(`只导入了 ${limitedNewCodes.length} 个邀请码，已达到配额上限 ${formData.additionalQuota}`)
    } else {
      // 不超过配额，全部添加
      allNewCodes = [...currentNewCodes, ...uniqueNewCodes]
      
      // 显示导入结果提示
      if (uniqueNewCodes.length > 0) {
        toast.success(`成功导入 ${uniqueNewCodes.length} 个邀请码`)
      }
    }
    
    // 更新预览
    setPreviewCodes([...previewCodes.slice(0, previewCodes.length - currentNewCodes.length), ...allNewCodes])
    
    // 更新表单数据
    updateFormData("newInviteCodes", allNewCodes.join('\n'))
    
    // 显示与已有邀请码重复的提示
    const existingDuplicateCount = newCodes.length - uniqueNewCodes.length
    
    if (existingDuplicateCount > 0) {
      toast.info(`跳过 ${existingDuplicateCount} 个已存在的邀请码`)
    }
    
    // 清空批量输入
    setBatchInput("")
    setErrorMsg(null)
  }
  
  // 计算已添加邀请码数量
  const inviteCodesCount = previewCodes.length
  const newCodesCount = formData.newInviteCodes.split('\n').filter(Boolean).length
  const originalCodesCount = inviteCodesCount - newCodesCount
  const isQuotaFull = newCodesCount >= formData.additionalQuota
  
  return (
    <div className="space-y-4">
      {/* 分发模式显示 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="space-y-2">
          <Label className="text-sm font-medium">分发模式</Label>
          <div className="p-2.5 bg-gray-50 border rounded-md text-gray-600 text-sm">
            {formData.distributionMode === "SINGLE" && "一码一用（每个邀请码仅能使用一次）"}
            {formData.distributionMode === "MULTI" && "一码多用（多人使用同一个邀请码）"}
            {formData.distributionMode === "MANUAL" && "申请-邀请（用户申请，管理员批准）"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            分发模式在创建项目后不可更改
          </p>
        </div>

        {/* 密码设置 - 所有模式都可修改 */}
        <div className="space-y-2">
          <Label htmlFor="passwordOption" className="text-sm font-medium">领取密码</Label>
          <Select 
            value={formData.passwordOption} 
            onValueChange={(value) => updateFormData("passwordOption", value)}
          >
            <SelectTrigger className="h-10 shadow-none">
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
                onChange={(e) => updateFormData("newPassword", e.target.value)}
                placeholder="请输入新密码"
                className="h-10 shadow-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 配额管理 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="space-y-2">
          <Label htmlFor="additionalQuota" className="text-sm font-medium">新增配额</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="additionalQuota" 
              type="number"
              min={0}
              max={1000 - formData.totalQuota}
              value={formData.additionalQuota}
              onChange={(e) => updateFormData("additionalQuota", parseInt(e.target.value) || 0)}
              className="h-10 shadow-none"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            当前配额: {formData.totalQuota}，可继续添加配额数量上限: {1000 - formData.totalQuota}
          </p>
        </div>
      </div>

      {/* 一码一用模式 */}
      {formData.distributionMode === "SINGLE" && (
        <div className="space-y-3">
          {/* 邀请码管理 */}
          {formData.additionalQuota > 0 && (
            <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  邀请码管理 <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    已有: {originalCodesCount}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${
                    newCodesCount === formData.additionalQuota
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}>
                    新增: {newCodesCount} / {formData.additionalQuota}
                  </Badge>
                </div>
              </div>
              
              {/* 错误信息显示 */}
              {errorMsg && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {/* 邀请码预览区域 */}
              {previewCodes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">邀请码预览</span>
                    <span className="text-xs text-gray-500">总计: {previewCodes.length}</span>
                  </div>
                  <ScrollArea className="h-36">
                    {previewCodes.map((code, index) => {
                      const isExisting = index < originalCodesCount;
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center gap-3 p-2 rounded mb-1 ${
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
                  </ScrollArea>
                </div>
              )}
              
              {/* 添加单个邀请码 */}
              <div className="flex gap-2">
                <Input
                  placeholder="输入邀请码或链接"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value)
                    setErrorMsg(null) // 清除错误信息
                  }}
                  disabled={isQuotaFull}
                  className="h-10 shadow-none"
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
                  disabled={!codeInput.trim() || isQuotaFull}
                  className="h-10 px-4 shadow-none"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* 批量导入区域 */}
              <div className="space-y-2">
                <Label htmlFor="batchCodes" className="text-xs text-muted-foreground">批量导入</Label>
                <div className="space-y-2">
                  <Textarea
                    id="batchCodes"
                    placeholder={isQuotaFull 
                      ? "已达到配额上限，无法继续导入" 
                      : "支持多种快速导入格式：code1,code2,code3 或 每行一个邀请码"}
                    rows={3}
                    value={batchInput}
                    onChange={(e) => {
                      setBatchInput(e.target.value)
                      setErrorMsg(null) // 清除错误信息
                    }}
                    disabled={isQuotaFull}
                    className="resize-none text-sm shadow-none"
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
                      disabled={!batchInput.trim() || importPreview.unique === 0 || isQuotaFull}
                      className="h-8 shadow-none"
                    >
                      导入
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBatchInput("")}
                      disabled={!batchInput}
                      className="h-8 shadow-none"
                    >
                      清空
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* 如果邀请码数量与配额不匹配，显示提示 */}
              {formData.additionalQuota > 0 && newCodesCount !== formData.additionalQuota && (
                <div className="text-center p-2 bg-yellow-50 text-yellow-700 text-xs rounded-md mt-2">
                  请继续添加 
                  <strong> {formData.additionalQuota - newCodesCount} </strong> 
                  个邀请码以满足新增配额要求
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 一码多用模式 */}
      {formData.distributionMode === "MULTI" && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="singleInviteCode" className="text-sm font-medium">邀请码/链接 <span className="text-red-500">*</span></Label>
            <Input 
              id="singleInviteCode" 
              value={formData.singleInviteCode}
              onChange={(e) => updateFormData("singleInviteCode", e.target.value)}
              placeholder="输入通用邀请码"
              className="h-10 shadow-none"
            />
          </div>
        </div>
      )}

      {/* 申请-邀请模式 */}
      {formData.distributionMode === "MANUAL" && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="question1" className="text-sm font-medium">问题1 <span className="text-red-500">*</span></Label>
            <Input 
              id="question1" 
              value={formData.question1}
              onChange={(e) => updateFormData("question1", e.target.value)}
              placeholder="例如：你为什么需要这个资源？"
              maxLength={16}
              className="h-10 shadow-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="question2" className="text-sm font-medium">问题2 (可选)</Label>
            <Input 
              id="question2" 
              value={formData.question2}
              onChange={(e) => updateFormData("question2", e.target.value)}
              placeholder="例如：你如何使用这个资源？"
              maxLength={16}
              className="h-10 shadow-none"
            />
          </div>
        </div>
      )}
    </div>
  )
} 