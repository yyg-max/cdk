"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { X, Plus, Lock, Users, UserCheck } from "lucide-react"
import { getDistributionModeOptions, DISTRIBUTION_MODE_DISPLAY } from "@/lib/constants"

interface DistributionFormData {
  distributionMode?: string
  isPublic?: boolean
  claimPassword?: string
  inviteCodes?: string[]
  singleInviteCode?: string
  question1?: string
  question2?: string
}

interface DistributionContentProps {
  formData: DistributionFormData
  setFormData: (data: DistributionFormData) => void
  totalQuota: number
}

export function DistributionContent({ formData, setFormData, totalQuota }: DistributionContentProps) {
  const [codeInput, setCodeInput] = useState("")
  const [batchInput, setBatchInput] = useState("")

  const updateFormData = (field: string, value: string | boolean | string[]) => {
    setFormData({ ...formData, [field]: value })
  }

  const addInviteCode = () => {
    if (codeInput.trim()) {
      const newCodes = [...(formData.inviteCodes || []), codeInput.trim()]
      updateFormData("inviteCodes", newCodes)
      setCodeInput("")
    }
  }

  const removeInviteCode = (index: number) => {
    const newCodes = formData.inviteCodes?.filter((_, i) => i !== index) || []
    updateFormData("inviteCodes", newCodes)
  }

  const parseCodesFromText = (text: string) => {
    const newCodes = text.split(/[,，\n]/).map(code => code.trim()).filter(code => code)
    const existingCodes = formData.inviteCodes || []
    // 去重：只添加不存在的邀请码
    const uniqueNewCodes = newCodes.filter(code => !existingCodes.includes(code))
    const allCodes = [...existingCodes, ...uniqueNewCodes]
    updateFormData("inviteCodes", allCodes)
    
    // 可以在这里添加提示信息
    if (uniqueNewCodes.length > 0) {
      console.log(`成功导入 ${uniqueNewCodes.length} 个邀请码`)
    }
    if (newCodes.length > uniqueNewCodes.length) {
      console.log(`跳过 ${newCodes.length - uniqueNewCodes.length} 个重复邀请码`)
    }
  }

  // 从常量文件获取分发模式选项，并添加图标和颜色
  const distributionModes = getDistributionModeOptions().map((mode) => ({
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
            const isSelected = formData.distributionMode === mode.value
            return (
              <div
                key={mode.value}
                className={`relative cursor-pointer rounded-lg p-4 transition-all ${
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2" 
                    : "bg-card border border-border hover:border-muted-foreground/40"
                }`}
                onClick={() => updateFormData("distributionMode", mode.value)}
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
            onCheckedChange={(checked) => updateFormData("isPublic", checked)}
          />
        </div>
      </div>

      {/* 一码一用模式 */}
      {formData.distributionMode === "SINGLE" && (
        <div className="space-y-3">
          {/* 邀请码管理 */}
          <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
            {/* 设置密码 */}
          <div className="space-y-2">
            <Label htmlFor="claimPassword" className="text-sm font-medium">设置密码<span className="text-muted-foreground">（可选）</span></Label>
            <Input
              id="claimPassword"
              type="password"
              placeholder="至少6位，用户需要输入密码才能领取"
              value={formData.claimPassword || ""}
              onChange={(e) => updateFormData("claimPassword", e.target.value)}
              minLength={6}
              className="h-10 shadow-none"
            />
          </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">邀请码/链接 <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                {(formData.inviteCodes?.length ?? 0) > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFormData("inviteCodes", [])}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    清空全部
                  </Button>
                )}
                <Badge variant="outline" className="text-xs">
                  {formData.inviteCodes?.length || 0} / {totalQuota}
                </Badge>
              </div>
            </div>

            {/* 当前邀请码列表 */}
            {(formData.inviteCodes?.length ?? 0) > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {formData.inviteCodes?.map((code, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <code className="flex-1 text-sm font-mono truncate">{code}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInviteCode(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 添加邀请码 */}
            <div className="flex gap-2">
              <Input
                placeholder="输入邀请码或链接"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
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
                disabled={!codeInput.trim()}
                className="h-10 w-10 px-4 shadow-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 批量导入 */}
            <div className="space-y-2">
              <Label htmlFor="batchCodes" className="text-xs text-muted-foreground">批量导入</Label>
              <div className="space-y-2">
                <Textarea
                  id="batchCodes"
                  placeholder="支持多种快速导入格式：code1,code2,code3 或 每行一个邀请码"
                  rows={3}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
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
                        setBatchInput("")
                      }
                    }}
                    disabled={!batchInput.trim()}
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
          </div>
        </div>
      )}

      {/* 一码多用模式 */}
      {formData.distributionMode === "MULTI" && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
          {/* 领取密码 */}
          <div className="space-y-2">
            <Label htmlFor="claimPassword" className="text-sm font-medium">设置密码<span className="text-muted-foreground">（可选）</span></Label>
            <Input
              id="claimPassword"
              type="password"
              placeholder="至少6位，用户需要输入密码才能领取"
              value={formData.claimPassword || ""}
              onChange={(e) => updateFormData("claimPassword", e.target.value)}
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
                onChange={(e) => updateFormData("singleInviteCode", e.target.value)}
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
      {formData.distributionMode === "MANUAL" && (
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
                  onChange={(e) => updateFormData("question1", e.target.value)}
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
              <Label htmlFor="question2" className="text-sm font-medium">问题2<span className="text-muted-foreground">（可选）</span></Label>
              <div className="relative">
                <Input
                  id="question2"
                  placeholder="输入问题"
                  value={formData.question2 || ""}
                  onChange={(e) => updateFormData("question2", e.target.value)}
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