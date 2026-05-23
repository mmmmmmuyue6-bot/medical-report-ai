"""
API配置 — 支持多LLM提供商
通过环境变量切换，默认使用DeepSeek（性价比最高）
"""
import os
from pathlib import Path
from dataclasses import dataclass

# 自动加载项目根目录的.env文件
_env_path = Path(__file__).parent.parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


@dataclass
class LLMConfig:
    provider: str  # "openai" | "anthropic" | "deepseek"
    api_key: str
    model: str
    base_url: str | None = None


def get_llm_config() -> LLMConfig:
    provider = os.getenv("LLM_PROVIDER", "deepseek")

    configs = {
        "openai": LLMConfig(
            provider="openai",
            api_key=os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        ),
        "anthropic": LLMConfig(
            provider="anthropic",
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        ),
        "deepseek": LLMConfig(
            provider="deepseek",
            api_key=os.getenv("DEEPSEEK_API_KEY", ""),
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            base_url="https://api.deepseek.com/v1",
        ),
    }

    cfg = configs.get(provider)
    if not cfg or not cfg.api_key:
        raise ValueError(
            f"LLM provider '{provider}' not configured. "
            f"Set {provider.upper()}_API_KEY environment variable."
        )
    return cfg
