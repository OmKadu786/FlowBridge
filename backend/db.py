import os
import httpx
from typing import Union
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_base = f"{SUPABASE_URL}/rest/v1"


class SupabaseTable:
    """Lightweight Supabase REST wrapper that supports .execute()"""

    def __init__(self, table: str):
        self.table = table
        self._url = f"{_base}/{table}"
        self._params = {}
        self._order_col = None
        self._order_desc = False
        self._limit_val = None
        self._method = "GET"
        self._data = None

    def select(self, cols: str = "*"):
        self._params["select"] = cols
        self._method = "GET"
        return self

    def eq(self, col: str, val):
        self._params[col] = f"eq.{val}"
        return self

    def order(self, col: str, desc: bool = False):
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def insert(self, data: Union[dict, list]):
        self._method = "POST"
        self._data = data
        return self

    def update(self, data: dict):
        self._method = "PATCH"
        self._data = data
        return self

    def delete(self):
        self._method = "DELETE"
        return self

    def execute(self):
        headers = {**_headers}
        params = {**self._params}
        if self._order_col:
            params["order"] = f"{self._order_col}.{'desc' if self._order_desc else 'asc'}"
        if self._limit_val:
            headers["Range"] = f"0-{self._limit_val - 1}"
            
        if self._method == "GET":
            resp = httpx.get(self._url, headers=headers, params=params, timeout=15)
        elif self._method == "POST":
            resp = httpx.post(self._url, headers=headers, json=self._data, params=params, timeout=15)
        elif self._method == "PATCH":
            resp = httpx.patch(self._url, headers=headers, json=self._data, params=params, timeout=15)
        elif self._method == "DELETE":
            resp = httpx.delete(self._url, headers=headers, params=params, timeout=15)
            
        resp.raise_for_status()
        return _Result(resp.json() if resp.text else [])


class _Result:
    def __init__(self, data):
        self.data = data if isinstance(data, list) else [data] if data else []


class SupabaseClient:
    def table(self, name: str) -> SupabaseTable:
        return SupabaseTable(name)


supabase = SupabaseClient()
