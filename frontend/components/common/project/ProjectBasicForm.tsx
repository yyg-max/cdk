'use client';

import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {TagSelector} from '@/components/ui/tag-selector';
import {DateTimePicker} from '@/components/ui/DateTimePicker';
import {Checkbox} from '@/components/animate-ui/radix/checkbox';
import MarkdownEditor from '@/components/common/markdown/Editor';
import {FORM_LIMITS, TRUST_LEVEL_OPTIONS} from '@/components/common/project';
import {TrustLevel} from '@/lib/services/core/types';
import {ProjectFormData} from '@/hooks/use-project-form';

interface ProjectBasicFormProps {
  formData: ProjectFormData;
  onFormDataChange: (data: ProjectFormData) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: string[];
  isMobile: boolean;
}

export function ProjectBasicForm({
  formData,
  onFormDataChange,
  tags,
  onTagsChange,
  availableTags,
  isMobile,
}: ProjectBasicFormProps) {
  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    onFormDataChange({...formData, [field]: value});
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">项目名称 *</Label>
        <Input
          id="name"
          placeholder={`请填写此项目的名称（${FORM_LIMITS.PROJECT_NAME_MAX_LENGTH}字符以内）`}
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          maxLength={FORM_LIMITS.PROJECT_NAME_MAX_LENGTH}
        />
      </div>

      <div className="space-y-2">
        <Label>项目标签</Label>
        <TagSelector
          selectedTags={tags}
          availableTags={availableTags}
          maxTagLength={FORM_LIMITS.TAG_MAX_LENGTH}
          maxTags={FORM_LIMITS.MAX_TAGS}
          onTagsChange={onTagsChange}
          placeholder="请选择或添加关联标签"
          isMobile={isMobile}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">项目描述</Label>
        <MarkdownEditor
          value={formData.description}
          onChange={(value) => updateField('description', value)}
          placeholder={`请输入项目描述，支持Markdown格式（${FORM_LIMITS.DESCRIPTION_MAX_LENGTH}字符以内）`}
          maxLength={FORM_LIMITS.DESCRIPTION_MAX_LENGTH}
          className="w-full"
        />
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        <DateTimePicker
          label="开始时间"
          value={formData.startTime}
          onChange={(date) => updateField('startTime', date || new Date())}
          placeholder="选择开始时间"
          required
        />
        <DateTimePicker
          label="结束时间"
          value={formData.endTime}
          onChange={(date) => updateField('endTime', date || new Date())}
          placeholder="选择结束时间"
          required
        />
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        <div className="space-y-2">
          <Label>最低信任等级</Label>
          <Select
            value={formData.minimumTrustLevel.toString()}
            onValueChange={(value) => updateField('minimumTrustLevel', parseInt(value) as TrustLevel)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRUST_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="riskLevel">最高风险系数</Label>
          <Input
            id="riskLevel"
            type="number"
            min={0}
            max={100}
            value={formData.riskLevel}
            onChange={(e) =>
              updateField(
                  'riskLevel',
                  Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
              )
            }
            placeholder="输入0-100的风险系数"
          />
        </div>
      </div>

      <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
        <Checkbox
          id="allowSameIP"
          checked={formData.allowSameIP}
          onCheckedChange={(checked) => updateField('allowSameIP', checked === true)}
          className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
        />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">IP 管控</p>
          <p className="text-muted-foreground text-sm">
            如果开启，则同一个 IP 可以多次领取内容。
          </p>
        </div>
      </Label>
    </>
  );
}
