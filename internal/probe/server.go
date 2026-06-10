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

package probe

import (
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/linux-do/cdk/internal/apps/health"
	"github.com/linux-do/cdk/internal/config"
)

func Start(port int) error {
	if port <= 0 {
		return fmt.Errorf("invalid probe port: %d", port)
	}
	if config.Config.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	addr := net.JoinHostPort("", strconv.Itoa(port))
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	engine := gin.New()
	engine.Use(gin.Recovery())
	apiV1Router := engine.Group(config.Config.App.APIPrefix + "/v1")
	{
		apiV1Router.GET("/health", health.Health)
		apiV1Router.GET("/ready", health.Ready)
	}

	server := &http.Server{
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		if errServe := server.Serve(listener); errServe != nil && !errors.Is(errServe, http.ErrServerClosed) {
			log.Printf("[Probe] serve failed: %v\n", errServe)
		}
	}()

	log.Printf("[Probe] listening on :%d\n", port)
	return nil
}
