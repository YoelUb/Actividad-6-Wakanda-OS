import httpx
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(1),
    retry=retry_if_exception_type(httpx.RequestError)
)
async def fetch_from_service(url: str, client: httpx.AsyncClient):
    """
    Función envoltorio con superpoderes de resiliencia.
    Si falla, Tenacity lo reintentará automáticamente.
    """
    response = await client.get(url)
    return response
