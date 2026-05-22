from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone

from jose.exceptions import JWTError


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _json_default(value):
    if isinstance(value, datetime):
        return int(value.replace(tzinfo=timezone.utc).timestamp())
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def encode(payload: dict, key: str, algorithm: str = "HS256") -> str:
    if algorithm != "HS256":
        raise JWTError("Unsupported algorithm")
    header = {"alg": algorithm, "typ": "JWT"}
    header_part = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_part = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True, default=_json_default).encode("utf-8")
    )
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{_b64url_encode(signature)}"


def decode(token: str, key: str, algorithms: list[str] | None = None) -> dict:
    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise JWTError("Invalid token format") from exc

    header = json.loads(_b64url_decode(header_part))
    algorithm = header.get("alg")
    if algorithms and algorithm not in algorithms:
        raise JWTError("Unsupported algorithm")
    if algorithm != "HS256":
        raise JWTError("Unsupported algorithm")

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _b64url_decode(signature_part)):
        raise JWTError("Invalid signature")

    payload = json.loads(_b64url_decode(payload_part))
    exp = payload.get("exp")
    if exp is not None:
        now = int(datetime.now(timezone.utc).timestamp())
        if int(exp) < now:
            raise JWTError("Token expired")
    return payload
