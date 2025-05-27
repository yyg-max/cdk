"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

interface ClaimRestrictionsFormData {
  startTime?: Date
  endTime?: Date | null
  requireLinuxdo?: boolean
  minTrustLevel?: number
  minRiskThreshold?: number
}

interface ClaimRestrictionsProps {
  formData: ClaimRestrictionsFormData
  setFormData: (data: ClaimRestrictionsFormData) => void
}

export function ClaimRestrictions({ formData, setFormData }: ClaimRestrictionsProps) {
  const updateFormData = (field: string, value: Date | boolean | number | null) => {
    setFormData({ ...formData, [field]: value })
  }

  // 获取当前中国时间
  const getCurrentChinaTime = () => {
    const now = new Date()
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)) // UTC+8
    return chinaTime
  }

  const trustLevels = [
    { value: 0, label: "0级 - 新用户" },
    { value: 1, label: "1级 - 基本用户" },
    { value: 2, label: "2级 - 成员" },
    { value: 3, label: "3级 - 活跃用户" },
    { value: 4, label: "4级 - 领导者" }
  ]

  const getRiskLevelText = (value: number) => {
    if (value >= 85) return "严格"
    if (value >= 75) return "推荐"
    if (value >= 60) return "一般"
    return "宽松"
  }

  const getRiskLevelColor = (value: number) => {
    if (value <= 55) {
      // 30-55 深红到浅红
      const intensity = Math.max(0, Math.min(1, (value - 30) / (55 - 30)))
      const red = Math.round(139 + (220 - 139) * intensity) // 深红#8B0000到浅红#DC143C
      const green = Math.round(20 + (20 - 20) * intensity)
      const blue = Math.round(60 + (60 - 60) * intensity)
      return `rgb(${red}, ${green}, ${blue})`
    } else if (value <= 75) {
      // 60-75 深黄到浅黄
      const intensity = Math.max(0, Math.min(1, (value - 60) / (75 - 60)))
      const red = Math.round(184 + (255 - 184) * intensity) // 深黄#B8860B到浅黄#FFD700
      const green = Math.round(134 + (215 - 134) * intensity)
      const blue = 11
      return `rgb(${red}, ${green}, ${blue})`
    } else {
      // 80-90 浅绿到深绿
      const intensity = Math.max(0, Math.min(1, (value - 80) / (90 - 80)))
      const red = 34
      const green = Math.round(144 + (139 - 144) * intensity) // 浅绿#90EE90到深绿#228B22
      const blue = 34
      return `rgb(${red}, ${green + 100}, ${blue})`
    }
  }

  const getRiskSliderStyle = (value: number) => {
    return {
      background: `linear-gradient(to right, 
        #8B0000 0%,    /* 深红 30 */
        #DC143C 16.7%, /* 浅红 55 */
        #B8860B 33.3%, /* 深黄 60 */
        #FFD700 50%,   /* 浅黄 75 */
        #90EE90 66.7%, /* 浅绿 80 */
        #228B22 100%)`, /* 深绿 90 */
      backgroundSize: '100% 100%'
    }
  }

  return (
    <div className="space-y-4">
      {/* 第一行：开始时间、结束时间 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            开始时间 <span className="text-red-500">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 shadow-none"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startTime ? (
                  format(formData.startTime, "yyyy年MM月dd日 HH:mm", { locale: zhCN })
                ) : (
                  <span className="text-muted-foreground">选择开始时间</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startTime}
                onSelect={(date) => updateFormData("startTime", date || getCurrentChinaTime())}
                initialFocus
              />
              <div className="p-3 border-t">
                <Label htmlFor="startTimeInput" className="text-sm">时间</Label>
                <Input
                  id="startTimeInput"
                  type="time"
                  value={formData.startTime ? format(formData.startTime, "HH:mm") : ""}
                  onChange={(e) => {
                    if (formData.startTime && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':')
                      const newDate = new Date(formData.startTime)
                      newDate.setHours(parseInt(hours), parseInt(minutes))
                      updateFormData("startTime", newDate)
                    }
                  }}
                  className="mt-2 shadow-none"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium">结束时间</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="noEndTime" className="text-xs text-muted-foreground">
                无期限
              </Label>
              <Switch
                id="noEndTime"
                checked={formData.endTime === null}
                onCheckedChange={(checked) => updateFormData("endTime", checked ? null : getCurrentChinaTime())}
              />
            </div>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 shadow-none"
                disabled={formData.endTime === null}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.endTime === null ? (
                  <span className="text-muted-foreground">无期限</span>
                ) : formData.endTime ? (
                  format(formData.endTime, "yyyy年MM月dd日 HH:mm", { locale: zhCN })
                ) : (
                  <span className="text-muted-foreground">选择结束时间</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.endTime || undefined}
                onSelect={(date) => updateFormData("endTime", date || getCurrentChinaTime())}
                initialFocus
              />
              <div className="p-3 border-t">
                <Label htmlFor="endTimeInput" className="text-sm">时间</Label>
                <Input
                  id="endTimeInput"
                  type="time"
                  value={formData.endTime ? format(formData.endTime, "HH:mm") : ""}
                  onChange={(e) => {
                    if (formData.endTime && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':')
                      const newDate = new Date(formData.endTime)
                      newDate.setHours(parseInt(hours), parseInt(minutes))
                      updateFormData("endTime", newDate)
                    }
                  }}
                  className="mt-2 shadow-none"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 第二行：LinuxDo认证设置 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">LinuxDo认证</Label>
            <p className="text-xs text-muted-foreground">
              开启后只有通过LinuxDo认证的用户才能领取
            </p>
          </div>
          <Switch
            checked={formData.requireLinuxdo ?? true}
            onCheckedChange={(checked) => updateFormData("requireLinuxdo", checked)}
          />
        </div>

        {formData.requireLinuxdo !== false && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              最低信任等级 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.minTrustLevel?.toString() || "2"} 
              onValueChange={(value) => updateFormData("minTrustLevel", parseInt(value))}
            >
              <SelectTrigger className="h-10 shadow-none">
                <SelectValue placeholder="选择最低信任等级" />
              </SelectTrigger>
              <SelectContent>
                {trustLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value.toString()}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              只有达到此信任等级及以上的用户才能领取
            </p>
          </div>
        )}
      </div>

      {/* 第三行：风控阈值 */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed bg-muted/30">
        <div className="flex items-center justify-between">
          <Label htmlFor="minRiskThreshold" className="text-sm font-medium">
            风控阈值 <span className="text-red-500">*</span>
          </Label>
          <div 
            className="text-sm font-medium"
            style={{ color: getRiskLevelColor(formData.minRiskThreshold || 80) }}
          >
            {formData.minRiskThreshold || 80} - {getRiskLevelText(formData.minRiskThreshold || 80)}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="px-3 relative">
            {/* 渐变背景条 */}
            <div 
              className="absolute inset-0 h-2 rounded-full top-1/2 transform -translate-y-1/2"
              style={getRiskSliderStyle(formData.minRiskThreshold || 80)}
            />
            <input
              id="minRiskThreshold"
              type="range"
              min="30"
              max="90"
              step="1"
              value={formData.minRiskThreshold || 80}
              onChange={(e) => updateFormData("minRiskThreshold", parseInt(e.target.value))}
              className="w-full relative z-10 bg-transparent appearance-none h-2 rounded-full outline-none"
              style={{
                background: 'transparent',
                WebkitAppearance: 'none',
              }}
            />
            <style jsx>{`
              input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getRiskLevelColor(formData.minRiskThreshold || 80)};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              
              input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getRiskLevelColor(formData.minRiskThreshold || 80)};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                border: none;
              }
            `}</style>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground px-3">
            <span>30 (宽松)</span>
            <span>55 (过渡)</span>
            <span>75 (一般)</span>
            <span>85 (严格)</span>
            <span>90 (最严)</span>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          风控阈值越高，对用户的要求越严格。推荐使用75-80以确保用户质量。
        </p>
      </div>
    </div>
  )
} 