#!/usr/bin/env python3
import http.server, json, subprocess, tempfile, pathlib, shutil, uuid, threading, webbrowser, os
ROOT=pathlib.Path(__file__).resolve().parent
CACHE=pathlib.Path(tempfile.mkdtemp(prefix='local-crop-'))
JOBS={}
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path.startswith('/job/'):
   self.reply(JOBS.get(self.path.split('/')[-1],{'error':'任务不存在'}));return
  if self.path.startswith('/download/'):
   name=self.path.split('/')[-1]; p=CACHE/name
   if p.parent!=CACHE or not p.is_file():self.send_error(404);return
   self.send_response(200);self.send_header('Content-Type','video/mp4');self.send_header('Content-Length',str(p.stat().st_size));self.send_header('Content-Disposition','attachment; filename="cropped.mp4"');self.end_headers()
   with p.open('rb') as f:shutil.copyfileobj(f,self.wfile)
   return
  super().do_GET()
 def reply(self,data,status=200):
  b=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_POST(self):
  if self.headers.get('Origin') not in (None,'http://'+self.headers.get('Host','')):self.reply({'error':'来源不允许'},403);return
  if self.path!='/export':self.send_error(404);return
  try:
   n=int(self.headers.get('Content-Length',0))
   if n<=0:raise ValueError('文件为空')
   opts=json.loads(self.headers.get('X-Crop','{}')); x,y,w,h=[int(opts[k]) for k in ('x','y','w','h')]; start=float(opts['start']);end=float(opts['end'])
   if min(x,y,start)<0 or min(w,h)<2 or end<=start:raise ValueError('裁剪参数无效')
   jid=uuid.uuid4().hex;src=CACHE/(jid+'.input');out=CACHE/(jid+'.mp4')
   with src.open('wb') as f:
    remaining=n
    while remaining:
     chunk=self.rfile.read(min(1024*1024,remaining))
     if not chunk:raise ValueError('上传中断')
     f.write(chunk);remaining-=len(chunk)
   JOBS[jid]={'state':'processing','progress':0}
   def run():
    try:
     process=subprocess.Popen([shutil.which('ffmpeg') or 'ffmpeg','-y','-progress','pipe:1','-nostats','-ss',str(start),'-i',str(src),'-t',str(end-start),'-vf',f'crop={w}:{h}:{x}:{y},scale=trunc(iw/2)*2:trunc(ih/2)*2','-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','fast','-crf','20','-c:a','aac','-movflags','+faststart',str(out)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
     for line in process.stdout:
      key,_,value=line.strip().partition('=')
      if key=='out_time_us':
       try:JOBS[jid]={'state':'processing','progress':min(99,max(0,round(float(value)/1_000_000/(end-start)*100,1)))}
       except ValueError:pass
     code=process.wait()
     JOBS[jid]={'state':'done','progress':100,'url':'/download/'+out.name} if code==0 else {'state':'error','error':'导出失败，请检查视频格式或裁剪范围。'}
    except Exception as e:JOBS[jid]={'state':'error','error':str(e)}
    finally:src.unlink(missing_ok=True)
   threading.Thread(target=run,daemon=True).start();self.reply({'id':jid})
  except Exception as e:self.reply({'error':str(e)},400)
if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',int(os.sys.argv[os.sys.argv.index('--port')+1]) if '--port' in os.sys.argv else 57645),Handler);url=f'http://127.0.0.1:{server.server_port}';print(url,flush=True)
 if '--no-open' not in os.sys.argv:webbrowser.open(url)
 try:server.serve_forever()
 finally:shutil.rmtree(CACHE,ignore_errors=True)
