"""Vercel Serverless Function Default Entrypoint."""
try:
    from .analyze import handler
except ImportError:
    from analyze import handler  # type: ignore
