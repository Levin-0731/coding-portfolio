#!/usr/bin/env python3
"""简历编辑器本地服务：零依赖，提供 resumes/*.md 读写与 PDF 导出。

用法：python3 server.py [--port 8765] [--no-open]
"""
import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import urlopen

sys.stdout.reconfigure(line_buffering=True)

APP_ID = 'resume-editor'
ROOT = Path(__file__).resolve().parent
RESUMES = ROOT / 'resumes'
EXPORTS = ROOT / 'exports'
INDEX = EXPORTS / 'index.json'

BROWSERS = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
]

BAD_NAME = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def find_browser():
    for p in BROWSERS:
        if Path(p).exists():
            return p
    for name in ('google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'):
        if found := shutil.which(name):
            return found
    return None


def safe_name(name):
    name = (name or '').strip()
    if name.lower().endswith('.md'):
        name = name[:-3].strip()
    if not name or name.startswith('.') or BAD_NAME.search(name) or len(name) > 120:
        raise ApiError(400, '文件名不合法')
    return name


def resume_path(name):
    return RESUMES / f'{safe_name(name)}.md'


def mtime_ms(p):
    return int(p.stat().st_mtime * 1000)


def move_to_trash(p):
    trash = p.parent / '.trash'
    trash.mkdir(exist_ok=True)
    target = trash / f'{p.stem}-{datetime.now():%Y%m%d-%H%M%S}{p.suffix}'
    shutil.move(str(p), target)


def unique_path(folder, base, suffix):
    p = folder / f'{base}{suffix}'
    i = 2
    while p.exists():
        p = folder / f'{base}-{i}{suffix}'
        i += 1
    return p


# ---------- 简历 ----------

def list_resumes():
    items = []
    for p in RESUMES.glob('*.md'):
        items.append({'name': p.stem, 'mtime': mtime_ms(p)})
    items.sort(key=lambda x: x['name'])
    return items


def read_resume(name):
    p = resume_path(name)
    if not p.exists():
        raise ApiError(404, '文件不存在')
    return {'name': p.stem, 'text': p.read_text('utf-8'), 'mtime': mtime_ms(p)}


def write_resume(name, text):
    p = resume_path(name)
    p.write_text(text, 'utf-8')
    return {'name': p.stem, 'mtime': mtime_ms(p)}


def rename_resume(name, to):
    src, dst = resume_path(name), resume_path(to)
    if not src.exists():
        raise ApiError(404, '文件不存在')
    if dst.exists() and dst != src:
        raise ApiError(409, '已有同名简历')
    src.rename(dst)
    return {'name': dst.stem, 'mtime': mtime_ms(dst)}


def delete_resume(name):
    p = resume_path(name)
    if p.exists():
        move_to_trash(p)


# ---------- 导出 ----------

def load_index():
    try:
        return json.loads(INDEX.read_text('utf-8'))
    except (OSError, ValueError):
        return []


def save_index(items):
    INDEX.write_text(json.dumps(items, ensure_ascii=False, indent=2), 'utf-8')


def list_exports():
    items = [i for i in load_index()
             if (i.get('pdf') and (EXPORTS / i['pdf']).exists())
             or (i.get('md') and (EXPORTS / i['md']).exists())]
    known = {i.get('pdf') for i in items}
    for p in EXPORTS.glob('*.pdf'):
        if p.name not in known:
            items.append({'id': 'file:' + p.name, 'pdf': p.name, 'md': None,
                          'source': None, 'title': p.stem, 'time': mtime_ms(p)})
    items.sort(key=lambda x: x['time'], reverse=True)
    return items


def render_pdf(html, out):
    exe = find_browser()
    if not exe:
        return False
    tmp_html = ROOT / f'.export-{uuid.uuid4().hex}.html'
    profile = tempfile.mkdtemp(prefix='resume-export-')
    try:
        tmp_html.write_text(html, 'utf-8')
        subprocess.run([
            exe, '--headless=new', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', f'--user-data-dir={profile}',
            '--no-pdf-header-footer', '--print-to-pdf-no-header',
            '--virtual-time-budget=3000', f'--print-to-pdf={out}', tmp_html.as_uri(),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
        return out.exists() and out.stat().st_size > 0
    except (OSError, subprocess.SubprocessError):
        return False
    finally:
        tmp_html.unlink(missing_ok=True)
        shutil.rmtree(profile, ignore_errors=True)


def create_export(payload):
    source = safe_name(payload.get('source') or '简历')
    base = f'{source}-{datetime.now():%Y%m%d-%H%M}'
    pdf = unique_path(EXPORTS, base, '.pdf')
    md = pdf.with_suffix('.md')
    md.write_text(payload.get('md') or '', 'utf-8')
    ok = render_pdf(payload.get('html') or '', pdf)
    record = {
        'id': uuid.uuid4().hex[:12],
        'pdf': pdf.name if ok else None,
        'md': md.name,
        'source': source,
        'title': payload.get('title') or source,
        'time': int(time.time() * 1000),
    }
    items = load_index()
    items.append(record)
    save_index(items)
    return record


def delete_export(export_id):
    if export_id.startswith('file:'):
        p = EXPORTS / Path(export_id[5:]).name
        if p.exists():
            move_to_trash(p)
        return
    items = load_index()
    for rec in [i for i in items if i['id'] == export_id]:
        for key in ('pdf', 'md'):
            if rec.get(key) and (EXPORTS / rec[key]).exists():
                move_to_trash(EXPORTS / rec[key])
    save_index([i for i in items if i['id'] != export_id])


def reveal(rel):
    p = (ROOT / (rel or '')).resolve()
    if ROOT not in (p, *p.parents) or not p.exists():
        raise ApiError(404, '路径不存在')
    subprocess.run(['open', '-R', str(p)] if p.is_file() else ['open', str(p)])


# ---------- HTTP ----------

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body_text(self):
        length = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(length).decode('utf-8') if length else ''

    def body_json(self):
        try:
            return json.loads(self.body_text() or '{}')
        except ValueError:
            raise ApiError(400, '请求格式错误')

    def route(self, method):
        path = urlparse(self.path).path
        if not path.startswith('/api/'):
            return False
        parts = [unquote(p) for p in path[5:].split('/') if p]
        try:
            self.send_json(self.dispatch(method, parts))
        except ApiError as e:
            self.send_json({'error': str(e)}, e.status)
        except OSError as e:
            self.send_json({'error': str(e)}, 500)
        return True

    def dispatch(self, method, parts):
        match (method, parts):
            case ('GET', ['ping']):
                return {'app': APP_ID}
            case ('GET', ['resumes']):
                return list_resumes()
            case ('GET', ['resumes', name]):
                return read_resume(name)
            case ('PUT' | 'POST', ['resumes', name]):
                return write_resume(name, self.body_text())
            case ('DELETE', ['resumes', name]):
                delete_resume(name)
                return {'ok': True}
            case ('POST', ['resumes', name, 'rename']):
                return rename_resume(name, self.body_json().get('to'))
            case ('GET', ['exports']):
                return {'items': list_exports(), 'pdf': bool(find_browser())}
            case ('POST', ['exports']):
                return create_export(self.body_json())
            case ('DELETE', ['exports', export_id]):
                delete_export(export_id)
                return {'ok': True}
            case ('POST', ['reveal']):
                reveal(self.body_json().get('path'))
                return {'ok': True}
        raise ApiError(404, '接口不存在')

    def do_GET(self):
        if not self.route('GET'):
            super().do_GET()

    def do_POST(self):
        self.route('POST')

    def do_PUT(self):
        self.route('PUT')

    def do_DELETE(self):
        self.route('DELETE')


def probe(port):
    """返回 'ours'（已有本服务在跑）、'busy'（被其他程序占用）或 'free'。"""
    try:
        with urlopen(f'http://127.0.0.1:{port}/api/ping', timeout=0.5) as r:
            return 'ours' if json.load(r).get('app') == APP_ID else 'busy'
    except HTTPError:
        return 'busy'
    except (URLError, OSError, ValueError):
        pass
    with socket.socket() as s:
        return 'busy' if s.connect_ex(('127.0.0.1', port)) == 0 else 'free'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', 8790)))
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()

    RESUMES.mkdir(exist_ok=True)
    EXPORTS.mkdir(exist_ok=True)

    server = None
    for port in range(args.port, args.port + 20):
        state = probe(port)
        if state == 'ours':
            url = f'http://127.0.0.1:{port}/'
            print(f'简历编辑器已在运行：{url}')
            if not args.no_open:
                webbrowser.open(url)
            return
        if state == 'free':
            try:
                server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
                break
            except OSError:
                continue
    if not server:
        print('找不到可用端口')
        return
    url = f'http://127.0.0.1:{port}/'

    print(f'简历编辑器已启动：{url}')
    print(f'简历目录：{RESUMES}')
    print(f'导出目录：{EXPORTS}')
    print(f'PDF 引擎：{find_browser() or "未找到 Chrome/Edge，将使用浏览器打印"}')
    print('关闭此窗口或按 Ctrl+C 退出')
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
