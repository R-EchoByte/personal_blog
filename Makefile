SHELL := /bin/bash

PROJECT_ROOT := $(CURDIR)
FRONTEND_DIR := $(PROJECT_ROOT)/frontend
BACKEND_DIR := $(PROJECT_ROOT)/backend
BACKEND_VENV := .venv-build
BACKEND_PYTHON := $(BACKEND_DIR)/$(BACKEND_VENV)/bin/python
BACKEND_DIST := $(BACKEND_DIR)/dist/personal_blog
BACKEND_DIST_EXE := $(BACKEND_DIR)/dist/personal_blog.exe
APP_PORT ?= 7869
SMOKE_PORT ?= 7869
SYSTEMD_SERVICE_NAME ?= personal-blog
SYSTEMD_SERVICE_PATH ?= /etc/systemd/system/$(SYSTEMD_SERVICE_NAME).service
WATCHDOG_SERVICE_NAME ?= $(SYSTEMD_SERVICE_NAME)-watchdog
WATCHDOG_TIMER_NAME ?= $(SYSTEMD_SERVICE_NAME)-watchdog.timer
WATCHDOG_SERVICE_PATH ?= /etc/systemd/system/$(WATCHDOG_SERVICE_NAME).service
WATCHDOG_TIMER_PATH ?= /etc/systemd/system/$(WATCHDOG_TIMER_NAME)
NGINX_SITE_NAME ?= personal-blog.conf
NGINX_SITE_AVAILABLE ?= /etc/nginx/sites-available/$(NGINX_SITE_NAME)
NGINX_SITE_ENABLED ?= /etc/nginx/sites-enabled/$(NGINX_SITE_NAME)

.PHONY: help preflight frontend-build backend-sync backend-check backend-typecheck backend-lock backend-package package show-version smoke install-systemd install-watchdog install-nginx restart-service status-service status-watchdog deploy clean

help:
	@echo "Available targets:"
	@echo "  make preflight         # 检查 Ubuntu 打包环境依赖"
	@echo "  make frontend-build    # 构建前端 dist"
	@echo "  make backend-lock      # 生成/更新 uv.lock"
	@echo "  make backend-sync      # 同步后端构建环境"
	@echo "  make backend-check     # 运行 ruff 检查"
	@echo "  make backend-typecheck # 运行 ty 类型检查"
	@echo "  make backend-package   # 生成 PyInstaller 产物"
	@echo "  make package           # 执行完整打包流程"
	@echo "  make show-version      # 输出打包产物版本"
	@echo "  make smoke             # 对打包产物做本机冒烟测试（默认端口 $(SMOKE_PORT)）"
	@echo "  make install-systemd   # 安装 systemd 服务模板"
	@echo "  make install-watchdog  # 安装 systemd 健康巡检定时器"
	@echo "  make install-nginx     # 安装 nginx 反代模板"
	@echo "  make restart-service   # 重启 systemd 服务"
	@echo "  make status-service    # 查看 systemd 服务状态"
	@echo "  make status-watchdog   # 查看健康巡检定时器状态"
	@echo "  make deploy            # 执行 package + smoke + 服务安装/重启"
	@echo "  make clean             # 清理 build/dist"

preflight:
	command -v node >/dev/null
	command -v npm >/dev/null
	command -v uv >/dev/null
	command -v make >/dev/null

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

backend-lock:
	cd $(BACKEND_DIR) && UV_PROJECT_ENVIRONMENT=$(BACKEND_VENV) uv lock

backend-sync:
	cd $(BACKEND_DIR) && UV_PROJECT_ENVIRONMENT=$(BACKEND_VENV) uv sync --group dev

backend-check:
	cd $(BACKEND_DIR) && UV_PROJECT_ENVIRONMENT=$(BACKEND_VENV) uv run ruff check .

backend-typecheck:
	cd $(BACKEND_DIR) && UV_PROJECT_ENVIRONMENT=$(BACKEND_VENV) uv run ty check --python $(BACKEND_PYTHON)

backend-package:
	rm -f $(BACKEND_DIST)
	rm -f $(BACKEND_DIST_EXE)
	cd $(BACKEND_DIR) && UV_PROJECT_ENVIRONMENT=$(BACKEND_VENV) uv run pyinstaller --clean personal_blog.spec

package: preflight frontend-build backend-lock backend-sync backend-check backend-typecheck backend-package

show-version:
	test -x $(BACKEND_DIST)
	$(BACKEND_DIST) --version

smoke:
	test -x $(BACKEND_DIST)
	rm -f /tmp/personal_blog.log /tmp/personal_blog_root.out /tmp/personal_blog_health.out; \
	PORT=$(SMOKE_PORT) $(BACKEND_DIST) >/tmp/personal_blog.log 2>&1 & \
	pid=$$!; \
	trap 'kill $$pid >/dev/null 2>&1 || true' EXIT; \
	sleep 3; \
	kill -0 $$pid >/dev/null 2>&1 || { cat /tmp/personal_blog.log; exit 1; }; \
	curl -fsS http://127.0.0.1:$(SMOKE_PORT)/ >/tmp/personal_blog_root.out; \
	curl -fsS http://127.0.0.1:$(SMOKE_PORT)/api/v1/health >/tmp/personal_blog_health.out; \
	grep -qi '<!doctype html>' /tmp/personal_blog_root.out; \
	grep -q '"status":"ok"' /tmp/personal_blog_health.out

install-systemd:
	sed \
		-e 's|__BACKEND_DIR__|$(BACKEND_DIR)|g' \
		-e 's|__APP_PORT__|$(APP_PORT)|g' \
		deploy/systemd/personal-blog.service | sudo tee $(SYSTEMD_SERVICE_PATH) >/dev/null
	sudo systemctl daemon-reload
	sudo systemctl enable $(SYSTEMD_SERVICE_NAME)

install-watchdog:
	sed \
		-e 's|__APP_PORT__|$(APP_PORT)|g' \
		-e 's|__SERVICE_NAME__|$(SYSTEMD_SERVICE_NAME)|g' \
		deploy/systemd/personal-blog-healthcheck.sh | sudo tee /usr/local/bin/$(WATCHDOG_SERVICE_NAME).sh >/dev/null
	sudo chmod 755 /usr/local/bin/$(WATCHDOG_SERVICE_NAME).sh
	sed \
		-e 's|__APP_PORT__|$(APP_PORT)|g' \
		-e 's|__SERVICE_NAME__|$(SYSTEMD_SERVICE_NAME)|g' \
		deploy/systemd/personal-blog-watchdog.service | sudo tee $(WATCHDOG_SERVICE_PATH) >/dev/null
	sed \
		-e 's|__WATCHDOG_SERVICE_NAME__|$(WATCHDOG_SERVICE_NAME)|g' \
		deploy/systemd/personal-blog-watchdog.timer | sudo tee $(WATCHDOG_TIMER_PATH) >/dev/null
	sudo systemctl daemon-reload
	sudo systemctl enable --now $(WATCHDOG_TIMER_NAME)

install-nginx:
	command -v nginx >/dev/null
	sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
	sudo cp deploy/nginx/personal-blog.conf $(NGINX_SITE_AVAILABLE)
	sudo ln -sf $(NGINX_SITE_AVAILABLE) $(NGINX_SITE_ENABLED)
	sudo nginx -t
	sudo systemctl reload nginx

restart-service:
	sudo systemctl restart $(SYSTEMD_SERVICE_NAME)

status-service:
	sudo systemctl status $(SYSTEMD_SERVICE_NAME) --no-pager

status-watchdog:
	sudo systemctl status $(WATCHDOG_TIMER_NAME) --no-pager

deploy: package smoke install-systemd install-watchdog install-nginx restart-service status-service status-watchdog

clean:
	rm -rf $(BACKEND_DIR)/build
	rm -rf $(BACKEND_DIR)/dist
