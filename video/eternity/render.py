#!/usr/bin/env python3
"""Render an original illustrated lyric film from the user's MP3 + bilingual LRC.
Usage: python render.py --audio 'AiRI - Eternity.mp3' --lyrics 'Eternity - AiRI.lrc'
Requires: pillow, numpy, opencv-python-headless, imageio-ffmpeg.
"""
import argparse
import bisect
import json
import math
from pathlib import Path
import re
import subprocess
import time

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FPS = 24
# Each cut is deliberately placed at a phrase/section boundary, not a repeated loop.
CUTS = [
    (0, 'coast'), (8.5, 'train'), (23.21, 'coast'), (36.45, 'sunflowers'),
    (48.46, 'window'), (58.37, 'train'), (70.20, 'sunflowers'),
    (83.20, 'coast'), (90.77, 'train'), (104, 'window'),
    (110.81, 'window'), (124.25, 'coast'), (136.24, 'train'),
    (146.12, 'sunflowers'), (157.90, 'sunflowers'), (171.11, 'coast'),
    (178.34, 'train'), (190, 'window'), (197.57, 'window'),
    (210.91, 'sunflowers'), (224.11, 'sunset'), (237.29, 'sunset'),
    (248.6, 'sunset'), (259.5, 'sunset'),
]


def parse_lyrics(path):
    groups = {}
    offset = 0
    raw = path.read_text(encoding='utf-8-sig')
    offset_match = re.search(r'\[offset:([+-]?\d+)\]', raw)
    if offset_match:
        offset = int(offset_match.group(1)) / 1000
    for line in raw.splitlines():
        stamps = re.findall(r'\[(\d+):(\d+(?:\.\d+)?)\]', line)
        text = re.sub(r'\[[^\]]*\]', '', line).strip()
        if not stamps or not text:
            continue
        for minutes, seconds in stamps:
            t = max(0, int(minutes) * 60 + float(seconds) + offset)
            groups.setdefault(t, []).append(text)
    result = []
    times = sorted(groups)
    for i, start in enumerate(times):
        # An instrumental break shouldn't hold the previous subtitle for 20 seconds.
        end = min(times[i + 1] if i + 1 < len(times) else start + 6.8, start + 7.4)
        result.append({'start': start, 'end': end, 'lines': groups[start]})
    return result


def srt_time(t):
    ms = round(t * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'


def text_layer(lines, sizes, colors):
    image = Image.new('RGBA', (1400, 190), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    fonts = ['Japanese.ttf', 'Chinese.ttf']
    for i, (line, size, color) in enumerate(zip(lines, sizes, colors)):
        font = ImageFont.truetype(str(ROOT / 'fonts' / fonts[min(i, 1)]), size)
        while draw.textlength(line, font=font) > 1320:
            size -= 1
            font = ImageFont.truetype(str(ROOT / 'fonts' / fonts[min(i, 1)]), size)
        y = 40 + i * 60
        draw.text((701, y + 2), line, font=font, anchor='mm', fill=(12, 24, 35, 230), stroke_width=3, stroke_fill=(12, 24, 35, 190))
        draw.text((700, y), line, font=font, anchor='mm', fill=color, stroke_width=1, stroke_fill=(20, 30, 40, 190))
    bbox = image.getbbox()
    return np.array(image.crop(bbox))


def blend_text(frame, overlay, opacity, cx, cy):
    if opacity <= 0:
        return
    h, w = overlay.shape[:2]
    x = int(cx - w / 2); y = int(cy - h / 2)
    roi = frame[y:y+h, x:x+w]
    if roi.shape[:2] != (h, w):
        return
    alpha = overlay[:, :, 3:4].astype(np.float32) / 255 * opacity
    frame[y:y+h, x:x+w] = (roi.astype(np.float32)*(1-alpha) + overlay[:, :, :3]*alpha).astype(np.uint8)


def smooth(x):
    x = max(0, min(1, x))
    return x * x * (3-2*x)


def run(args):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    raw_audio = subprocess.check_output([
        ffmpeg, '-v', 'error', '-i', str(args.audio), '-vn', '-ac', '1', '-ar', '12000',
        '-f', 'f32le', 'pipe:1',
    ])
    samples = np.frombuffer(raw_audio, dtype=np.float32)
    duration = len(samples)/12000
    frames = math.ceil(duration*FPS)
    width, height = args.width, args.width*9//16
    lyrics = parse_lyrics(args.lyrics)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    srt_path = args.output.with_suffix('.srt')
    srt_path.write_text('\n\n'.join(f"{i+1}\n{srt_time(x['start'])} --> {srt_time(x['end'])}\n"+'\n'.join(x['lines']) for i,x in enumerate(lyrics))+'\n', encoding='utf-8')
    captions = []
    for row in lyrics:
        layer = text_layer(row['lines'], [46, 32], [(252, 247, 229, 255), (229, 232, 222, 245)])
        if width != 1920:
            layer = cv2.resize(layer, (round(layer.shape[1]*width/1920), round(layer.shape[0]*width/1920)))
        captions.append(layer)
    title = text_layer(['E T E R N I T Y', 'AiRI  /  夏日回忆'], [94, 37], [(255, 249, 225, 255), (242, 235, 218, 255)])
    closing = text_layer(['E T E R N I T Y', 'AiRI'], [70, 33], [(255, 243, 220, 255), (243, 230, 217, 255)])
    small = text_layer(['ETERNITY   /   AiRI'], [22], [(244, 241, 227, 220)])
    if width != 1920:
        title=cv2.resize(title,None,fx=width/1920,fy=width/1920)
        closing=cv2.resize(closing,None,fx=width/1920,fy=width/1920)
        small=cv2.resize(small,None,fx=width/1920,fy=width/1920)
    images = {}
    for name in {c[1] for c in CUTS}:
        image = cv2.imread(str(ROOT/'art'/f'{name}.jpg'))
        images[name] = cv2.resize(image, (width+160, height+90), interpolation=cv2.INTER_CUBIC)
    top_gradient = (1 - .18*np.exp(-np.arange(height)/100))[:,None,None]
    bottom_gradient = (1-.30*np.clip((np.arange(height)-height*.70)/(height*.30),0,1)**1.3)[:,None,None]
    # Precompute quiet filmic edge shading once. Captions remain highly legible.
    yy, xx = np.mgrid[0:height, 0:width]
    vignette = np.clip(1-.11*((xx-width/2)/(width/2))**2-.08*((yy-height/2)/(height/2))**2,.70,1)
    shade = (top_gradient * bottom_gradient * vignette[:,:,None]).astype(np.float32)
    rng=np.random.default_rng(714)
    particles=[(float(rng.uniform(0,width)),float(rng.uniform(0,height)),float(rng.uniform(.5,1.5)),float(rng.uniform(0,6.28))) for _ in range(32)]
    cmd = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'rawvideo',
           '-pix_fmt', 'rgb24', '-s', f'{width}x{height}', '-r', str(FPS), '-i', 'pipe:0',
           '-i', str(args.audio), '-map', '0:v', '-map', '1:a:0',
           '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-maxrate', '1800k', '-bufsize', '3600k',
           '-pix_fmt', 'yuv420p', '-threads', '2', '-c:a', 'aac', '-b:a', '192k',
           '-t', f'{duration:.6f}', '-movflags', '+faststart',
           '-metadata', 'title=Eternity — AiRI | Summer Memories',
           '-metadata', 'comment=Original AI-generated illustrated lyric film; audio and LRC supplied by user.',
           str(args.output)]
    encoder = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    starts=[c[0] for c in CUTS]
    lyric_starts=[l['start'] for l in lyrics]
    def image_frame(index,t):
        start,name=CUTS[index]
        end=starts[index+1] if index+1<len(starts) else duration
        p=max(0,min(1,(t-start)/(end-start)))
        # Smooth pan and up to 5% zoom, alternate directions on each cut.
        zoom=1.0+.045*(p if index%2==0 else 1-p)
        source=images[name]
        sh,sw=source.shape[:2]
        cropw=int(width/zoom);croph=int(height/zoom)
        px=int((sw-cropw)*(.28+.4*p if index%2 else .68-.36*p))
        py=int((sh-croph)*(.45+.08*math.sin(p*math.pi)))
        frame=cv2.resize(source[py:py+croph,px:px+cropw],(width,height),interpolation=cv2.INTER_LINEAR)
        return frame
    started=time.monotonic()
    try:
        for i in range(frames):
            t=i/FPS
            if args.preview_seconds and t>args.preview_seconds: break
            index=bisect.bisect_right(starts,t)-1
            frame=image_frame(index,t)
            if index>0 and t-starts[index]<.9:
                prev=image_frame(index-1,t)
                frame=cv2.addWeighted(prev,1-smooth((t-starts[index])/.9),frame,smooth((t-starts[index])/.9),0)
            # BGR->RGB for the encoder and PIL's text colors.
            frame=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
            frame=(frame.astype(np.float32)*shade).astype(np.uint8)
            pos=int(t*12000);chunk=samples[pos:pos+500]
            energy=min(1,float(np.sqrt(np.mean(chunk*chunk))) * 3) if len(chunk) else 0
            # Slow dust/light motes, not a distracting spectrum or UI.
            for px,py,speed,phase in particles:
                x=int((px+math.sin(t*.15+phase)*25+t*speed*.65)%width)
                y=int((py-t*speed*3.3)%height)
                alpha=.20+.11*math.sin(t*.7+phase)
                if y<height*.77:
                    radius=1+(1 if speed>1.25 else 0)
                    color=tuple(int(c*(1-alpha)+v*alpha) for c,v in zip(frame[y,x],(255,245,213)))
                    cv2.circle(frame,(x,y),radius,color,-1,cv2.LINE_AA)
            # Subtle audio-reactive line tucked into the cinematic upper frame.
            if 10<t<duration-11:
                cv2.line(frame,(int(width*.047),int(height*.067)),(int(width*.047+(32+energy*20)*width/1920),int(height*.067)),(239,227,206),1,cv2.LINE_AA)
                blend_text(frame,small,.78,width*.14,height*.067)
            if 9<t<21.8:
                opacity=smooth((t-9)/1.5)*smooth((21.8-t)/1.2)
                blend_text(frame,title,opacity,width/2,height*.46)
            if duration-15<t<duration-2:
                opacity=smooth((t-(duration-15))/1.8)*smooth((duration-2-t)/1.5)
                blend_text(frame,closing,opacity,width/2,height*.43)
            j=bisect.bisect_right(lyric_starts,t)-1
            if j>=0 and lyrics[j]['start']<=t<lyrics[j]['end']:
                row=lyrics[j]
                opacity=smooth((t-row['start'])/.12)*smooth((row['end']-t)/.15)
                blend_text(frame,captions[j],opacity,width/2,height*.887+3*(1-opacity))
            # Top/bottom letterbox strips are visual framing, not controls.
            border=round(height*.022)
            frame[:border]=[13,22,27]; frame[-border:]=[13,22,27]
            fade=smooth((duration-t)/2.3)
            if fade<1: frame=(frame.astype(np.float32)*fade).astype(np.uint8)
            encoder.stdin.write(frame.tobytes())
            if i%(FPS*10)==0:
                print(f'Render {t:.0f}/{duration:.1f}s ({i/frames*100:.1f}%) | elapsed {time.monotonic()-started:.0f}s',flush=True)
    finally:
        encoder.stdin.close()
    code=encoder.wait()
    if code: raise RuntimeError(f'FFmpeg failed: {code}')
    metadata={'title':'Eternity — AiRI / Summer Memories','duration_seconds':duration,'resolution':[width,height],'fps':FPS,'lyric_cues':len(lyrics),'cuts':CUTS,'assets':'Original AI-generated backgrounds','audio_source':args.audio.name,'lyrics_source':args.lyrics.name}
    args.output.with_suffix('.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print(f'Finished: {args.output} ({args.output.stat().st_size/1024/1024:.1f} MiB)',flush=True)


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--audio',type=Path,required=True)
    p.add_argument('--lyrics',type=Path,required=True)
    p.add_argument('--output',type=Path,default=ROOT/'Eternity-AiRI-1080p.mp4')
    p.add_argument('--width',type=int,default=1920)
    p.add_argument('--preview-seconds',type=float,default=0)
    run(p.parse_args())
