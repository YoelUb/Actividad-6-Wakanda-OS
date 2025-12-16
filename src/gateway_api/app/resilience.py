import httpx
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(1),
    retry=retry_if_exception_type(httpx.RequestError)
)
async def fetch_from_service(url: str, client: httpx.AsyncClient):
    response = await client.get(url)
    return response

@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(1),
    retry=retry_if_exception_type(httpx.RequestError)
)
async def post_to_service(url: str, data: dict = None, params: dict = None, client: httpx.AsyncClient = None):
    response = await client.post(url, data=data, params=params)
    return response