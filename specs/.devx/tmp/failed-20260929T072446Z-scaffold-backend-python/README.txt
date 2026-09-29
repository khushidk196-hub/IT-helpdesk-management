Failed step: scaffold-backend/python
Command: mkdir -p server/app && cd server && python3 -m venv .venv && . .venv/bin/activate && python -m pip install fastapi uvicorn && printf "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/health')\ndef health():\n    return {'status': 'ok'}\n" > app/main.py
Output log: /c/Users/khushidk/IT-helpdesk-management/specs/.devx/logs/20260929T072446Z-scaffold-backend-python.log
Partial scaffold output: /c/Users/khushidk/IT-helpdesk-management/specs/.devx/tmp/failed-20260929T072446Z-scaffold-backend-python/scaffold-output
Retry after fixing prerequisites.
