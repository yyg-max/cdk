/*
 * MIT License
 *
 * Copyright (c) 2025 linux.do
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package payment

import (
	"context"
	"fmt"

	"github.com/linux-do/cdk/internal/apps/project"
	"github.com/linux-do/cdk/internal/db"
	"gorm.io/gorm"
)

// returnReservedItem 把支付预占的 item 归还 Redis，并在同一个数据库事务中重置项目完成状态。
// Redis RPush 或项目状态更新失败时返回 error，由调用方触发外层数据库事务回滚。
func returnReservedItem(ctx context.Context, tx *gorm.DB, projectID string, itemID uint64) error {
	var proj project.Project
	if err := tx.Where("id = ?", projectID).First(&proj).Error; err != nil {
		return fmt.Errorf("load project %s: %w", projectID, err)
	}
	if err := db.Redis.RPush(ctx, project.ProjectItemsKey(projectID), itemID).Err(); err != nil {
		return fmt.Errorf("return item %d to project %s stock: %w", itemID, projectID, err)
	}
	if err := proj.ResetCompletedStatusIfHasStock(ctx, tx); err != nil {
		return fmt.Errorf("reset completed status for project %s: %w", projectID, err)
	}
	return nil
}

func markOrderRefundedAndReturnItem(ctx context.Context, order *PaymentOrder, updates map[string]any, expectedStatus OrderStatus) (bool, error) {
	processed := false
	err := db.DB(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&PaymentOrder{}).
			Where("out_trade_no = ? AND status = ?", order.OutTradeNo, expectedStatus).
			Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return nil
		}

		if err := returnReservedItem(ctx, tx, order.ProjectID, order.ItemID); err != nil {
			return err
		}

		processed = true
		return nil
	})
	return processed, err
}
