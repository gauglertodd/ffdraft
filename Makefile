# Fantasy Football Draft Tracker - Conda-Compatible Makefile

.PHONY: help ff setup backend frontend install clean test lint format stop

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
MAGENTA := \033[35m
CYAN := \033[36m
RESET := \033[0m

# Project directories
BACKEND_DIR := auto-draft-backend
FRONTEND_DIR := ff-rankings-app
CONDA_ENV := fantasy-football

help: ## Show this help message
	@echo "$(CYAN)Fantasy Football Draft Tracker (Conda Version)$(RESET)"
	@echo "$(YELLOW)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-12s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

ff: ## 🚀 Start both Python backend and React frontend
	@echo "$(CYAN)Starting Fantasy Football Draft Tracker...$(RESET)"
	@$(MAKE) check-deps
	@echo "$(YELLOW)Starting Python backend...$(RESET)"
	@bash -c 'cd $(BACKEND_DIR) && conda run -n $(CONDA_ENV) python auto_draft_api.py' > $(BACKEND_DIR)/backend.log 2>&1 &
	@sleep 3
	@echo "$(YELLOW)Checking if Python backend started...$(RESET)"
	@if curl -s http://localhost:5001/health >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Python backend is running$(RESET)"; \
	else \
		echo "$(RED)❌ Python backend failed to start$(RESET)"; \
		echo "$(BLUE)Check logs: tail -f $(BACKEND_DIR)/backend.log$(RESET)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Starting React frontend...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run dev &
	@echo "$(GREEN)✅ Both servers started!$(RESET)"
	@echo "$(BLUE)Python API: http://localhost:5001$(RESET)"
	@echo "$(BLUE)React App: http://localhost:5173$(RESET)"
	@echo "$(MAGENTA)Backend logs: tail -f $(BACKEND_DIR)/backend.log$(RESET)"
	@echo "$(MAGENTA)Press Ctrl+C to stop servers$(RESET)"
	@trap 'make stop' INT; wait

setup: ## 🔧 Complete project setup (conda version)
	@echo "$(CYAN)Setting up Fantasy Football Draft Tracker with Conda...$(RESET)"
	@$(MAKE) create-dirs
	@$(MAKE) create-conda-env
	@$(MAKE) install-python-deps
	@$(MAKE) install-node-deps
	@echo "$(GREEN)✅ Setup complete!$(RESET)"
	@echo "$(BLUE)Run 'make ff' to start the application$(RESET)"

create-dirs: ## Create necessary directories
	@echo "$(YELLOW)Creating project directories...$(RESET)"
	@mkdir -p $(BACKEND_DIR)
	@mkdir -p $(FRONTEND_DIR)
	@if [ ! -f "$(BACKEND_DIR)/auto_draft_api.py" ]; then \
		echo "$(YELLOW)Moving Python files to backend directory...$(RESET)"; \
		find . -maxdepth 1 -name "*.py" -exec mv {} $(BACKEND_DIR)/ \; 2>/dev/null || true; \
	fi

create-conda-env: ## Create conda environment
	@echo "$(YELLOW)Creating conda environment: $(CONDA_ENV)$(RESET)"
	@if conda env list | grep -q "^$(CONDA_ENV) "; then \
		echo "$(BLUE)Conda environment $(CONDA_ENV) already exists$(RESET)"; \
	else \
		conda create -n $(CONDA_ENV) python=3.9 -y; \
		echo "$(GREEN)✅ Conda environment created$(RESET)"; \
	fi

install-python-deps: ## Install Python dependencies
	@echo "$(YELLOW)Installing Python dependencies in conda environment...$(RESET)"
	@conda run -n $(CONDA_ENV) pip install flask flask-cors pandas pydantic
	@echo "$(GREEN)✅ Python dependencies installed$(RESET)"

install-node-deps: ## Install Node.js dependencies
	@echo "$(YELLOW)Installing Node.js dependencies...$(RESET)"
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
		echo "$(RED)❌ React app directory not found$(RESET)"; \
		echo "$(BLUE)Create it with: npm create vite@latest $(FRONTEND_DIR) -- --template react$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(FRONTEND_DIR)/package.json" ]; then \
		echo "$(RED)❌ No package.json found in $(FRONTEND_DIR)$(RESET)"; \
		echo "$(BLUE)Initialize React app first$(RESET)"; \
		exit 1; \
	fi
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✅ Node.js dependencies installed$(RESET)"

backend: ## 🐍 Start only Python backend
	@echo "$(CYAN)Starting Python backend with conda...$(RESET)"
	@$(MAKE) check-conda-env
	@$(MAKE) check-python-files
	@cd $(BACKEND_DIR) && conda run -n $(CONDA_ENV) python auto_draft_api.py

frontend: ## ⚛️ Start only React frontend
	@echo "$(CYAN)Starting React frontend...$(RESET)"
	@$(MAKE) check-node-deps
	@cd $(FRONTEND_DIR) && npm run dev

check-deps: check-conda-env check-python-files check-node-deps ## Check all dependencies

check-conda-env: ## Check if conda environment exists
	@if ! conda env list | grep -q "^$(CONDA_ENV) "; then \
		echo "$(RED)❌ Conda environment $(CONDA_ENV) not found$(RESET)"; \
		echo "$(BLUE)Run: make create-conda-env$(RESET)"; \
		exit 1; \
	fi

check-python-files: ## Check if Python files exist
	@if [ ! -f "$(BACKEND_DIR)/auto_draft_api.py" ]; then \
		echo "$(RED)❌ auto_draft_api.py not found in $(BACKEND_DIR)/$(RESET)"; \
		echo "$(BLUE)Run: make create-dirs$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(BACKEND_DIR)/draft_strategies.py" ]; then \
		echo "$(RED)❌ draft_strategies.py not found in $(BACKEND_DIR)/$(RESET)"; \
		echo "$(BLUE)Make sure all Python files are in $(BACKEND_DIR)/$(RESET)"; \
		exit 1; \
	fi

check-node-deps: ## Check Node.js dependencies
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(RED)❌ Node modules not found$(RESET)"; \
		echo "$(BLUE)Run: make install-node-deps$(RESET)"; \
		exit 1; \
	fi

test-backend: ## 🧪 Test backend connection
	@echo "$(YELLOW)Testing Python backend...$(RESET)"
	@if curl -s http://localhost:5001/health >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Backend is running$(RESET)"; \
		curl -s http://localhost:5001/health | head -c 200; \
		echo; \
	else \
		echo "$(RED)❌ Backend is not responding$(RESET)"; \
	fi

stop: ## ⏹️ Stop all running servers
	@echo "$(YELLOW)Stopping all servers...$(RESET)"
	@pkill -f "auto_draft_api.py" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@echo "$(GREEN)✅ All servers stopped$(RESET)"

clean: ## 🧹 Clean up temporary files
	@echo "$(YELLOW)Cleaning up...$(RESET)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -f $(BACKEND_DIR)/backend.log 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

logs: ## 📋 Show backend logs
	@echo "$(YELLOW)Backend logs:$(RESET)"
	@if [ -f "$(BACKEND_DIR)/backend.log" ]; then \
		tail -n 30 $(BACKEND_DIR)/backend.log; \
	else \
		echo "No backend log file found"; \
	fi

status: ## 📊 Check server status
	@echo "$(CYAN)Server Status:$(RESET)"
	@echo -n "$(YELLOW)Conda environment: $(RESET)"
	@if conda env list | grep -q "^$(CONDA_ENV) "; then \
		echo "$(GREEN)✅ $(CONDA_ENV) exists$(RESET)"; \
	else \
		echo "$(RED)❌ $(CONDA_ENV) missing$(RESET)"; \
	fi
	@echo -n "$(YELLOW)Python API (port 5001): $(RESET)"
	@if curl -s http://localhost:5001/health >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Running$(RESET)"; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi
	@echo -n "$(YELLOW)React App (port 5173): $(RESET)"
	@if curl -s http://localhost:5173 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Running$(RESET)"; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi

info: ## ℹ️ Show project information
	@echo "$(CYAN)Fantasy Football Draft Tracker (Conda Version)$(RESET)"
	@echo "$(YELLOW)Conda Environment:$(RESET) $(CONDA_ENV)"
	@echo "$(YELLOW)Backend Directory:$(RESET) $(BACKEND_DIR)/"
	@echo "$(YELLOW)Frontend Directory:$(RESET) $(FRONTEND_DIR)/"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(RESET)"
	@echo "  1. $(GREEN)make setup$(RESET)     - First time setup"
	@echo "  2. $(GREEN)make ff$(RESET)        - Start both servers"
	@echo "  3. $(GREEN)make status$(RESET)    - Check if running"
	@echo ""
	@echo "$(YELLOW)Troubleshooting:$(RESET)"
	@echo "  $(GREEN)make logs$(RESET)       - Show backend logs"
	@echo "  $(GREEN)make test-backend$(RESET) - Test API connection"
	@echo "  $(GREEN)make backend$(RESET)    - Start backend only"

# Quick setup for first-time users
quick-setup: ## 🚀 One-command setup
	@echo "$(CYAN)Quick Setup for Fantasy Football Draft Tracker$(RESET)"
	@$(MAKE) setup
	@echo "$(GREEN)🎉 Setup complete! Now run: make ff$(RESET)"
