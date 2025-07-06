'use client';

import {useState, useCallback} from 'react';
import {toast} from 'sonner';
import {handleBulkImportContentWithFilter} from '@/components/common/project';

/**
 * 解析 JSONL 文件内容
 * 支持两种格式：
 * 1. JSON 数组格式：[{}, {}, {}]
 * 2. 每行一个 JSON 对象
 */
const parseJsonlContent = (content: string): string => {
  const trimmedContent = content.trim();
  
  // 尝试解析为 JSON 数组格式
  if (trimmedContent.startsWith('[') && trimmedContent.endsWith(']')) {
    try {
      const jsonArray = JSON.parse(trimmedContent);
      if (Array.isArray(jsonArray)) {
        return jsonArray
            .map((item) => {
              if (typeof item === 'object' && item !== null) {
                return JSON.stringify(item);
              }
              return String(item);
            })
            .filter((item) => item.trim())
            .join('\n');
      }
    } catch {
      // JSON 数组解析失败，继续尝试逐行解析
    }
  }

  // 逐行解析 JSON 对象
  const lines = trimmedContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  const validJsonLines: string[] = [];

  for (const line of lines) {
    try {
      // 尝试解析为 JSON 对象
      const jsonObj = JSON.parse(line);
      if (typeof jsonObj === 'object' && jsonObj !== null) {
        validJsonLines.push(JSON.stringify(jsonObj));
      } else {
        // 非对象类型，直接转为字符串
        validJsonLines.push(String(jsonObj));
      }
    } catch {
      // JSON 解析失败，作为普通文本处理
      validJsonLines.push(line);
    }
  }

  return validJsonLines.join('\n');
};

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
    const fileName = file.name.toLowerCase();

    // 检查文件类型
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.jsonl')) {
      toast.error('仅支持上传 .txt 或 .jsonl 格式的文件');
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
        let processedContent = content;

        // 根据文件扩展名选择解析方式
        if (fileName.endsWith('.jsonl')) {
          // JSONL 文件处理
          processedContent = parseJsonlContent(content);
        } else {
          // TXT 文件处理（保持原有逻辑）
          const lines = content
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

          if (lines.length === 0) {
            toast.error('文件内容为空');
            return;
          }

          processedContent = lines.join('\n');
        }

        if (!processedContent) {
          toast.error('文件内容为空或格式无效');
          return;
        }

        // 执行导入
        handleBulkImportContentWithFilter(
            processedContent,
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
  }, [setFileUploadOpen]);

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
