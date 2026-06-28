#!/usr/bin/env bash
set -e

echo "🚀 Starting Telecom Anomaly Detection System..."

# Backend
echo "🔧 Setting up Python virtual environment and installing dependencies..."
cd backend || exit 1

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

# Ensure pip is upgraded inside venv
.venv/bin/pip install --upgrade pip

.venv/bin/pip install -r <(cat <<EOPIP
fastapi
uvicorn[standard]
pandas
scikit-learn
xgboost
joblib
sentence-transformers
faiss-cpu
langchain
langchain-community
langgraph
ollama
EOPIP
)

echo "▶️ Launching FastAPI on http://localhost:8000 …"
cd ..
PYTHONPATH=. backend/.venv/bin/uvicorn backend.app:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 3   # give the server a moment to start

# Frontend
echo "📦 Installing Node.js dependencies (if not already)…"
cd frontend || exit 1
npm install

echo "▶️ Launching Vite dev server on http://localhost:5173 …"
npm run dev &
FRONTEND_PID=$!

# Monitor background processes. If either exits, shut down the other.
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
    sleep 1
done

echo "🛑 One of the services stopped – shutting down the other…"
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
echo "✅ All stopped. Bye!"
