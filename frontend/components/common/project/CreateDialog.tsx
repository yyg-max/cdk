'use client';

import {useState, useEffect} from 'react';
import {useIsMobile} from '@/hooks/use-mobile';
import {toast} from 'sonner';
import {Badge} from '@/components/ui/badge';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {FileUpload} from '@/components/ui/file-upload';
import {TagSelector} from '@/components/ui/tag-selector';
import {DateTimePicker} from '@/components/ui/DateTimePicker';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Checkbox} from '@/components/animate-ui/radix/checkbox';
import {Counter} from '@/components/animate-ui/components/counter';
import {Tabs, TabsList, TabsTrigger, TabsContent, TabsContents} from '@/components/animate-ui/radix/tabs';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/animate-ui/radix/dialog';
import {FORM_LIMITS, DEFAULT_FORM_VALUES, TRUST_LEVEL_OPTIONS, handleBulkImportContentWithFilter, validateProjectForm} from '@/components/common/project';
import MarkdownEditor from '@/components/common/markdown/Editor';
import {X, Plus, User, Lock, Copy, ExternalLink, CheckCircle} from 'lucide-react';
import services from '@/lib/services';
import {TrustLevel} from '@/lib/services/core/types';
import {DistributionType, ProjectListItem} from '@/lib/services/project/types';

interface ProjectInfo {
  id: string;
  name: string;
}

/**
 * 创建项目对话框组件
 */
export function CreateDialog({
  children,
  onProjectCreated,
}: {
  children?: React.ReactNode;
  onProjectCreated?: (project: ProjectListItem) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectInfo | null>(
      null,
  );
  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + DEFAULT_FORM_VALUES.TIME_OFFSET_24H),
    minimumTrustLevel: TrustLevel.BASIC_USER,
    allowSameIP: false,
    riskLevel: DEFAULT_FORM_VALUES.RISK_LEVEL,
    distributionType: DistributionType.ONE_FOR_EACH,
  });

  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [bulkContent, setBulkContent] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  /**
   * 获取可用标签列表
   */
  const fetchTags = async () => {
    try {
      const result = await services.project.getTagsSafe();
      if (result.success) {
        setAvailableTags(result.tags);
      } else {
        setAvailableTags([]);
        console.warn('获取标签列表失败:', result.error);
      }
    } catch (error) {
      console.error('获取标签失败:', error);
      setAvailableTags([]);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  /**
   * 重置表单状态
   */
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startTime: new Date(),
      endTime: new Date(Date.now() + DEFAULT_FORM_VALUES.TIME_OFFSET_24H),
      minimumTrustLevel: TrustLevel.BASIC_USER,
      allowSameIP: false,
      riskLevel: DEFAULT_FORM_VALUES.RISK_LEVEL,
      distributionType: DistributionType.ONE_FOR_EACH,
    });
    setTags([]);
    setItems([]);
    setActiveTab('basic');
    setBulkContent('');
    setAllowDuplicates(false);
    setCreateSuccess(false);
    setCreatedProject(null);
    setFileUploadOpen(false);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  /**
   * 批量导入分发内容
   */
  const handleBulkImport = () => {
    handleBulkImportContentWithFilter(
        bulkContent,
        items,
        allowDuplicates,
        (newItems: string[], importedCount: number, skippedInfo?: string) => {
          setItems(newItems);
          setBulkContent('');
          const message = `成功导入 ${importedCount} 个内容${skippedInfo || ''}`;
          toast.success(message);
        },
        (errorMessage: string) => {
          toast.error(errorMessage);
        },
    );
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];

    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast.error('仅支持上传 .txt 格式的文件');
      return;
    }

    // 检查文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        // 按行分割并过滤空行
        const lines = content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
          toast.error('文件内容为空');
          return;
        }

        // 执行导入
        handleBulkImportContentWithFilter(
            lines.join('\n'),
            items,
            allowDuplicates,
            (newItems: string[], importedCount: number, skippedInfo?: string) => {
              setItems(newItems);
              const message = `从文件成功导入 ${importedCount} 个内容${skippedInfo || ''}`;
              toast.success(message);
              setFileUploadOpen(false);
            },
            (errorMessage: string) => {
              toast.error(errorMessage);
            },
        );
      }
    };

    reader.onerror = () => {
      toast.error('文件读取失败');
    };

    reader.readAsText(file, 'UTF-8');
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const baseValidation = validateProjectForm({
      name: formData.name,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });

    if (!baseValidation.isValid) {
      toast.error(baseValidation.errorMessage!);
      return false;
    }

    // 手动邀请模式暂时不可用
    if (formData.distributionType === DistributionType.INVITE) {
      toast.error('手动邀请功能正在开发中，暂时无法创建');
      setActiveTab('distribution');
      return false;
    }

    if (
      formData.distributionType === DistributionType.ONE_FOR_EACH &&
      items.length === 0
    ) {
      toast.error('至少需要添加一个分发内容');
      setActiveTab('distribution');
      return false;
    }

    return true;
  };

  /**
   * 提交表单创建项目
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        project_tags: tags.length > 0 ? tags : undefined,
        start_time: formData.startTime.toISOString(),
        end_time: formData.endTime.toISOString(),
        minimum_trust_level: formData.minimumTrustLevel,
        allow_same_ip: formData.allowSameIP,
        risk_level: formData.riskLevel,
        distribution_type: formData.distributionType,
        project_items:
          formData.distributionType === DistributionType.ONE_FOR_EACH ?
            items :
            ['手动邀请模式'],
      };

      const result = await services.project.createProjectSafe(projectData);

      if (!result.success) {
        toast.error(result.error || '创建项目失败');
        return;
      }

      if (!result.data?.projectId) {
        toast.error('创建项目失败：未获取到项目ID');
        return;
      }

      const projectId = result.data.projectId;
      const newProject = {
        id: projectId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: tags,
        start_time: formData.startTime.toISOString(),
        end_time: formData.endTime.toISOString(),
        minimum_trust_level: formData.minimumTrustLevel,
        allow_same_ip: formData.allowSameIP,
        risk_level: formData.riskLevel,
        distribution_type: formData.distributionType,
        total_items: items.length,
        created_at: new Date().toISOString(),
      };

      setCreateSuccess(true);
      setCreatedProject({id: projectId, name: formData.name.trim()});
      toast.success('项目创建成功！');

      onProjectCreated?.(newProject);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建项目失败';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getReceiveLink = (projectId: string): string => {
    const baseUrl =
      process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || window.location.origin;
    return `${baseUrl}/receive/${projectId}`;
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('链接已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败，请手动复制');
      console.warn('Clipboard API failed:', err);
    }
  };

  const openLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建项目
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-3xl max-h-[90vh]'} overflow-hidden`}
      >
        <DialogHeader>
          <DialogTitle>
            {createSuccess ? '项目创建成功' : '创建新项目'}
          </DialogTitle>
          <DialogDescription>
            {createSuccess ?
              '您的项目已创建成功，可以开始分发内容了' :
              '创建一个新的项目来管理和分发您的内容'}
          </DialogDescription>
        </DialogHeader>

        {createSuccess && createdProject ? (
          <div className="space-y-6 py-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <h3 className="text-lg font-semibold">项目创建成功</h3>
                  <p className="text-sm text-muted-foreground">
                    项目名称：{createdProject.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">项目领取链接</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  用户可以通过此链接领取您分发的内容
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={getReceiveLink(createdProject.id)}
                  readOnly
                  className="bg-gray-100 border-none text-sm h-8"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyLink(getReceiveLink(createdProject.id))}
                  className={isMobile ? 'w-full' : ''}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openLink(getReceiveLink(createdProject.id))}
                  className={isMobile ? 'w-full' : ''}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  查看
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基本设置</TabsTrigger>
              <TabsTrigger value="distribution">分发内容</TabsTrigger>
            </TabsList>

            <TabsContents className="mx-1 mb-1 -mt-2 rounded-sm h-full bg-background">
              <TabsContent
                value="basic"
                className={`space-y-6 py-6 px-1 ${isMobile ? 'max-h-[65vh]' : 'max-h-[60vh]'} overflow-y-auto`}
              >
                <ProjectBasicForm
                  formData={formData}
                  onFormDataChange={setFormData}
                  tags={tags}
                  onTagsChange={setTags}
                  availableTags={availableTags}
                  isMobile={isMobile}
                />
              </TabsContent>

              <TabsContent
                value="distribution"
                className={`space-y-6 py-6 px-1 ${isMobile ? 'max-h-[65vh]' : 'max-h-[60vh]'} overflow-y-auto`}
              >
                <DistributionModeSelect
                  distributionType={formData.distributionType!}
                  onDistributionTypeChange={(type) =>
                    setFormData({...formData, distributionType: type})
                  }
                />

                {formData.distributionType === DistributionType.ONE_FOR_EACH ? (
                  <BulkImportSection
                    items={items}
                    bulkContent={bulkContent}
                    setBulkContent={setBulkContent}
                    allowDuplicates={allowDuplicates}
                    setAllowDuplicates={setAllowDuplicates}
                    onBulkImport={handleBulkImport}
                    onRemoveItem={removeItem}
                    onClearItems={clearItems}
                    onClearBulkContent={() => setBulkContent('')}
                    fileUploadOpen={fileUploadOpen}
                    onFileUploadOpenChange={setFileUploadOpen}
                    onFileUpload={handleFileUpload}
                    isMobile={isMobile}
                    mode="create"
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="text-lg font-medium text-muted-foreground mb-2">
                        敬请期待
                      </div>
                      <p className="text-sm text-muted-foreground">
                        手动邀请功能正在开发中
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </TabsContents>
          </Tabs>
        )}

        <DialogFooter className="flex-col gap-2">
          {createSuccess ? (
            <Button
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className="w-full"
            >
              关闭
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || formData.distributionType === DistributionType.INVITE}
              className="w-full"
            >
              {loading ? '创建中...' :
               formData.distributionType === DistributionType.INVITE ? '开发中' :
               '创建'}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
