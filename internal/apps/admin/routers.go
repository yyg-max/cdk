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

package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ListReportProjectsRequest struct {
	Current int `json:"current" form:"current" binding:"min=1"`
	Size    int `json:"size" form:"size" binding:"min=1,max=100"`
}

type ListReportProjectsResponse struct {
	ErrorMsg string                          `json:"error_msg"`
	Data     *ListReportProjectsResponseData `json:"data"`
}

// ListReportProjects 获取被举报的项目列表
// @Tags admin
// @Params request query ListReportProjectsRequest true "request query"
// @Produce json
// @Success 200 {object} ListReportProjectsResponse
// @Router /api/v1/admin/projects/report [get]
func ListReportProjects(c *gin.Context) {
	req := &ListReportProjectsRequest{}
	if err := c.ShouldBindQuery(req); err != nil {
		c.JSON(http.StatusBadRequest, ListReportProjectsResponse{ErrorMsg: err.Error()})
		return
	}
	offset := (req.Current - 1) * req.Size
	pagedData, err := ListReportProjectsWith(c.Request.Context(), offset, req.Size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ListReportProjectsResponse{ErrorMsg: err.Error()})
		return
	}

	c.JSON(http.StatusOK, ListReportProjectsResponse{
		Data: pagedData,
	})
}
