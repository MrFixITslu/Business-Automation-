from __future__ import annotations

import json
import ssl
import urllib.request
from dataclasses import dataclass


@dataclass
class UpdateResult:
    update_available: bool
    latest_version: str
    release_url: str | None = None


def _normalize_version(version: str) -> tuple[int, ...]:
    cleaned = version.lower().lstrip("v")
    parts = cleaned.split(".")
    numbers = []
    for part in parts:
        digits = "".join(ch for ch in part if ch.isdigit())
        numbers.append(int(digits) if digits else 0)
    return tuple(numbers)


def check_for_updates(current_version: str, repo: str) -> UpdateResult:
    """
    Check latest release via GitHub API over HTTPS.

    repo format: owner/name
    """
    if "/" not in repo:
        raise ValueError("repo must be in the form 'owner/name'")

    url = f"https://api.github.com/repos/{repo}/releases/latest"

    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "business-automation-suite-updater",
        },
    )

    context = ssl.create_default_context()
    with urllib.request.urlopen(req, context=context, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))

    latest_tag = data.get("tag_name") or "0.0.0"
    latest_url = data.get("html_url")

    is_newer = _normalize_version(latest_tag) > _normalize_version(current_version)

    return UpdateResult(
        update_available=is_newer,
        latest_version=latest_tag,
        release_url=latest_url,
    )
