'use client';

import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {FileUpload} from '@/components/ui/file-upload';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/animate-ui/radix/dialog';
import {X, Filter} from 'lucide-react';

interface BulkImportSectionProps {
  items: string[];
  bulkContent: string;
  setBulkContent: (content: string) => void;
  allowDuplicates: boolean;
  setAllowDuplicates: (allow: boolean) => void;
  onBulkImport: () => void;
  onRemoveItem: (index: number) => void;
  onClearItems: () => void;
  onClearBulkContent: () => void;
  fileUploadOpen: boolean;
  onFileUploadOpenChange: (open: boolean) => void;
  onFileUpload: (files: File[]) => void;
  isMobile: boolean;
  mode?: 'create' | 'edit';
  totalExistingItems?: number;
}

export function BulkImportSection({
  items,
  bulkContent,
  setBulkContent,
  allowDuplicates,
  setAllowDuplicates,
  onBulkImport,
  onRemoveItem,
  onClearItems,
  onClearBulkContent,
  fileUploadOpen,
  onFileUploadOpenChange,
  onFileUpload,
  isMobile,
  mode = 'create',
  totalExistingItems = 0,
}: BulkImportSectionProps) {
  const isEditMode = mode === 'edit';
  const contentLabel = isEditMode ? '追加分发内容' : '导入分发内容';
  const itemsLabel = isEditMode ? '待添加内容' : '已添加内容';
  const placeholderPrefix = isEditMode ? '要追加的' : '';
  const emptyStateText = isEditMode ? '暂无待添加内容，请在上方导入' : '暂无分发内容，请在上方导入';

  return (
    <>
      {isEditMode && totalExistingItems > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                追加分发内容
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                这里添加的内容将追加到现有项目中，不会替换原有内容。当前项目共有{' '}
                <span className="font-medium">{totalExistingItems}</span> 个分发内容。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-sm font-medium">{contentLabel}</div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className={`cursor-pointer ${
                        !allowDuplicates 
                          ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setAllowDuplicates(!allowDuplicates)}
                    >
                      {isEditMode && <Filter className="h-3 w-3 mr-1" />}
                      {!allowDuplicates ? '已开启过滤' : '辅助过滤'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {!allowDuplicates 
                        ? '已开启：自动过滤重复内容' 
                        : '已关闭：允许导入重复内容'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      点击切换过滤模式
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-gray-300"
                onClick={() => onFileUploadOpenChange(true)}
              >
                TXT导入
              </Badge>
              <Badge variant="secondary" className="bg-muted">
                {isEditMode ? '待添加' : '已添加'}: {items.length}个
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder={`请输入${placeholderPrefix}分发内容，支持以 逗号分隔（中英文逗号均可）或 每行一个内容 的格式批量导入`}
            value={bulkContent}
            onChange={(e) => setBulkContent(e.target.value)}
            className="h-[100px] break-all overflow-x-auto whitespace-pre-wrap"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onBulkImport}
              size="sm"
              className="mt-1 text-sm"
            >
              导入
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 text-xs text-muted-foreground hover:text-destructive"
              onClick={onClearBulkContent}
            >
              清空
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{itemsLabel}</Label>
            {items.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={onClearItems}
              >
                清空全部
              </Button>
            )}
          </div>

          {items.length > 0 ? (
            <div className="space-y-2 h-[150px] overflow-y-auto overflow-x-auto border rounded-md p-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-md"
                >
                  <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0 break-all overflow-x-auto text-sm">
                    {item}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-[150px] flex items-center justify-center py-8 text-sm text-center border rounded-md text-muted-foreground">
              {emptyStateText}
            </div>
          )}
        </div>
      </div>

      {/* 文件上传对话框 */}
      <Dialog open={fileUploadOpen} onOpenChange={onFileUploadOpenChange}>
        <DialogContent className={`${isMobile ? 'max-w-[90vw] max-h-[80vh]' : 'max-w-lg'}`}>
          <DialogHeader>
            <DialogTitle>文件导入分发内容</DialogTitle>
            <DialogDescription className="text-xs">
              支持 .txt 格式• 每行一个邀请码 • 空行自动忽略 • 大小限制：5MB
            </DialogDescription>
          </DialogHeader>

          <FileUpload onChange={onFileUpload} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onFileUploadOpenChange(false)}
              className="w-full"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}