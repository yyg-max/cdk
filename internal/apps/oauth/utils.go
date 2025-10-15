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
	"github.com/hibiken/asynq"
	"github.com/linux-do/cdk/internal/logger"
	"github.com/linux-do/cdk/internal/task"
	"github.com/linux-do/cdk/internal/task/schedule"
	"io"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/linux-do/cdk/internal/config"
	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/otel_trace"
	"go.opentelemetry.io/otel/codes"
	"gorm.io/gorm"
)

func GetUserIDFromSession(s sessions.Session) uint64 {
	userID, ok := s.Get(UserIDKey).(uint64)
	if !ok {
		return 0
	}
	return userID
}

func GetUserIDFromContext(c *gin.Context) uint64 {
	session := sessions.Default(c)
	return GetUserIDFromSession(session)
}

// GetUserFromContext 从Context中获取User对象
func GetUserFromContext(c *gin.Context) (*User, bool) {
	user, exists := c.Get(UserObjKey)
	if !exists {
		return nil, false
	}
	u, ok := user.(*User)
	return u, ok
}

// SetUserToContext 将User对象存储到Context中
func SetUserToContext(c *gin.Context, user *User) {
	c.Set(UserObjKey, user)
}

func doOAuth(ctx context.Context, code string) (*User, error) {
	// init trace
	ctx, span := otel_trace.Start(ctx, "OAuth")
	defer span.End()

	// get token
	token, err := oauthConf.Exchange(ctx, code)
	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	// get user info
	client := oauthConf.Client(ctx, token)
	resp, err := client.Get(config.Config.OAuth2.UserEndpoint)
	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	defer func(body io.ReadCloser) { _ = resp.Body.Close() }(resp.Body)

	// load user info
	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	var userInfo OAuthUserInfo
	if err = json.Unmarshal(responseData, &userInfo); err != nil {
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	if !userInfo.Active {
		err = errors.New(BannedAccount)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	// save to db
	var user User
	tx := db.DB(ctx).Where("id = ?", userInfo.Id).First(&user)
	if tx.Error != nil {
		// create user
		if errors.Is(tx.Error, gorm.ErrRecordNotFound) {
			user = User{
				ID:          userInfo.Id,
				Username:    userInfo.Username,
				Nickname:    userInfo.Name,
				AvatarUrl:   userInfo.AvatarUrl,
				IsActive:    userInfo.Active,
				TrustLevel:  userInfo.TrustLevel,
				LastLoginAt: time.Now(),
			}
			tx = db.DB(ctx).Create(&user)
			if tx.Error != nil {
				span.SetStatus(codes.Error, tx.Error.Error())
				return nil, tx.Error
			}
			// 为新注册用户下发计算徽章分数的任务
			payload, _ := json.Marshal(map[string]interface{}{
				"user_id": user.ID,
			})

			if _, errTask := schedule.AsynqClient.Enqueue(asynq.NewTask(task.UpdateSingleUserBadgeScoreTask, payload)); errTask != nil {
				logger.ErrorF(ctx, "下发用户[%s]徽章分数计算任务失败: %v", user.Username, errTask)
			} else {
				logger.InfoF(ctx, "下发用户[%s]徽章分数计算任务成功", user.Username)
			}
		} else {
			// response failed
			span.SetStatus(codes.Error, tx.Error.Error())
			return nil, tx.Error
		}
	} else {
		if !user.IsActive {
			err = errors.New(BannedAccount)
			span.SetStatus(codes.Error, err.Error())
			return nil, err
		}
		// update user
		user.Username = userInfo.Username
		user.Nickname = userInfo.Name
		user.AvatarUrl = userInfo.AvatarUrl
		user.IsActive = userInfo.Active
		user.TrustLevel = userInfo.TrustLevel
		user.LastLoginAt = time.Now()
		tx = db.DB(ctx).Save(&user)
		if tx.Error != nil {
			span.SetStatus(codes.Error, tx.Error.Error())
			return nil, tx.Error
		}
	}
	return &user, nil
}
