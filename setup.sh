#!/bin/bash

# Fantasy Football Draft Tracker - Quick Setup Script
# This script sets up both the Python backend and React frontend

set -e  # Exit on any error

# Colors for output
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
CYAN='\033[36m'
RESET='\033[0m'

echo -e "${CYAN}🏈 Fantasy Football Draft Tracker Setup${RESET}"
echo -e "${YELLOW}This script will set up your development environment${RESET}"
echo

# Check if we're in the right directory
if [ ! -f "Makefile" ]; then
    echo -e "${RED}❌ Makefile not found. Please run this script from the project root.${RESET}"
    exit 1
fi

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${RESET}"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python 3.8 or higher.${RESET}"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION found${RESET}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 16 or higher.${RESET}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found${RESET}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm.${RESET}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm $NPM_VERSION found${RESET}"

echo

# Create directory structure
echo -e "${BLUE}Setting up project structure...${RESET}"

# Create backend directory
if [ ! -d "auto-draft-backend" ]; then
    echo -e "${YELLOW}Creating auto-draft-backend directory...${RESET}"
    mkdir -p auto-draft-backend
fi

# Create frontend directory if it doesn't exist
if [ ! -d "ff-rankings-app" ]; then
    echo -e "${YELLOW}React app directory not found. Creating new Vite React app...${RESET}"
    npm create vite@latest ff-rankings-app -- --template react
    echo -e "${GREEN}✅ React app created${RESET}"
fi

# Copy Python files to backend directory
echo -e "${BLUE}Setting up Python backend...${RESET}"

# Create pyproject.toml if it doesn't exist
if [ ! -f "auto-draft-backend/pyproject.toml" ]; then
    echo -e "${YELLOW}Creating pyproject.toml...${RESET}"
    cat > auto-draft-backend/pyproject.toml << 'EOF'
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "fantasy-football-auto-draft"
version = "1.0.0"
description = "Auto-draft backend for fantasy football draft tracker"
requires-python = ">=3.8"

dependencies = [
    "flask>=2.3.0",
    "flask-cors>=4.0.0",
    "pandas>=2.0.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=23.0.0",
    "flake8>=6.0.0",
]
EOF
fi

# Check if Python files exist
if [ ! -f "auto-draft-backend/draft_strategies.py" ]; then
    echo -e "${YELLOW}⚠️  draft_strategies.py not found in auto-draft-backend/${RESET}"
    echo -e "${BLUE}Please copy the draft_strategies.py file to auto-draft-backend/${RESET}"
fi

if [ ! -f "auto-draft-backend/auto_draft_api.py" ]; then
    echo -e "${YELLOW}⚠️  auto_draft_api.py not found in auto-draft-backend/${RESET}"
    echo -e "${BLUE}Please copy the auto_draft_api.py file to auto-draft-backend/${RESET}"
fi

# Setup Python environment
echo -e "${BLUE}Setting up Python virtual environment...${RESET}"
cd auto-draft-backend

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${RESET}"
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo -e "${YELLOW}Installing Python dependencies...${RESET}"
pip install --upgrade pip
pip install flask flask-cors pandas pydantic

echo -e "${GREEN}✅ Python backend setup complete${RESET}"
cd ..

# Setup React frontend
echo -e "${BLUE}Setting up React frontend...${RESET}"
cd ff-rankings-app

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Node.js dependencies...${RESET}"
    npm install
fi

# Install additional dependencies for the project
echo -e "${YELLOW}Installing additional React dependencies...${RESET}"
npm install lucide-react

echo -e "${GREEN}✅ React frontend setup complete${RESET}"
cd ..

# Create a simple README if it doesn't exist
if [ ! -f "README.md" ]; then
    echo -e "${YELLOW}Creating README.md...${RESET}"
    cat > README.md << 'EOF'
# Fantasy Football Draft Tracker

A comprehensive fantasy football draft application with auto-draft capabilities.

## Quick Start

```bash
# Setup (run once)
make setup

# Start both servers
make ff
```

## URLs

- React App: http://localhost:5173
- Python API: http://localhost:5000
- API Health: http://localhost:5000/health

## Commands

- `make ff` - Start both frontend and backend
- `make backend` - Start only Python backend
- `make frontend` - Start only React frontend
- `make help` - Show all available commands

## Features

- CSV player data upload with tier support
- Advanced search with dropdown selection
- Watch list functionality with custom highlighting
- Multiple auto-draft strategies
- Real-time draft boards
- Light/dark mode support
EOF
fi

echo
echo -e "${GREEN}🎉 Setup complete!${RESET}"
echo
echo -e "${CYAN}Next steps:${RESET}"
echo -e "${BLUE}1. Copy your Python files to auto-draft-backend/ if not already done${RESET}"
echo -e "${BLUE}2. Copy your React components to ff-rankings-app/src/components/${RESET}"
echo -e "${BLUE}3. Run: ${GREEN}make ff${RESET}${BLUE} to start both servers${RESET}"
echo
echo -e "${YELLOW}Available commands:${RESET}"
echo -e "${GREEN}make ff${RESET}       - Start both servers"
echo -e "${GREEN}make setup${RESET}    - Run setup again"
echo -e "${GREEN}make help${RESET}     - Show all commands"
echo
echo -e "${CYAN}Happy drafting! 🏈${RESET}"
