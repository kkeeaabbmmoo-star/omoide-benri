#!/usr/bin/env python3
"""Regenerate ゆずの思い出＆便利帳 from md sources. Usage: python3 build.py [--push]
PUBLIC page: never put passwords/passphrases in the md sources."""
import glob,os,re,html,json,sys,subprocess,datetime
D=os.path.dirname(os.path.abspath(__file__))
E=html.escape
def link(s):
    s=E(s);return re.sub(r'(https?://[^\s<]+)',r'<a href="\1" target="_blank">\1</a>',s)
# --- 思い出ノート
mem=[];empty=[]
for f in sorted(glob.glob('/workspace/思い出ノート/*.md')):
    t=open(f).read();m=re.search(r'^# (.+?) の思い出ノート',t,re.M);who=m.group(1) if m else os.path.basename(f)[:-3]
    secs=re.split(r'^## ',t,flags=re.M)[1:]
    if not secs:empty.append(who)
    for s in secs:
        lines=s.strip().split('\n');date=lines[0].strip();body=[l.lstrip('- ').strip() for l in lines[1:] if l.strip()]
        mem.append((date,who,body))
mem.sort(key=lambda x:x[0],reverse=True)
# --- 便利帳
bt=open('/workspace/みんなの便利帳/みんなの便利帳.md').read()
sections=[(s.split('\n')[0].strip(),[l[2:].strip() for l in s.split('\n')[1:] if l.startswith('- ')]) for s in re.split(r'^## ',bt,flags=re.M)[1:]]
dated=[x for x in sections if re.match(r'\d{4}-\d\d-\d\d',x[0])]
other={k:v for k,v in sections if not re.match(r'\d{4}-\d\d-\d\d',k)}
def ul(items):return '<ul>'+''.join('<li>'+link(i)+'</li>' for i in items)+'</ul>'
def get(prefix):
    for k,v in other.items():
        if k.startswith(prefix):return v
    return []
rem=get('予約');sites=get('フレンド')
pik=[i for _,v in dated for i in v if '【ピクミン】' in i]
call=['📞 中道さんぽ 電話予約：10/28(水) 9:00〜（前日10/27 19:00にリマインド）',
 '🍄 ピクミン巨大キノコイベント：10/28(水) 20:00 リマインド',
 '📒 みんなの便利帳：10/25〜26に作成済み']
now=datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
card=lambda title,inner:f'<section class="card"><h2>{title}</h2>{inner}</section>'
ORDER=['ゆず💖','すーさん','まい🍊','まちゃ','らん','レイ','恵','瀬戸','由依🌸']
people={}
for d,w,b in mem: people.setdefault(w,[]).append((d,b))
for w in empty: people.setdefault(w,[])
names=[n for n in ORDER if n in people]
def pcard(w):
    es=people[w]
    inner=''.join(f'<div class="md">{E(d)}</div>'+''.join(f'<p>{link(b)}</p>' for b in body) for d,body in es) or '<p class="sub">まだ記録なし（書いてくれるのを待ってるよ✍️）</p>'
    return f'<div class="mem"><div class="md"><b>{E(w)}</b>（{len(es)}件）</div>{inner}</div>'
memhtml=f'<p class="sub">みんながエイジとの思い出を書くノートだよ（{len(names)}人）</p>'+''.join(pcard(w) for w in names)
dhtml=''.join(f'<h3>{E(k)}</h3>'+ul(v) for k,v in dated)
body=card('☀️ 今朝の通話から',ul(call))+card('⏰ 予約・リマインダー',ul(rem))+card('📒 便利帳（日付別）',dhtml)+card('🍄 ピクミン情報',ul(pik))+card('💞 みんなの思い出',memhtml)+card('🤝 フレンド募集サイト',ul(sites))
page=f'''<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ゆずの思い出＆便利帳</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="思い出＆便利帳">
<meta name="theme-color" content="#ffb3c8">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
<style>body{{margin:0;background:linear-gradient(180deg,#fff0f5,#fff8e6) fixed;font-family:-apple-system,"Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif;color:#4a3340;line-height:1.6}}
header{{padding:calc(env(safe-area-inset-top) + 18px) 16px 8px;text-align:center}}h1{{font-size:22px;margin:0}}.sub{{color:#9a7b88;font-size:13px}}
main{{max-width:620px;margin:auto;padding:8px 12px 40px}}.card{{background:#fff;border-radius:18px;padding:12px 16px;margin:12px 0;box-shadow:0 2px 10px #f3c6d555}}
#rl{{display:block;width:100%;min-height:48px;margin:10px 0 2px;background:#d0567f;color:#fff;border:0;border-radius:24px;font-size:17px;font-weight:bold;box-shadow:0 2px 6px #0003}}
#rlf{{position:fixed;right:calc(env(safe-area-inset-right) + 16px);bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:9;width:56px;height:56px;border-radius:50%;border:0;background:#d0567f;color:#fff;font-size:24px;box-shadow:0 3px 10px #0004}}
body{{padding-bottom:calc(env(safe-area-inset-bottom) + 80px)}}
h2{{font-size:18px;margin:4px 0 8px}}h3{{font-size:15px;color:#d0567f;margin:10px 0 2px}}ul{{padding-left:20px;margin:4px 0}}li{{margin:4px 0}}a{{color:#d0567f;word-break:break-all}}
.mem{{border-left:4px solid #ffb3c8;padding:2px 10px;margin:8px 0}}.mem p{{margin:2px 0}}.md{{font-size:13px;color:#9a7b88}}</style></head>
<body><header><h1>💖 ゆずの思い出＆便利帳</h1><div class="sub">エイジ専用・最終更新 {now}</div><button id="rl" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄 更新</button></header><button id="rlf" aria-label="更新" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄</button><main>{body}</main></body></html>'''
open(os.path.join(D,'index.html'),'w').write(page)
json.dump({"name":"ゆずの思い出＆便利帳","short_name":"思い出＆便利帳","start_url":"./","scope":"./","display":"standalone","background_color":"#fff0f5","theme_color":"#ffb3c8","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open(os.path.join(D,'manifest.webmanifest'),'w'),ensure_ascii=False)
print('built',len(mem),'memories',len(dated),'days')
if '--push' in sys.argv:
    subprocess.run(['git','-C',D,'add','-A']);subprocess.run(['git','-C',D,'commit','-qm','update '+now]);subprocess.run(['git','-C',D,'push','-q'],check=True)
