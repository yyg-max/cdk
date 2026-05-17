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
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/linux-do/cdk/internal/config"
	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/logger"
	"github.com/linux-do/cdk/internal/utils"
	"github.com/redis/go-redis/v9"
)

const (
	openAPIRiskCacheKeyFormat = "openapi_risk:user:%d"
	minOpenAPIRiskCacheTTL    = time.Hour

	riskLevelHeader  = "X-Credit-Risk-Level"
	riskLabelsHeader = "X-Credit-Risk-Labels"
	exposeHeader     = "Access-Control-Expose-Headers"

	riskBlockedCode = "RISK_BLOCKED"
	riskBlockedMsg  = "账号存在风险"
)

type openAPIUserRiskItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type openAPIUserRiskResponse struct {
	Risky     bool                  `json:"risky"`
	RiskLevel string                `json:"risk_level"`
	Risks     []openAPIUserRiskItem `json:"risks"`
}

type riskBlockDetails struct {
	RiskLevel  string   `json:"risk_level"`
	RiskLabels []string `json:"risk_labels"`
}

func checkOpenAPIUserRisk(ctx context.Context, userID uint64) (*openAPIUserRiskResponse, bool) {
	cfg := config.Config.OpenAPIRisk
	if !cfg.Enabled || strings.TrimSpace(cfg.BaseURL) == "" {
		return nil, false
	}
	if db.Redis == nil {
		logger.ErrorF(ctx, "[OpenAPIRisk] redis is not initialized, skip risk check")
		return nil, false
	}

	cacheKey := fmt.Sprintf(openAPIRiskCacheKeyFormat, userID)
	var cached openAPIUserRiskResponse
	if value, err := db.Redis.Get(ctx, cacheKey).Result(); err == nil {
		if err = json.Unmarshal([]byte(value), &cached); err == nil {
			return &cached, true
		}
		logger.ErrorF(ctx, "[OpenAPIRisk] decode cache failed, skip risk check: %v", err)
		return nil, false
	} else if err != nil && !errors.Is(err, redis.Nil) {
		logger.ErrorF(ctx, "[OpenAPIRisk] read cache failed, skip risk check: %v", err)
		return nil, false
	}

	risk, err := fetchOpenAPIUserRisk(ctx, userID)
	if err != nil {
		logger.ErrorF(ctx, "[OpenAPIRisk] fetch user risk failed, skip risk check: %v", err)
		return nil, false
	}

	payload, err := json.Marshal(risk)
	if err != nil {
		logger.ErrorF(ctx, "[OpenAPIRisk] encode cache failed, skip risk check: %v", err)
		return nil, false
	}
	if err = db.Redis.Set(ctx, cacheKey, payload, openAPIRiskCacheTTL()).Err(); err != nil {
		logger.ErrorF(ctx, "[OpenAPIRisk] write cache failed, skip risk check: %v", err)
		return nil, false
	}

	return risk, true
}

func fetchOpenAPIUserRisk(ctx context.Context, userID uint64) (*openAPIUserRiskResponse, error) {
	cfg := config.Config.OpenAPIRisk
	endpoint := fmt.Sprintf(
		"%s/api/open/v1/risk/users/%d",
		strings.TrimRight(cfg.BaseURL, "/"),
		userID,
	)

	headers := map[string]string{
		"Accept": "application/json",
	}
	if cfg.Username != "" || cfg.Password != "" {
		token := base64.StdEncoding.EncodeToString([]byte(cfg.Username + ":" + cfg.Password))
		headers["Authorization"] = "Basic " + token
	}

	resp, err := utils.Request(ctx, http.MethodGet, endpoint, nil, headers, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var risk openAPIUserRiskResponse
	if err = json.NewDecoder(resp.Body).Decode(&risk); err != nil {
		return nil, fmt.Errorf("decode response failed: %w", err)
	}

	return &risk, nil
}

func openAPIRiskCacheTTL() time.Duration {
	ttl := time.Duration(config.Config.OpenAPIRisk.CacheTTLSeconds) * time.Second
	if ttl < minOpenAPIRiskCacheTTL {
		return minOpenAPIRiskCacheTTL
	}
	return ttl
}

func applyOpenAPIUserRisk(c *gin.Context, risk *openAPIUserRiskResponse) bool {
	if risk == nil || !risk.Risky {
		return false
	}

	labels := riskLabels(risk)
	cfg := config.Config.OpenAPIRisk
	if containsString(cfg.BlockRiskLevels, risk.RiskLevel) {
		setRiskHeaders(c, risk.RiskLevel, labels)
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error_code": riskBlockedCode,
			"error_msg":  riskBlockedMsg,
			"details": riskBlockDetails{
				RiskLevel:  risk.RiskLevel,
				RiskLabels: labels,
			},
		})
		return true
	}

	if containsString(cfg.PromptRiskLevels, risk.RiskLevel) {
		setRiskHeaders(c, risk.RiskLevel, labels)
	}

	return false
}

func setRiskHeaders(c *gin.Context, riskLevel string, labels []string) {
	labelsJSON, err := json.Marshal(labels)
	if err != nil {
		logger.ErrorF(c.Request.Context(), "[OpenAPIRisk] marshal risk labels failed: %v", err)
		return
	}

	c.Header(riskLevelHeader, riskLevel)
	c.Header(riskLabelsHeader, base64.StdEncoding.EncodeToString(labelsJSON))
	appendExposeHeaders(c, riskLevelHeader, riskLabelsHeader)
}

func appendExposeHeaders(c *gin.Context, names ...string) {
	existing := c.Writer.Header().Get(exposeHeader)
	exposed := make([]string, 0, len(names)+1)
	if existing != "" {
		exposed = append(exposed, strings.Split(existing, ",")...)
	}
	exposed = append(exposed, names...)

	seen := make(map[string]struct{}, len(exposed))
	normalized := make([]string, 0, len(exposed))
	for _, header := range exposed {
		header = strings.TrimSpace(header)
		if header == "" {
			continue
		}
		key := strings.ToLower(header)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, header)
	}

	c.Header(exposeHeader, strings.Join(normalized, ", "))
}

func riskLabels(risk *openAPIUserRiskResponse) []string {
	labels := make([]string, 0, len(risk.Risks))
	for _, item := range risk.Risks {
		label := strings.TrimSpace(item.Label)
		if label == "" {
			continue
		}
		labels = append(labels, label)
	}
	return labels
}

func containsString(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}
