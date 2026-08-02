import time
import jwt
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class GitHubAppAuth:
    def __init__(self, app_id: str, private_key: str):
        self.app_id = app_id
        # Normalize private key newlines if they are passed as literal \n in env var
        self.private_key = private_key.replace("\\n", "\n")
        self.base_url = "https://api.github.com"
        
        # Simple in-memory cache for installation tokens
        self._token_cache = {} # Dict[int, (token, expires_at_timestamp)]

    def generate_jwt(self) -> str:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + (10 * 60),
            "iss": self.app_id
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    async def get_installation_token(self, installation_id: int) -> str:
        # Check cache
        if installation_id in self._token_cache:
            token, expires_at = self._token_cache[installation_id]
            if time.time() < expires_at - 60: # 1 minute buffer
                return token
                
        # Generate new token
        app_jwt = self.generate_jwt()
        url = f"{self.base_url}/app/installations/{installation_id}/access_tokens"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            
            token = data["token"]
            # Convert expires_at string to timestamp (approximation is fine for caching)
            self._token_cache[installation_id] = (token, time.time() + 3500) # Valid for 1 hour usually
            
            return token
