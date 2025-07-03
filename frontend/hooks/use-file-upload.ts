'use client';

import {useState, useCallback} from 'react';
import {toast} from 'sonner';
import {handleBulkImportContentWithFilter} from '@/components/common/project';

export function useFileUpload() {
  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const handleFileUpload = useCallback((
      files: File[],
      currentItems: string[],
      allowDuplicates: boolean,
      onSuccess: (newItems: string[], importedCount: number, skippedInfo?: string) => void,
  ) => {
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
            currentItems,
            allowDuplicates,
            (updatedItems: string[], importedCount: number, skippedInfo?: string) => {
              onSuccess(updatedItems, importedCount, skippedInfo);
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
  }, []);

  const openFileUpload = useCallback(() => {
    setFileUploadOpen(true);
  }, []);

  const closeFileUpload = useCallback(() => {
    setFileUploadOpen(false);
  }, []);

  return {
    fileUploadOpen,
    setFileUploadOpen,
    handleFileUpload,
    openFileUpload,
    closeFileUpload,
  };
}
