from __future__ import annotations

import hashlib
import hmac
import secrets


class CryptContext:
    def __init__(self, schemes=None, deprecated=None):
        self.iterations = 390000

    def hash(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            self.iterations,
        ).hex()
        return f"pbkdf2_sha256${self.iterations}${salt}${digest}"

    def verify(self, plain: str, hashed: str) -> bool:
        try:
            algorithm, iterations, salt, digest = hashed.split("$", 3)
        except ValueError:
            return False
        if algorithm != "pbkdf2_sha256":
            return False
        try:
            iterations_int = int(iterations)
        except ValueError:
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            plain.encode("utf-8"),
            salt.encode("utf-8"),
            iterations_int,
        ).hex()
        return hmac.compare_digest(candidate, digest)
