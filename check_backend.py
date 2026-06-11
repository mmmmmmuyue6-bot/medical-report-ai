import sys, os, traceback
os.chdir('E:/VScode vibe coding/medical-report-ai')
sys.path.insert(0, 'src')

print("=== Checking dependencies ===")
try:
    import fastapi; print('fastapi: OK', fastapi.__version__)
except Exception as e: print(f'fastapi: MISSING - {e}')

try:
    import uvicorn; print('uvicorn: OK')
except Exception as e: print(f'uvicorn: MISSING - {e}')

try:
    import openai; print('openai: OK')
except Exception as e: print(f'openai: MISSING - {e}')

print("\n=== Trying to import app ===")
try:
    from backend.config import get_llm_config
    cfg = get_llm_config()
    print(f'Config OK: provider={cfg.provider}, model={cfg.model}')
except Exception as e:
    print(f'Config error: {e}')

try:
    from backend.main import app
    print(f'App import: OK, routes={len(app.routes)}')
except Exception as e:
    print(f'App import error:')
    traceback.print_exc()
