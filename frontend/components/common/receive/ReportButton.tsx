'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Flag} from 'lucide-react';
import services from '@/lib/services';
import {BasicUserInfo} from '@/lib/services/core';

/**
 * 举报按钮组件 Props
 */
interface ReportButtonProps {
  /** 项目ID */
  projectId: string;
  /** 当前用户信息 */
  user: BasicUserInfo | null;
  /** 是否已经举报过 */
  hasReported?: boolean;
}

/**
 * 举报按钮组件
 * 提供项目举报功能，通过弹窗让用户填写举报理由
 */
export function ReportButton({projectId, user, hasReported = false}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 处理举报提交
   */
  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('请填写举报理由');
      return;
    }

    if (reason.trim().length > 255) {
      toast.error('举报理由不能超过255个字符');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await services.project.reportProjectSafe(projectId, reason.trim());

      if (result.success) {
        toast.success('举报提交成功，感谢您的反馈');
        setIsOpen(false);
        setReason('');
      } else {
        toast.error(result.error || '举报失败，请稍后重试');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '举报失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理对话框关闭
   */
  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!user || hasReported}
          className="w-full mt-2"
        >
          <Flag className="w-4 h-4 mr-2" />
          {!user ? '请先登录' : hasReported ? '已举报' : '举报项目'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>举报项目</DialogTitle>
          <DialogDescription>
            如果您发现此项目存在违规内容、恶意行为或其他问题，请填写举报理由。我们会认真处理您的反馈。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">举报理由</Label>
            <Textarea
              id="reason"
              placeholder="请详细描述您发现的问题..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              maxLength={255}
              disabled={isSubmitting}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/255
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? '提交中...' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
