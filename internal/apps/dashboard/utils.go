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
	"fmt"

	"github.com/linux-do/cdk/internal/db"
)

// dashboardCacheDays 需要定时预缓存的天数范围
var dashboardCacheDays = []int{7, 15, 30}

// dashboardCacheKey 构造仪表板数据的 Redis 缓存键
func dashboardCacheKey(days int) string {
	return fmt.Sprintf("dashboard:data:%d", days)
}

// StatsCacheReady 判断仪表板统计缓存是否已预热（以首个预缓存天数作为哨兵）
func StatsCacheReady(ctx context.Context) (bool, error) {
	exists, err := db.Redis.Exists(ctx, dashboardCacheKey(dashboardCacheDays[0])).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// queryDashboardData 调用存储过程查询仪表板数据（较重，仅供定时任务预缓存使用）
func queryDashboardData(ctx context.Context, days int) (map[string]interface{}, error) {
	query := "CALL get_dashboard_data(?,10)"

	var rawResult map[string]interface{}
	if err := db.DB(ctx).Raw(query, days).Scan(&rawResult).Error; err != nil {
		return nil, err
	}

	return rawResult, nil
}
