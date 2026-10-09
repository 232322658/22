"""Regenerate time-coded lyrics and deterministic audio energy; browser needs no Python."""
import json
import re
import subprocess
from pathlib import Path
import imageio_ffmpeg
import numpy as np

root=Path(__file__).resolve().parent
raw=(root/'assets/lyrics.lrc').read_text(encoding='utf-8-sig')
match=re.search(r'\[offset:([+-]?\d+)\]',raw)
offset=int(match[1])/1000 if match else 0
lyrics=[]
for line in raw.splitlines():
    text=re.sub(r'\[[^\]]*\]','',line).strip()
    if not text or any(x in text for x in ['music','unknow','End','Edit By','歌詞太難','－－']):
        continue
    for minutes,seconds in re.findall(r'\[(\d+):(\d+(?:\.\d+)?)\]',line):
        lyrics.append({'start':max(0,int(minutes)*60+float(seconds)-offset),'text':text})
lyrics.sort(key=lambda row:row['start'])
audio=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(root/'assets/song.mp3'),'-ac','1','-ar','12000','-f','f32le','pipe:1'])
samples=np.frombuffer(audio,dtype=np.float32)
duration=len(samples)/12000
for i,row in enumerate(lyrics):
    row['end']=min(lyrics[i+1]['start'] if i+1<len(lyrics) else duration,row['start']+7.5)
energy=[float(np.sqrt(np.mean(samples[i:i+600]**2))) for i in range(0,len(samples),600)]
normalization=max(float(np.percentile(energy,95)),.00001)
energy=[round(min(1,x/normalization),3) for x in energy]
data={'duration':duration,'offset':offset,'lyrics':lyrics,'energyRate':20,'energy':energy,'sourceCommit':'ec7daa77357c6c7d581e15ec1f33a280eeb5cf0d'}
(root/'timeline.js').write_text('export const DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(f'{len(lyrics)} cues; {duration:.3f} seconds; offset {offset:+.3f}s (positive = ahead)')
