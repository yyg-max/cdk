"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ClaimRestrictionsProps, TrustLevel } from "./types"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

/**
 * 信任等级选项配置
 */
const TRUST_LEVELS: readonly TrustLevel[] = [
  { value: 0, label: "0级 - 新用户" },
  { value: 1, label: "1级 - 基本用户" },
  { value: 2, label: "2级 - 成员" },
  { value: 3, label: "3级 - 活跃用户" },
  { value: 4, label: "4级 - 领导者" }
] as const

/**
 * 风控阈值配置
 */
const RISK_CONFIG = {
  MIN: 30,
  MAX: 90,
  DEFAULT: 80,
  STEP: 1
} as const

/**
 * 领取限制配置组件
 * 用于项目创建流程中的领取限制设置
 * 
 * @param formData - 表单数据
 * @param setFormData - 表单数据更新函数
 */
export function ClaimRestrictions({ formData, setFormData }: ClaimRestrictionsProps) {
  // 错误状态管理
  const [timeError, setTimeError] = useState<string | null>(null)
  
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
   * 获取当前中国时间
   * @returns 中国时区的当前时间
   */
  const getCurrentChinaTime = (): Date => {
    const now = new Date()
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)) // UTC+8
    return chinaTime
  }
  
  /**
   * 验证时间设置是否有效
   */
  useEffect(() => {
    // 清除错误
    setTimeError(null)
    
    // 如果没有设置结束时间或者无期限，则无需验证
    if (formData.endTime === null) return
    
    // 如果开始时间和结束时间都存在，验证结束时间不早于开始时间
    if (formData.startTime && formData.endTime && formData.endTime < formData.startTime) {
      setTimeError("结束时间不能早于开始时间")
    }
  }, [formData.startTime, formData.endTime])
  
  /**
   * 当开始时间变更时，确保结束时间不早于开始时间
   */
  useEffect(() => {
    if (formData.startTime && formData.endTime && formData.endTime < formData.startTime) {
      // 设置结束时间为开始时间后的一小时
      const newEndTime = new Date(formData.startTime)
      newEndTime.setHours(newEndTime.getHours() + 1)
      updateField("endTime", newEndTime)
    }
  }, [formData.startTime]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 获取风控等级文本描述
   * @param value - 风控阈值
   * @returns 风控等级描述
   */
  const getRiskLevelText = (value: number): string => {
    if (value >= 85) return "严格"
    if (value >= 75) return "推荐"
    if (value >= 60) return "一般"
    return "宽松"
  }

  /**
   * 获取风控等级颜色
   * @param value - 风控阈值
   * @returns CSS颜色值
   */
  const getRiskLevelColor = (value: number): string => {
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

  /**
   * 获取风控滑块样式
   * @returns CSS样式对象
   */
  const getRiskSliderStyle = (): React.CSSProperties => {
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

  /**
   * 处理时间输入更新
   * @param date - 日期对象
   * @param timeType - 时间类型
   * @param timeField - 时间字段 ('hours' | 'minutes' | 'seconds')
   * @param value - 新值
   */
  const handleTimeUpdate = (
    date: Date | null | undefined, 
    timeType: 'startTime' | 'endTime', 
    timeField: 'hours' | 'minutes' | 'seconds', 
    value: number
  ): void => {
    if (!date) return
    
    const newDate = new Date(date)
    
    switch (timeField) {
      case 'hours':
        newDate.setHours(Math.min(23, Math.max(0, value)))
        break
      case 'minutes':
        newDate.setMinutes(Math.min(59, Math.max(0, value)))
        break
      case 'seconds':
        newDate.setSeconds(Math.min(59, Math.max(0, value)))
        break
    }
    
    // 验证新时间不早于开始时间（仅对结束时间）
    if (timeType === 'endTime' && formData.startTime && newDate < formData.startTime) {
      setTimeError("结束时间不能早于开始时间")
    } else {
      setTimeError(null)
      updateField(timeType, newDate)
    }
  }

  // 默认风控阈值
  const currentRiskThreshold = formData.minRiskThreshold || RISK_CONFIG.DEFAULT

  return (
    <div className="space-y-4">
      {/* 时间设置错误提示 */}
      {timeError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{timeError}</AlertDescription>
        </Alert>
      )}
      
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
                  format(formData.startTime, "yyyy年MM月dd日 HH:mm:ss", { locale: zhCN })
                ) : (
                  <span className="text-muted-foreground">选择开始时间</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startTime}
                onSelect={(date) => updateField("startTime", date || getCurrentChinaTime())}
                initialFocus
                locale={zhCN}
              />
              <div className="p-3 border-t space-y-3">
                <div>
                  <Label htmlFor="startTimeInput" className="text-sm">时间 (时:分:秒)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="startTimeHours"
                      type="number"
                      min="0"
                      max="23"
                      value={formData.startTime ? formData.startTime.getHours() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.startTime, 
                        'startTime', 
                        'hours', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                    <span>:</span>
                    <Input
                      id="startTimeMinutes"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.startTime ? formData.startTime.getMinutes() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.startTime, 
                        'startTime', 
                        'minutes', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                    <span>:</span>
                    <Input
                      id="startTimeSeconds"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.startTime ? formData.startTime.getSeconds() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.startTime, 
                        'startTime', 
                        'seconds', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateField("startTime", getCurrentChinaTime())}
                  className="w-full mt-1"
                >
                  设为当前时间
                </Button>
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
                onCheckedChange={(checked) => updateField("endTime", checked ? null : (() => {
                  // 如果有开始时间，则设置为开始时间后的一小时
                  if (formData.startTime) {
                    const newEndTime = new Date(formData.startTime)
                    newEndTime.setHours(newEndTime.getHours() + 1)
                    return newEndTime
                  }
                  return getCurrentChinaTime()
                })())}
              />
            </div>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal h-10 shadow-none ${timeError ? 'border-red-500' : ''}`}
                disabled={formData.endTime === null}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.endTime === null ? (
                  <span className="text-muted-foreground">无期限</span>
                ) : (
                  <span>
                    {formData.endTime 
                      ? format(formData.endTime, "yyyy年MM月dd日 HH:mm:ss", { locale: zhCN })
                      : <span className="text-muted-foreground">选择结束时间</span>
                    }
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.endTime || undefined}
                onSelect={(date) => {
                  if (!date) {
                    updateField("endTime", null)
                    return
                  }
                  
                  // 如果选择了新日期，确保时间不早于开始时间
                  if (formData.startTime) {
                    const startDateOnly = new Date(formData.startTime)
                    startDateOnly.setHours(0, 0, 0, 0)
                    
                    const selectedDateOnly = new Date(date)
                    selectedDateOnly.setHours(0, 0, 0, 0)
                    
                    // 如果选择的日期早于开始日期，使用开始日期
                    if (selectedDateOnly < startDateOnly) {
                      const newDate = new Date(formData.startTime)
                      newDate.setHours(
                        formData.endTime ? formData.endTime.getHours() : formData.startTime.getHours() + 1,
                        formData.endTime ? formData.endTime.getMinutes() : 0,
                        formData.endTime ? formData.endTime.getSeconds() : 0
                      )
                      updateField("endTime", newDate)
                      return
                    }
                  }
                  
                  // 处理正常的日期选择
                  if (formData.endTime) {
                    const newDate = new Date(date)
                    newDate.setHours(
                      formData.endTime.getHours(),
                      formData.endTime.getMinutes(),
                      formData.endTime.getSeconds()
                    )
                    updateField("endTime", newDate)
                  } else {
                    const newDate = new Date(date)
                    if (formData.startTime) {
                      newDate.setHours(
                        formData.startTime.getHours() + 1,
                        formData.startTime.getMinutes(),
                        formData.startTime.getSeconds()
                      )
                    } else {
                      const now = new Date()
                      newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
                    }
                    updateField("endTime", newDate)
                  }
                }}
                initialFocus
                locale={zhCN}
              />
              <div className="p-3 border-t space-y-3">
                <div>
                  <Label htmlFor="endTimeInput" className="text-sm">时间 (时:分:秒)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="endTimeHours"
                      type="number"
                      min="0"
                      max="23"
                      value={formData.endTime ? formData.endTime.getHours() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.endTime, 
                        'endTime', 
                        'hours', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                    <span>:</span>
                    <Input
                      id="endTimeMinutes"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.endTime ? formData.endTime.getMinutes() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.endTime, 
                        'endTime', 
                        'minutes', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                    <span>:</span>
                    <Input
                      id="endTimeSeconds"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.endTime ? formData.endTime.getSeconds() : 0}
                      onChange={(e) => handleTimeUpdate(
                        formData.endTime, 
                        'endTime', 
                        'seconds', 
                        parseInt(e.target.value) || 0
                      )}
                      className="shadow-none w-15"
                    />
                  </div>
                </div>
                
                {formData.startTime && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const newEndTime = new Date(formData.startTime as Date)
                      newEndTime.setHours(newEndTime.getHours() + 1)
                      updateField("endTime", newEndTime)
                    }}
                    className="w-full mt-1"
                  >
                    设为开始时间后一小时
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {timeError && <p className="text-xs text-red-500 mt-1">{timeError}</p>}
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
            onCheckedChange={(checked) => updateField("requireLinuxdo", checked)}
          />
        </div>

        {formData.requireLinuxdo !== false && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              最低信任等级 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.minTrustLevel?.toString() || "2"} 
              onValueChange={(value) => updateField("minTrustLevel", parseInt(value))}
            >
              <SelectTrigger className="h-10 shadow-none">
                <SelectValue placeholder="选择最低信任等级" />
              </SelectTrigger>
              <SelectContent>
                {TRUST_LEVELS.map((level) => (
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
            style={{ color: getRiskLevelColor(currentRiskThreshold) }}
          >
            {currentRiskThreshold} - {getRiskLevelText(currentRiskThreshold)}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="px-3 relative">
            {/* 渐变背景条 */}
            <div 
              className="absolute inset-0 h-2 rounded-full top-1/2 transform -translate-y-1/2"
              style={getRiskSliderStyle()}
            />
            <input
              id="minRiskThreshold"
              type="range"
              min={RISK_CONFIG.MIN}
              max={RISK_CONFIG.MAX}
              step={RISK_CONFIG.STEP}
              value={currentRiskThreshold}
              onChange={(e) => updateField("minRiskThreshold", parseInt(e.target.value))}
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
                background: ${getRiskLevelColor(currentRiskThreshold)};
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              }
              
              input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${getRiskLevelColor(currentRiskThreshold)};
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