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

package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/linux-do/cdk/internal/config"
	"github.com/linux-do/cdk/internal/task"
	"github.com/linux-do/cdk/internal/task/schedule"
	"github.com/linux-do/cdk/internal/utils"

	"github.com/hibiken/asynq"
	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/logger"
)

// Badge 徽章信息
type Badge struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Score       int    `json:"score"`
}

// UserBadgeResponse API响应
type UserBadgeResponse struct {
	Badges []Badge `json:"badges"`
}

// loadBadgeScores 从Redis加载徽章分数
func loadBadgeScores(ctx context.Context) (map[int]int, error) {
	// 加载所有徽章信息
	badgeValues, err := db.Redis.HGetAll(ctx, UserAllBadges).Result()
	if err != nil {
		logger.ErrorF(ctx, "获取徽章列表失败: %v", err)
		return nil, err
	}

	badgeScores := make(map[int]int, len(badgeValues))
	for _, badgeJSON := range badgeValues {
		var badge Badge
		if err := json.Unmarshal([]byte(badgeJSON), &badge); err != nil {
			logger.ErrorF(ctx, "解析徽章JSON失败: %v", err)
			continue
		}
		badgeScores[badge.ID] = badge.Score
	}
	return badgeScores, nil
}

// HandleUpdateUserBadgeScores 处理所有用户徽章分数更新任务
func HandleUpdateUserBadgeScores(ctx context.Context, t *asynq.Task) error {
	// 分页处理用户
	pageSize := 200
	page := 0
	currentDelay := 0 * time.Second

	// 计算一周前日期
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	sessionAgeDays := config.Config.App.SessionAge / 86400
	if sessionAgeDays < 7 {
		sessionAgeDays = 7
	}
	oneWeekAgo := today.AddDate(0, 0, -sessionAgeDays)

	for {
		var users []User
		if err := db.DB(ctx).
			Table("users u").
			Select("u.id, u.username").
			Joins("INNER JOIN (SELECT id FROM users WHERE last_login_at >= ? ORDER BY last_login_at DESC LIMIT ? OFFSET ?) tmp ON u.id = tmp.id",
				oneWeekAgo, pageSize, page*pageSize).
			Find(&users).Error; err != nil {
			logger.ErrorF(ctx, "查询用户失败: %v", err)
			return err
		}

		// 没有用户，退出循环
		if len(users) == 0 {
			break
		}

		for _, user := range users {
			currentDelay += time.Duration(config.Config.Schedule.UserBadgeScoreDispatchIntervalSeconds) * time.Second

			payload, _ := json.Marshal(map[string]interface{}{
				"user_id": user.ID,
			})

			if _, errTask := schedule.AsynqClient.Enqueue(asynq.NewTask(task.UpdateSingleUserBadgeScoreTask, payload), asynq.ProcessIn(currentDelay), asynq.MaxRetry(3)); errTask != nil {
				logger.ErrorF(ctx, "下发用户[%s]徽章分数计算任务失败: %v", user.Username, errTask)
				return errTask
			} else {
				logger.InfoF(ctx, "下发用户[%s]徽章分数计算任务成功", user.Username)
			}
		}
		page++
	}
	return nil
}

// HandleUpdateSingleUserBadgeScore 处理单个用户徽章分数更新任务
func HandleUpdateSingleUserBadgeScore(ctx context.Context, t *asynq.Task) error {
	// 解析任务参数
	var payload struct {
		UserID uint64 `json:"user_id"`
	}
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("解析任务参数失败: %w", err)
	}

	var user User
	if err := db.DB(ctx).Where("id = ?", payload.UserID).First(&user).Error; err != nil {
		return fmt.Errorf("查询用户ID[%d]失败: %w", payload.UserID, err)
	}

	// 加载所有徽章信息
	badgeScores, err := loadBadgeScores(ctx)
	if err != nil {
		return err
	}

	if len(badgeScores) == 0 {
		return fmt.Errorf("未找到任何徽章数据")
	}

	// 获取用户徽章
	response, err := user.GetUserBadges(ctx)
	if err != nil {
		logger.ErrorF(ctx, "处理用户[%s]失败: %v", user.Username, err)
		return err
	}

	// 计算用户分数
	totalScore := user.CalculateUserScore(response.Badges, badgeScores)

	// 更新用户分数
	return user.UpdateUserScore(ctx, totalScore)
}

// getAllBadges 获取所有徽章数据
func getAllBadges(ctx context.Context) (*UserBadgeResponse, error) {
	url := "https://linux.do/badges.json"
	resp, err := utils.Request(ctx, http.MethodGet, url, nil, nil, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取徽章列表失败，状态码: %d", resp.StatusCode)
	}

	var response UserBadgeResponse
	if err = json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("解析徽章列表响应失败: %w", err)
	}
	return &response, nil
}

// HandleUpdateAllBadges 处理更新所有徽章
func HandleUpdateAllBadges(ctx context.Context, t *asynq.Task) error {
	fetchUserBadgeResponse, err := getAllBadges(ctx)
	if err != nil {
		logger.ErrorF(ctx, "获取徽章列表失败: %v", err)
		return err
	}

	badgeScores, err := loadBadgeScores(ctx)
	if err != nil {
		return err
	}

	pipe := db.Redis.Pipeline()
	var newBadgeCount int

	for _, badge := range fetchUserBadgeResponse.Badges {
		if _, exists := badgeScores[badge.ID]; !exists {
			badgeJSON, errJson := json.Marshal(badge)
			if errJson != nil {
				logger.ErrorF(ctx, "序列化徽章[%d]失败: %v", badge.ID, errJson)
				continue
			}

			pipe.HSet(ctx, UserAllBadges, badge.ID, badgeJSON)
			newBadgeCount++
		}
	}

	if newBadgeCount > 0 {
		_, err := pipe.Exec(ctx)
		if err != nil {
			logger.ErrorF(ctx, "批量添加徽章失败: %v", err)
			return err
		}
		logger.InfoF(ctx, "批量添加 %d 个新徽章成功", newBadgeCount)
	}

	return nil
}
