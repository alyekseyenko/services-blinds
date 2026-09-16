"""Shared deploy constants and legacy container migration."""
import os

CONTAINER_APP = os.environ.get("CONTAINER_APP", "technician-app")
CONTAINER_REDIS = os.environ.get("CONTAINER_REDIS", "technician-redis")
CONTAINER_NGINX = os.environ.get("CONTAINER_NGINX", "technician-nginx")

# Stopped automatically on deploy when migrating from older installs.
LEGACY_CONTAINERS = ("habitarmos-app", "habitarmos-redis", "habitarmos-nginx")


def migrate_legacy_containers(run) -> None:
    """Stop/remove old container names so the new compose stack can bind ports."""
    for name in LEGACY_CONTAINERS:
        run(f"docker stop {name} 2>/dev/null || true")
        run(f"docker rm {name} 2>/dev/null || true")
    # Host nginx serves :80 in production — keep Docker nginx disabled.
    run(f"docker stop {CONTAINER_NGINX} 2>/dev/null || true")
    run(f"docker update --restart=no {CONTAINER_NGINX} 2>/dev/null || true")
