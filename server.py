import http.server
import socketserver
import os
import json
from PIL import Image
import socket
from concurrent.futures import ThreadPoolExecutor
import hashlib

PORT = 8000
IMAGE_FOLDER = "umamusume_downloads"
THUMB_FOLDER = "umamusume_thumbs"
THUMB_SIZE = (320, 426)
THUMB_QUALITY = 88
PAGE_SIZE = 50

def generate_thumbs():
    os.makedirs(THUMB_FOLDER, exist_ok=True)
    
    all_files = [f for f in os.listdir(IMAGE_FOLDER) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    
    to_generate = []
    for fname in all_files:
        base_name = os.path.splitext(fname)[0]
        thumb_path = os.path.join(THUMB_FOLDER, f"{base_name}.jpg")
        if not os.path.exists(thumb_path):
            to_generate.append(fname)
    
    for fname in to_generate:
        src_path = os.path.join(IMAGE_FOLDER, fname)
        base_name = os.path.splitext(fname)[0]
        thumb_path = os.path.join(THUMB_FOLDER, f"{base_name}.jpg")
        
        try:
            with Image.open(src_path) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGBA')
                    background = Image.new('RGBA', img.size, (255, 255, 255, 255))
                    background.paste(img, mask=img.split()[-1])
                    img = background.convert('RGB')
                else:
                    img = img.convert('RGB')
                
                img.thumbnail(THUMB_SIZE, Image.Resampling.LANCZOS)
                img.save(thumb_path, "JPEG", quality=THUMB_QUALITY, optimize=True)
        except:
            pass

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        if self.path.startswith('/api/images'):
            self.handle_api_images()
        elif self.path == '/api/stats':
            self.handle_api_stats()
        elif self.path.startswith(f'/{IMAGE_FOLDER}/') or self.path.startswith(f'/{THUMB_FOLDER}/'):
            self.handle_static_files()
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            html_content = self.get_html_content()
            self.wfile.write(html_content.encode('utf-8'))
    
    def get_html_content(self):
        images_count = len([f for f in os.listdir(IMAGE_FOLDER) 
                           if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4'))]) if os.path.exists(IMAGE_FOLDER) else 0
        thumbs_count = len(os.listdir(THUMB_FOLDER)) if os.path.exists(THUMB_FOLDER) else 0
        host = self.headers.get('Host', f'localhost:{PORT}')
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Umamusume Gallery API 🎨</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    padding: 20px;
                }}
                .container {{
                    max-width: 900px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }}
                h1 {{ 
                    font-size: 3em; 
                    margin-bottom: 10px; 
                    text-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }}
                .subtitle {{
                    opacity: 0.9;
                    font-size: 1.2em;
                    margin-bottom: 40px;
                }}
                .stats {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }}
                .stat {{
                    background: rgba(255, 255, 255, 0.15);
                    padding: 25px;
                    border-radius: 16px;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: transform 0.3s ease;
                }}
                .stat:hover {{
                    transform: translateY(-5px);
                }}
                .stat h2 {{
                    font-size: 3em;
                    color: #64ffda;
                    margin-bottom: 8px;
                }}
                .stat p {{
                    opacity: 0.9;
                    font-size: 1.1em;
                }}
                .endpoints {{
                    margin-top: 40px;
                }}
                .endpoint {{
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 15px 0;
                    border-left: 4px solid #64ffda;
                }}
                .endpoint h3 {{
                    margin-bottom: 10px;
                    font-size: 1.3em;
                }}
                .endpoint code {{
                    background: rgba(0, 0, 0, 0.3);
                    padding: 12px;
                    border-radius: 8px;
                    display: block;
                    font-family: 'Monaco', 'Courier New', monospace;
                    color: #64ffda;
                    word-break: break-all;
                    font-size: 0.95em;
                }}
                .endpoint code a {{
                    color: #64ffda;
                    text-decoration: none;
                }}
                .endpoint code a:hover {{
                    text-decoration: underline;
                }}
                .btn {{
                    display: inline-block;
                    background: #64ffda;
                    color: #020202;
                    padding: 16px 32px;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: bold;
                    margin-top: 30px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(100, 255, 218, 0.4);
                }}
                .btn:hover {{
                    background: #52e5c3;
                    box-shadow: 0 6px 20px rgba(100, 255, 218, 0.6);
                }}
                .footer {{
                    margin-top: 50px;
                    text-align: center;
                    opacity: 0.8;
                    font-size: 0.9em;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎨 Umamusume Gallery</h1>
                <p class="subtitle">Высокопроизводительный API для мобильной галереи</p>
                
                <div class="stats">
                    <div class="stat">
                        <h2>{images_count}</h2>
                        <p>📸 Изображений</p>
                    </div>
                    <div class="stat">
                        <h2>{thumbs_count}</h2>
                        <p>🖼️ Превьюшек</p>
                    </div>
                    <div class="stat">
                        <h2>{PORT}</h2>
                        <p>🔧 Порт</p>
                    </div>
                </div>
                
                <div class="endpoints">
                    <div class="endpoint">
                        <h3>📋 Список всех изображений</h3>
                        <code>GET <a href="/api/images">http://{host}/api/images</a></code>
                    </div>
                    
                    <div class="endpoint">
                        <h3>📊 Статистика</h3>
                        <code>GET <a href="/api/stats">http://{host}/api/stats</a></code>
                    </div>
                    
                    <div class="endpoint">
                        <h3>🖼️ Оригинальное изображение</h3>
                        <code>GET http://{host}/{IMAGE_FOLDER}/[имя_файла]</code>
                    </div>
                    
                    <div class="endpoint">
                        <h3>🔍 Превьюшка (320x426)</h3>
                        <code>GET http://{host}/{THUMB_FOLDER}/[имя_файла].jpg</code>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="/api/images" class="btn">📊 Посмотреть JSON</a>
                </div>
                
                <div class="footer">
                    <p>⚡ Оптимизировано для работы с 3000+ изображениями</p>
                    <p style="margin-top: 8px; font-size: 0.9em;">
                        🚀 React Native Gallery Server v2.0
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def handle_api_images(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, max-age=300")
        self.end_headers()

        query = self.path.split('?')[1] if '?' in self.path else ''
        params = dict(q.split('=') for q in query.split('&')) if query else {}
        page = int(params.get('page', 1))
        per_page = PAGE_SIZE

        files = []
        image_path = os.path.join(os.getcwd(), IMAGE_FOLDER)
        
        if os.path.isdir(image_path):
            all_files = sorted(os.listdir(image_path))
            start = (page - 1) * per_page
            end = start + per_page
            paginated_files = all_files[start:end]
            
            for fname in paginated_files:
                lower = fname.lower()
                if not lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4')):
                    continue
                    
                base = os.path.splitext(fname)[0]
                thumb_fname = f"{base}.jpg"
                thumb_exists = os.path.exists(os.path.join(THUMB_FOLDER, thumb_fname))
                is_video = lower.endswith(('.webm', '.mp4', '.gif'))
                
                files.append({
                    "name": fname,
                    "url": f"/{IMAGE_FOLDER}/{fname}",
                    "thumb": f"/{THUMB_FOLDER}/{thumb_fname}" if thumb_exists and not is_video else None,
                    "isVideo": is_video
                })
        
        self.wfile.write(json.dumps(files, ensure_ascii=False).encode('utf-8'))
    
    def handle_api_stats(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json; charset=utf-8")
        self.end_headers()
        
        stats = {
            "images": len([f for f in os.listdir(IMAGE_FOLDER) 
                          if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4'))]),
            "thumbs": len(os.listdir(THUMB_FOLDER)) if os.path.exists(THUMB_FOLDER) else 0,
            "port": PORT,
            "thumbSize": THUMB_SIZE,
            "thumbQuality": THUMB_QUALITY
        }
        
        self.wfile.write(json.dumps(stats, ensure_ascii=False).encode('utf-8'))
    
    def handle_static_files(self):
        try:
            filepath = self.path.lstrip('/')
            if not os.path.exists(filepath):
                self.send_error(404, f"File not found: {filepath}")
                return
            
            mime_type = self.get_mime_type(filepath)
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            
            if filepath.startswith(THUMB_FOLDER):
                self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            else:
                self.send_header('Cache-Control', 'public, max-age=86400')
            
            with open(filepath, 'rb') as f:
                content = f.read()
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                
        except Exception as e:
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def get_mime_type(self, filename):
        ext = os.path.splitext(filename)[1].lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm'
        }
        return mime_types.get(ext, 'application/octet-stream')

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 100

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    if not os.path.exists(IMAGE_FOLDER):
        exit(1)
    
    if not os.path.exists(THUMB_FOLDER):
        os.makedirs(THUMB_FOLDER)
        generate_thumbs()
    else:
        images = [f for f in os.listdir(IMAGE_FOLDER) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        thumbs = os.listdir(THUMB_FOLDER)
        
        if len(thumbs) < len(images) * 0.9:
            generate_thumbs()
    
    local_ip = get_local_ip()
    
    with ThreadedTCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass