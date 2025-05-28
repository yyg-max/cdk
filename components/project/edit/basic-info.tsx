"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCategoryOptions, getProjectStatusOptions } from "@/lib/constants"
import type { EditBasicInfoProps } from "./types"
import type { ProjectCategory, ProjectStatus } from "../read/types"

/**
 * 项目基本信息编辑组件
 * 
 * @description 提供项目名称、描述、分类、使用地址、教程和状态的编辑功能
 * @param props - 组件属性
 * @returns React 功能组件
 */
export function EditBasicInfo({ formData, setFormData }: EditBasicInfoProps) {
  /**
   * 更新单个表单字段
   * 
   * @param field - 要更新的字段名
   * @param value - 新的字段值
   */
  const updateField = <K extends keyof typeof formData>(
    field: K, 
    value: typeof formData[K]
  ): void => {
    setFormData({ [field]: value })
  }

  // 计算字段长度，带默认值处理
  const nameLength = (formData.name || "").length
  const descriptionLength = (formData.description || "").length
  const tutorialLength = (formData.tutorial || "").length

  return (
    <div className="space-y-4">
      {/* 基本信息区域 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        {/* 第一行：项目名称、项目分类 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              项目名称 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="项目名称"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={16}
                className="h-10 pr-12 shadow-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {nameLength}/16
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              项目分类 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => updateField("category", value as ProjectCategory)}
            >
              <SelectTrigger className="h-10 shadow-none">
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
        </div>

        {/* 第二行：使用地址、项目状态 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usageUrl" className="text-sm font-medium">
              使用地址<span className="text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="usageUrl"
              type="url"
              placeholder="https://example.com"
              value={formData.usageUrl || ""}
              onChange={(e) => updateField("usageUrl", e.target.value)}
              className="h-10 shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              项目状态 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => updateField("status", value as ProjectStatus)}
            >
              <SelectTrigger className="h-10 shadow-none">
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

        {/* 第三行：项目描述 */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            项目描述<span className="text-muted-foreground">（可选）</span>
          </Label>
          <div className="relative">
            <Textarea
              id="description"
              placeholder="简要描述你的项目"
              value={formData.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              maxLength={64}
              className="pr-12 shadow-none min-h-[80px]"
            />
            <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
              {descriptionLength}/64
            </span>
          </div>
        </div>

        {/* 第四行：使用教程 */}
        <div className="space-y-2">
          <Label htmlFor="tutorial" className="text-sm font-medium">
            使用教程<span className="text-muted-foreground">（可选）</span>
          </Label>
          <div className="relative">
            <Textarea
              id="tutorial"
              placeholder="详细说明如何使用你的项目..."
              value={formData.tutorial || ""}
              onChange={(e) => updateField("tutorial", e.target.value)}
              maxLength={256}
              rows={4}
              className="h-48 pr-12 shadow-none"
            />
            <span className="absolute right-3 bottom-3 text-xs text-muted-foreground">
              {tutorialLength}/256
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 