package admin

import (
	"context"
	"github.com/linux-do/cdk/internal/apps/project"
	"github.com/linux-do/cdk/internal/db"
	"github.com/linux-do/cdk/internal/utils"
)

type ListReportProjectsResponseDataResult struct {
	ID          string            `json:"id"`
	Username    string            `json:"username"`
	Nickname    string            `json:"nickname"`
	Description string            `json:"description"`
	Tags        utils.StringArray `json:"tags"`
}

type ListReportProjectsResponseData struct {
	Total   int64                                   `json:"total"`
	Results *[]ListReportProjectsResponseDataResult `json:"results"`
}

// ListReportProjectsWith 查询举报的项目
func ListReportProjectsWith(ctx context.Context, offset, limit int) (*ListReportProjectsResponseData, error) {
	var results []ListReportProjectsResponseDataResult
	query := `
		SELECT u.username, u.nickname, p.id, p.description, IF(COUNT(pt.tag) = 0, NULL, JSON_ARRAYAGG(pt.tag)) AS tags
		FROM users u
		INNER JOIN projects p ON u.id = p.creator_id AND p.status = ?
		LEFT JOIN project_tags pt ON p.id = pt.project_id
		GROUP BY p.id
		ORDER BY p.report_count DESC
		LIMIT ? OFFSET ?
	`
	if err := db.DB(ctx).Raw(query, project.ProjectStatusHidden, limit, offset).Scan(&results).Error; err != nil {
		return nil, err
	}

	var total int64
	countQuery := `
		SELECT COUNT(p.id)
		FROM users u
		INNER JOIN projects p ON u.id = p.creator_id AND p.status = ?
	`
	if err := db.DB(ctx).Raw(countQuery, project.ProjectStatusHidden).Count(&total).Error; err != nil {
		return nil, err
	}

	return &ListReportProjectsResponseData{
		Total:   total,
		Results: &results,
	}, nil
}
