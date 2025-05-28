"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Plus, Lock, Users, UserCheck, AlertCircle } from "lucide-react"
import { getDistributionModeOptions } from "@/lib/constants"
import { DistributionContentProps, DistributionModeType, DistributionModeOption } from "./types"
import { toast } from "sonner"

/**
 * 扩展的分发模式选项接口，包含UI相关属性
 */
interface ExtendedDistributionModeOption extends DistributionModeOption {
  readonly icon: React.ElementType
  readonly color: string
}

/**
 * 分发内容配置组件
 * 用于项目创建流程中的分发模式和内容设置
 * 
 * @param formData - 表单数据
 * @param setFormData - 表单数据更新函数
 * @param totalQuota - 总配额数量
 */
export function DistributionContent({ formData, setFormData, totalQuota }: DistributionContentProps) {
  const [codeInput, setCodeInput] = useState("")
  const [batchInput, setBatchInput] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /**
   * 更新表单字段值
   * @param field - 字段名
   * @param value - 字段值
   */
  const updateField = <K extends keyof typeof formData>(
    field: K, 
    value: typeof formData[K]
  ) => {
    setFormData({ [field]: value })
  }

  /**
   * 添加单个邀请码
   */
  const addInviteCode = (): void => {
    if (!codeInput.trim()) return
    
    const newCode = codeInput.trim()
    const existingCodes = formData.inviteCodes || []
    
    // 检查是否已存在
    if (existingCodes.includes(newCode)) {
      setErrorMsg("该邀请码已存在")
      return
    }
    
    // 检查是否超过配额
    if (existingCodes.length >= totalQuota) {
      setErrorMsg(`已达到最大配额 ${totalQuota}，无法添加更多邀请码`)
      return
    }
    
    const newCodes = [...existingCodes, newCode]
    updateField("inviteCodes", newCodes)
    setCodeInput("")
    setErrorMsg(null)
    
    // 如果已经达到配额，显示提示
    if (newCodes.length === totalQuota) {
      toast.success(`已添加 ${totalQuota} 个邀请码，已达到配额上限`)
    }
  }

  /**
   * 移除邀请码
   * @param index - 要移除的邀请码索引
   */
  const removeInviteCode = (index: number): void => {
    const newCodes = formData.inviteCodes?.filter((_, i) => i !== index) || []
    updateField("inviteCodes", newCodes)
    setErrorMsg(null) // 移除错误信息
  }

  /**
   * 从文本解析邀请码（批量导入）
   * @param text - 包含邀请码的文本
   */
  const parseCodesFromText = (text: string): void => {
    if (!text.trim()) return
    
    // 分割并清理邀请码
    const inputCodes = text.split(/[,，\n]/).map(code => code.trim()).filter(code => code)
    const existingCodes = formData.inviteCodes || []
    
    // 检测输入中的重复项
    const uniqueInputCodes = [...new Set(inputCodes)]
    const inputDuplicateCount = inputCodes.length - uniqueInputCodes.length
    
    // 去重：只添加不存在的邀请码
    const uniqueNewCodes = uniqueInputCodes.filter(code => !existingCodes.includes(code))
    
    // 检查导入后是否超过配额
    const willExceedQuota = existingCodes.length + uniqueNewCodes.length > totalQuota
    
    let allCodes: string[]
    
    if (willExceedQuota) {
      // 如果会超过配额，只取能填满配额的部分
      const remainingSlots = totalQuota - existingCodes.length
      const limitedNewCodes = uniqueNewCodes.slice(0, remainingSlots)
      allCodes = [...existingCodes, ...limitedNewCodes]
      
      toast.warning(`只导入了 ${limitedNewCodes.length} 个邀请码，已达到配额上限 ${totalQuota}`)
    } else {
      // 不超过配额，全部添加
      allCodes = [...existingCodes, ...uniqueNewCodes]
      
      // 显示导入结果提示
      if (uniqueNewCodes.length > 0) {
        toast.success(`成功导入 ${uniqueNewCodes.length} 个邀请码`)
      }
    }
    
    // 显示与已有邀请码重复的提示
    const existingDuplicateCount = uniqueInputCodes.length - uniqueNewCodes.length
    
    // 显示重复提示
    if (inputDuplicateCount > 0) {
      toast.info(`输入中包含 ${inputDuplicateCount} 个重复邀请码，已自动去重`)
    }
    
    if (existingDuplicateCount > 0) {
      toast.info(`跳过 ${existingDuplicateCount} 个已存在的邀请码`)
    }
    
    updateField("inviteCodes", allCodes)
    setBatchInput("")
    setErrorMsg(null)
    
    // 如果填满了配额，显示特别提示
    if (allCodes.length === totalQuota) {
      toast.success(`邀请码数量已达到配额 ${totalQuota}`)
    }
  }

  // 获取当前分发模式
  const currentDistributionMode = formData.distributionMode as DistributionModeType || "SINGLE"
  
  // 计算已添加邀请码数量和剩余配额
  const inviteCodesCount = formData.inviteCodes?.length || 0
  const remainingQuota = totalQuota - inviteCodesCount
  const isQuotaFull = remainingQuota <= 0
  
  // 从常量文件获取分发模式选项，并添加图标和颜色
  const distributionModes: ExtendedDistributionModeOption[] = getDistributionModeOptions().map((mode): ExtendedDistributionModeOption => ({
    ...mode,
    icon: mode.value === "SINGLE" ? UserCheck : mode.value === "MULTI" ? Users : Lock,
    color: mode.value === "SINGLE" 
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : mode.value === "MULTI" 
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-orange-50 border-orange-200 text-orange-700"
  }))

  return (
    <div className="space-y-4">
      {/* 分发模式选择 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <Label className="text-sm font-medium">
          分发模式 <span className="text-red-500">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {distributionModes.map((mode) => {
            const Icon = mode.icon
            const isSelected = currentDistributionMode === mode.value
            return (
              <div
                key={mode.value}
                className={`relative cursor-pointer rounded-lg p-4 transition-all ${
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" 
                    : "bg-card border border-border hover:border-muted-foreground/40"
                }`}
                onClick={() => updateField("distributionMode", mode.value)}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  <div className="flex-1 space-y-1">
                    <div className={`font-medium text-sm ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                      {mode.label}
                    </div>
                    <div className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {mode.description}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      {/* 公开设置 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">公开显示</Label>
            <p className="text-xs text-muted-foreground">
              开启后其他用户可以在项目列表中看到此项目
            </p>
          </div>
          <Switch
            checked={formData.isPublic ?? true}
            onCheckedChange={(checked) => updateField("isPublic", checked)}
          />
        </div>
      </div>

      {/* 一码一用模式 */}
      {currentDistributionMode === "SINGLE" && (
        <div className="space-y-3">
          {/* 邀请码管理 */}
          <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
            {/* 设置密码 */}
            <div className="space-y-2">
              <Label htmlFor="claimPassword" className="text-sm font-medium">
                设置密码<span className="text-muted-foreground">（可选）</span>
              </Label>
              <Input
                id="claimPassword"
                placeholder="至少6位，用户需要输入密码才能领取"
                value={formData.claimPassword || ""}
                onChange={(e) => updateField("claimPassword", e.target.value)}
                minLength={6}
                className="h-10 shadow-none"
              />
            </div>
            
            <div className="flex items-center">
              <Label className="text-sm font-medium">邀请码/链接 <span className="text-red-500">*</span></Label>
            </div>
            
            {/* 添加邀请码表单 */}
            <div className="space-y-2">
              {/* 错误信息显示 */}
              {errorMsg && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {/* 单个邀请码输入 */}
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addInviteCode()
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addInviteCode}
                  disabled={!codeInput.trim() || isQuotaFull}
                  className="h-10 w-10 px-4 shadow-none"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 批量导入 */}
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (batchInput.trim()) {
                        parseCodesFromText(batchInput)
                      }
                    }}
                    disabled={!batchInput.trim() || isQuotaFull}
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

            {/* 当前邀请码列表 - 移动到底部 */}
            {inviteCodesCount > 0 && (
              <div className="mt-4">
                {/* 配额显示 */}
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>已添加 {inviteCodesCount} 个邀请码，                   
                    {isQuotaFull 
                      ? "已达到配额上限" 
                      : `还需添加 ${remainingQuota} 个邀请码`}
                  </span>

                  <div className="flex items-center gap-2">
                    {inviteCodesCount > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateField("inviteCodes", [])}
                        className="h-2 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        清空全部
                      </Button>
                    )}
                    <Badge 
                      variant={isQuotaFull ? "default" : "outline"} 
                      className={`text-xs ${isQuotaFull ? "bg-green-600" : ""}`}
                    >
                      {inviteCodesCount} / {totalQuota}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="h-44 rounded border border-input bg-muted/50 px-1">
                  <div className="space-y-2 py-3 px-1">
                    {formData.inviteCodes?.map((code, index) => (
                      <div key={index} className="flex items-center gap-3 px-2 bg-card rounded">
                        <code className="flex-1 text-sm font-mono truncate h-4">{code}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInviteCode(index)}
                          className="h-8 w-8 p-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 一码多用模式 */}
      {currentDistributionMode === "MULTI" && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
          {/* 领取密码 */}
          <div className="space-y-2">
            <Label htmlFor="claimPasswordMulti" className="text-sm font-medium">
              设置密码<span className="text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="claimPasswordMulti"
              placeholder="至少6位，用户需要输入密码才能领取"
              value={formData.claimPassword || ""}
              onChange={(e) => updateField("claimPassword", e.target.value)}
              minLength={6}
              className="h-10 shadow-none"
            />
          </div>

          {/* 邀请码 */}
          <div className="space-y-2">
            <Label htmlFor="singleInviteCode" className="text-sm font-medium">
              邀请码/链接 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="singleInviteCode"
                placeholder="输入邀请码或链接"
                value={formData.singleInviteCode || ""}
                onChange={(e) => updateField("singleInviteCode", e.target.value)}
                className="h-10 pr-16 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {totalQuota}人可用
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 手动邀请模式 */}
      {currentDistributionMode === "MANUAL" && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
            {/* 问题1 */}
            <div className="space-y-2">
              <Label htmlFor="question1" className="text-sm font-medium">
                问题1 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="question1"
                  placeholder="输入问题"
                  value={formData.question1 || ""}
                  onChange={(e) => updateField("question1", e.target.value)}
                  maxLength={16}
                  className="h-10 pr-12 shadow-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {(formData.question1 || "").length}/16
                </span>
              </div>
            </div>

            {/* 问题2 */}
            <div className="space-y-2">
              <Label htmlFor="question2" className="text-sm font-medium">
                问题2<span className="text-muted-foreground">（可选）</span>
              </Label>
              <div className="relative">
                <Input
                  id="question2"
                  placeholder="输入问题"
                  value={formData.question2 || ""}
                  onChange={(e) => updateField("question2", e.target.value)}
                  maxLength={16}
                  className="h-10 pr-12 shadow-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {(formData.question2 || "").length}/16
                </span>
              </div>
          </div>
          <p className="text-xs text-muted-foreground">
            用户申请时需要回答这些问题，你可以根据需要设置对应的问题
          </p>
        </div>
      )}
    </div>
  )
} 