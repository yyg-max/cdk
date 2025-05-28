import { useState, useEffect } from "react";

/**
 * 自定义钩子用于处理表单错误状态和自动消失逻辑
 * 
 * @param initialError - 初始错误消息
 * @param timeout - 错误消息自动消失的超时时间（毫秒）
 * @returns 错误状态和设置错误的函数
 */
export function useFormError(initialError: string | null = null, timeout: number = 5000) {
  const [error, setError] = useState<string | null>(initialError);

  // 当initialError变化时更新error状态
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // 统一错误自动消失功能
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [error, timeout]);

  // 统一错误交互清除机制：点击页面、按ESC键都会清除
  useEffect(() => {
    const handleClickOutside = () => {
      if (error) {
        setError(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && error) {
        setError(null);
      }
    };

    if (error) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [error]);

  return { error, setError };
} 