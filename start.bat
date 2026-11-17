@echo off
chcp 65001 >nul
echo ====================================================
echo   Nexus AgentOS - جاري تجهيز وتشغيل نظام الوكلاء
echo ====================================================

cd /d "%~dp0backend"
if not exist ".venv" (
    python -m venv .venv
)
call .venv\Scripts\activate
pip install -q -r requirements.txt

echo [1/2] تشغيل نواة الوكلاء على المنفذ 8000...
start "Nexus AgentOS Backend" cmd /k "call .venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install
)

echo [2/2] تشغيل لوحة التحكم على المنفذ 5173...
call npm run dev
