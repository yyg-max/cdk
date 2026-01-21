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
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/hibiken/asynq"
	"github.com/linux-do/cdk/internal/config"
	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/logger"
	"github.com/linux-do/cdk/internal/task"
	"github.com/linux-do/cdk/internal/task/schedule"
	"github.com/linux-do/cdk/internal/utils"
	"gorm.io/gorm"
)

type OAuthUserInfo struct {
	Id         uint64     `json:"id"`
	Username   string     `json:"username"`
	Name       string     `json:"name"`
	Active     bool       `json:"active"`
	AvatarUrl  string     `json:"avatar_url"`
	TrustLevel TrustLevel `json:"trust_level"`
}

type User struct {
	ID             uint64     `json:"id" gorm:"primaryKey"`
	Username       string     `json:"username" gorm:"size:255;unique"`
	Nickname       string     `json:"nickname" gorm:"size:255"`
	AvatarUrl      string     `json:"avatar_url" gorm:"size:255"`
	IsActive       bool       `json:"is_active" gorm:"default:true"`
	TrustLevel     TrustLevel `json:"trust_level"`
	Score          int8       `json:"score"`
	ViolationCount uint8      `json:"violation_count" gorm:"default:0"`
	IsAdmin        bool       `json:"is_admin" gorm:"default:false"`
	LastLoginAt    time.Time  `json:"last_login_at" gorm:"index"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime;index"`
}

func (u *User) Exact(tx *gorm.DB, id uint64) error {
	if err := tx.Where("id = ?", id).First(u).Error; err != nil {
		return err
	}
	return nil
}

func (u *User) SetScore(tx *gorm.DB, newScore int) error {
	if newScore < MinUserScore {
		u.Score = MinUserScore
	} else if newScore > MaxUserScore {
		u.Score = MaxUserScore
	} else {
		u.Score = int8(newScore)
	}
	return tx.Model(u).Update("score", u.Score).Error
}

func (u *User) RiskLevel() int8 {
	return BaseUserScore - u.Score
}

func (u *User) GetUserBadges(ctx context.Context) (*UserBadgeResponse, error) {
	url := fmt.Sprintf("https://linux.do/user-badges/%s.json", u.Username)
	resp, err := utils.Request(ctx, http.MethodGet, url, nil, nil, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取用户徽章失败，状态码: %d", resp.StatusCode)
	}

	var response UserBadgeResponse
	if err = json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("解析用户徽章响应失败: %w", err)
	}
	return &response, nil
}

func (u *User) CalculateUserScore(badges []Badge, badgeScores map[int]int) int {
	var totalScore int
	for _, badge := range badges {
		// 从缓存中查找徽章分数
		if score, exists := badgeScores[badge.ID]; exists {
			totalScore += score
		}
	}
	return totalScore - int(config.Config.ProjectApp.DeductionPerOffense)*int(u.ViolationCount)
}

func (u *User) UpdateUserScore(ctx context.Context, newScore int) error {
	// 如果分数没变化，不更新
	if int(u.Score) == newScore || (newScore > MaxUserScore && int(u.Score) == MaxUserScore) {
		return nil
	}

	// 更新用户分数
	if err := u.SetScore(db.DB(ctx), newScore); err != nil {
		return fmt.Errorf("更新用户[%s]分数失败: %w", u.Username, err)
	}

	logger.InfoF(ctx, "用户[%s]徽章分数更新成功: %d -> %d", u.Username, u.Score, newScore)
	return nil
}

// UpdateFromOAuthInfo 根据 OAuth 信息更新用户数据
func (u *User) UpdateFromOAuthInfo(oauthInfo *OAuthUserInfo) {
	u.Username = oauthInfo.Username
	u.Nickname = oauthInfo.Name
	u.AvatarUrl = oauthInfo.AvatarUrl
	u.IsActive = oauthInfo.Active
	u.TrustLevel = oauthInfo.TrustLevel
	u.LastLoginAt = time.Now()
}

// CheckActive 检查用户账户是否激活,未激活则返回错误
func (u *User) CheckActive() error {
	if !u.IsActive {
		return errors.New(BannedAccount)
	}
	return nil
}

// EnqueueBadgeScoreTask 为用户下发徽章分数计算任务
func (u *User) EnqueueBadgeScoreTask(ctx context.Context) {
	payload, _ := json.Marshal(map[string]interface{}{
		"user_id": u.ID,
	})
	if _, err := schedule.AsynqClient.Enqueue(asynq.NewTask(task.UpdateSingleUserBadgeScoreTask, payload)); err != nil {
		logger.ErrorF(ctx, "下发用户[%s]徽章分数计算任务失败: %v", u.Username, err)
	} else {
		logger.InfoF(ctx, "下发用户[%s]徽章分数计算任务成功", u.Username)
	}
}
