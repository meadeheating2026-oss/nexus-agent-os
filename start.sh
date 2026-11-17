#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "===================================================="
echo "  Nexus AgentOS — جاري تجهيز وتشغيل نظام الوكلاء..."
echo "===================================================="

# 1. تجهيز بيئة البايثون للـ Backend
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

echo "[1/2] تشغيل نواة الوكلاء (FastAPI Backend) على المنفذ 8000..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. تجهيز وتشغيل الواجهة الأمامية
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "[2/2] تشغيل لوحة التحكم (React Frontend) على المنفذ 5173..."
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
npm run dev
