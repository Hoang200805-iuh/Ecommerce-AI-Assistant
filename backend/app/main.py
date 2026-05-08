from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from urllib.parse import unquote

from app.api.v1.api import api_router
from app.core.config import ALLOWED_HEADERS, ALLOWED_METHODS, ALLOWED_ORIGINS
from app.db.init_db import init_database

app = FastAPI(title='Smartmobile API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)

app.include_router(api_router)


@app.on_event('startup')
async def startup_event():
    await init_database()


@app.get('/health')
async def health_check():
    return {'status': 'Server is running on FastAPI'}


@app.get('/api/proxy-image')
async def proxy_image(url: str):
    if not url:
        raise HTTPException(status_code=400, detail='URL parameter required')

    image_url = unquote(url)
    if not image_url.lower().startswith('http://') and not image_url.lower().startswith('https://'):
        raise HTTPException(status_code=400, detail='Invalid URL')

    try:
        async def stream_image():
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Referer': 'https://www.google.com/',
                }
                async with client.stream('GET', image_url, headers=headers) as response:
                    content_type = response.headers.get('content-type', '')
                    if not content_type.startswith('image/'):
                        raise HTTPException(status_code=415, detail='Target URL did not return an image')

                    async for chunk in response.aiter_bytes():
                        yield chunk

        return StreamingResponse(
            stream_image(),
            media_type='image/jpeg',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
            },
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=f'Failed to fetch image from source URL: {error}')
