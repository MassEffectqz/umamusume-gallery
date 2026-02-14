import requests
import os
import time
import json
import random
from tqdm import tqdm
from pathlib import Path
from PIL import Image, ImageOps
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
import threading

# TAG = "umamusume -1futa -futa_with_futa -futanari -huge_breasts"
TAG = "kitasan_black_(umamusume) -1futa -futa_with_futa -futanari -huge_breasts -armpit_hair -big_ass"
FOLDER = "kitasan_black" 
THUMB_FOLDER = "kitasan_black_thumbs" 
GENERATE_THUMBS = True 
THUMB_SIZE = (320, 426) 
THUMB_QUALITY = 85 
LIMIT_PER_PAGE = 200 
START_PAGE = 0
YOUR_API_KEY = "b2e9847eb361fa82fd8d644b9947fb0535510464decefdec6ab130f7dcc6dd26c90c86316d9d15aa882f8371f6ce2e4cc9341ec9987c7cc752172a39ac7e7838"
YOUR_USER_ID = "5923239"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

DELAY_PAGE_BASE = 1.0
DELAY_FILE_BASE = 0.1
MAX_RETRIES = 3
EMPTY_PAGES_LIMIT = 10
MAX_WORKERS = 8
LOCK = threading.Lock()

os.makedirs(FOLDER, exist_ok=True)
if GENERATE_THUMBS:
    os.makedirs(THUMB_FOLDER, exist_ok=True)

session = requests.Session()
session.headers.update(HEADERS)

def random_delay(base: float):
    delay = base + random.uniform(-0.3, 0.5)
    return max(0, delay)

def safe_json_parse(resp_text: str):
    if not resp_text.strip():
        return []
    if '<html' in resp_text.lower() or '<!doctype' in resp_text.lower():
        return []
    try:
        data = json.loads(resp_text)
        return data if isinstance(data, list) else data.get('posts', [])
    except json.JSONDecodeError:
        return []

def create_thumbnail(full_path: str, post_id: str):
    thumb_path = os.path.join(THUMB_FOLDER, f"{post_id}.jpg")
    if os.path.exists(thumb_path):
        return
    try:
        with Image.open(full_path) as img:
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (30, 30, 30))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            else:
                img = img.convert('RGB')
            img.thumbnail(THUMB_SIZE, Image.Resampling.LANCZOS)
            img.save(thumb_path, "JPEG", quality=THUMB_QUALITY, optimize=True, progressive=True)
    except:
        pass

def download_file_task(post):
    post_id = str(post.get('id', 'unknown'))
    file_url = post.get('file_url')
    
    if not file_url:
        return False
    
    ext = file_url.rsplit('.', 1)[-1].split('?')[0].lower()
    ext = ext if ext in ('jpg', 'jpeg', 'png', 'gif', 'webp', 'webm', 'mp4', 'swf') else 'jpg'
    filename = f"{post_id}.{ext}"
    full_path = os.path.join(FOLDER, filename)

    if os.path.exists(full_path):
        if GENERATE_THUMBS and ext in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
            create_thumbnail(full_path, post_id)
        return True

    for attempt in range(MAX_RETRIES):
        try:
            with session.get(file_url, stream=True, timeout=60) as r:
                r.raise_for_status()
                total_size = int(r.headers.get('content-length', 0))
                with open(full_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=32768):
                        if chunk:
                            f.write(chunk)
                if GENERATE_THUMBS and ext in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
                    create_thumbnail(full_path, post_id)
                return True
        except:
            if attempt < MAX_RETRIES - 1:
                time.sleep(random_delay(1))
            else:
                if os.path.exists(full_path):
                    os.remove(full_path)
    return False

def download_posts_parallel(posts):
    downloaded = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(download_file_task, post) for post in posts]
        for future in tqdm(futures, desc="📥 Файлы", leave=False):
            if future.result():
                with LOCK:
                    downloaded += 1
    return downloaded

print("🚀 ТУРБО-ПАРСЕР Rule34.xxx — pid += 1!")
print(f"🔗 https://rule34.xxx/index.php?page=post&s=list&tags={quote(TAG)}")
print(f"📁 {FOLDER}")
print("-" * 70)

pages_bar = tqdm(desc="Страницы", unit="стр")
consecutive_empty = 0
total_downloaded = 0
pid = START_PAGE - 1  

while True:
    tags_encoded = quote(TAG)
    
    api_url = (
        f"https://api.rule34.xxx/index.php?page=dapi"
        f"&s=post&q=index&json=1"
        f"&tags={tags_encoded}"
        f"&limit={LIMIT_PER_PAGE}"
        f"&pid={pid}"
    )
    
    if YOUR_API_KEY:
        api_url += f"&api_key={YOUR_API_KEY}"
    if YOUR_USER_ID:
        api_url += f"&user_id={YOUR_USER_ID}"

    posts = []
    retries = 0

    while retries < MAX_RETRIES:
        try:
            resp = session.get(api_url, timeout=30)
            print(f"\n📡 pid={pid} (стр={(pid//42)+1}): статус={resp.status_code}")
            
            if resp.status_code == 429:
                print("⏳ Rate limit — ждём 15 сек")
                time.sleep(15)
                retries += 1
                continue
                
            resp.raise_for_status()
            posts = safe_json_parse(resp.text)
            break
            
        except:
            retries += 1
            if retries < MAX_RETRIES:
                time.sleep(random_delay(2))

    if retries >= MAX_RETRIES or not posts:
        consecutive_empty += 1
        pages_bar.set_postfix_str(f"❌ 0 | Пустых: {consecutive_empty}/{EMPTY_PAGES_LIMIT}")
        
        if consecutive_empty >= EMPTY_PAGES_LIMIT:
            print(f"\n✅ ✅ ✅ {EMPTY_PAGES_LIMIT} пустых подряд — ВСЕ СПАРСЕНЫ!")
            break
            
        pid += 1  
        time.sleep(random_delay(DELAY_PAGE_BASE))
        pages_bar.update(1)
        continue

    consecutive_empty = 0
    pages_bar.set_postfix_str(f"{len(posts)} постов")

    page_downloaded = download_posts_parallel(posts)
    with LOCK:
        total_downloaded += page_downloaded
        print(f"📊 pid={pid}: скачано {page_downloaded}/{len(posts)}")
    
    pid += 1  
    time.sleep(random_delay(DELAY_PAGE_BASE))
    pages_bar.update(1)

print("\n" + "═" * 80)
print("✅ ✅ ✅ ПАРСЕР ЗАВЕРШЁН!")
print(f"📥 Новых файлов: {total_downloaded}")
print(f"📁 Всего в {FOLDER}: {len(os.listdir(FOLDER))}")

catalog = []
for file in os.listdir(FOLDER):
    if file.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm')):
        post_id = file.split('.')[0]
        thumb_path = f"{post_id}.jpg"
        is_video = file.lower().endswith(('.mp4', '.webm'))
        catalog.append({
            "name": file,
            "url": f"/static/{file}",
            "thumb": f"/static/thumbs/{thumb_path}" if os.path.exists(os.path.join(THUMB_FOLDER, thumb_path)) else None,
            "isVideo": is_video
        })

with open("catalog.json", "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(f"📄 catalog.json готов!")
print(f"🔗 http://localhost:3000/?tag={quote(TAG)}")
print("═" * 80)
