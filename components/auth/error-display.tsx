import { AlertTriangle } from "lucide-react";

/**
 * 错误显示组件属性接口
 */
interface ErrorDisplayProps {
  /**
   * 要显示的错误消息
   */
  error: string | null;
}

/**
 * 通用错误显示组件，带有动画效果
 * 
 * @param error - 要显示的错误消息
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
      error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
    }`}>
      <div className="p-2 bg-red-100 border border-red-200 text-red-700 rounded text-xs font-bold text-center flex items-center justify-center gap-1">
        <AlertTriangle className="h-4 w-4" /> {error || ''}
      </div>
    </div>
  );
} 