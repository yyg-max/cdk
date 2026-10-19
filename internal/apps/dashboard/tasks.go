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

package dashboard

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/logger"

	"github.com/hibiken/asynq"
)

// HandleUpdateDashboardStats 定时预缓存仪表板统计数据到 Redis。
func HandleUpdateDashboardStats(ctx context.Context, _ *asynq.Task) error {
	startedAt := time.Now()

	for _, days := range dashboardCacheDays {
		rawResult, err := queryDashboardData(ctx, days)
		if err != nil {
			return fmt.Errorf("query dashboard data days=%d: %w", days, err)
		}

		jsonData, err := json.Marshal(rawResult)
		if err != nil {
			return fmt.Errorf("marshal dashboard data days=%d: %w", days, err)
		}

		if err := db.Redis.Set(ctx, dashboardCacheKey(days), string(jsonData), 0).Err(); err != nil {
			return fmt.Errorf("cache dashboard data days=%d: %w", days, err)
		}
	}

	logger.InfoF(ctx, "dashboard stats: cached days=%v in %s", dashboardCacheDays, time.Since(startedAt))
	return nil
}
