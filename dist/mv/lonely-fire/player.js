import { DATA } from './timeline.js';
import { SHOTS, findShot, drawShot } from './scenes.js';

const $=id=>document.getElementById(id);
const audio=$('audio'),canvas=$('film'),c=canvas.getContext('2d',{alpha:false});
const offscreen=()=>{const x=document.createElement('canvas');x.width=1600;x.height=900;return x};
const current=offscreen(),previous=offscreen(),ctx=current.getContext('2d'),prev=previous.getContext('2d');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
let sync=0,raf=0,started=false;
let duration=DATA.duration;
const timeString=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
function activeLyric(t){return DATA.lyrics.find(l=>t>=l.start+sync&&t<l.end+sync)||null}
function drawCaption(text,y,size,color,alpha=1){
 c.save();c.globalAlpha=alpha;c.font=`500 ${size}px Embers, serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.shadowColor='#050d14';c.shadowBlur=12;c.shadowOffsetY=2;
 const max=1360;while(c.measureText(text).width>max&&size>20){size--;c.font=`500 ${size}px Embers, serif`}
 c.fillText(text,800,y);c.restore();
}
export function renderAt(t){
 t=Math.max(0,Math.min(duration,t));const shot=findShot(t),amp=DATA.energy[Math.min(DATA.energy.length-1,Math.floor(t*DATA.energyRate))]||0;
 drawShot(ctx,shot,t,amp);c.drawImage(current,0,0);
 const transition=1.65;
 if(shot.index>0&&t-shot.start<transition){
  drawShot(prev,SHOTS[shot.index-1],t,amp);
  c.save();c.globalAlpha=1-ease((t-shot.start)/transition);c.drawImage(previous,0,0);c.restore();
 }
 // 2.39:1 cinematic frame leaves the story and subtitles visually distinct.
 c.fillStyle='#0c1417';c.fillRect(0,0,1600,115);c.fillRect(0,785,1600,115);
 if(t<16.7){
  const a=(!started&&t===0)?1:ease((t-1.5)/2.5)*ease((16.7-t)/2);
  drawCaption('余 烬',321,71,'#e6d4b3',a);drawCaption('E M B E R S',383,14,'#b99872',a);
  drawCaption('寂寞就像一团烈火',815,24,'#dfd1b8',a);drawCaption('崔健  /  解决 · 1991',856,14,'#9c9f8b',a);
 }
 const line=activeLyric(t);
 if(line){const a=ease((t-line.start-sync)/.13)*ease((line.end+sync-t)/.16);drawCaption(line.text,809,28,'#ebdec1',a);}
 if(t>284){const a=ease((t-284)/1.8)*ease((duration-t)/1.4);drawCaption('余 烬',386,52,'#dbc39d',a);drawCaption('崔健 · 寂寞就像一团烈火',454,20,'#c5ae8b',a);drawCaption('一部由代码演算的音乐短片',835,14,'#8a9584',a);}
 if(t>duration-1.5){c.fillStyle=`rgba(9,15,19,${1-ease((duration-t)/1.5)})`;c.fillRect(0,0,1600,900)}
 $('seek').value=t;$('track-fill').style.width=`${t/duration*100}%`;$('time').innerHTML=`${timeString(t)} <b>/ ${timeString(duration)}</b>`;$('shot-name').textContent=shot.label;
 canvas.dataset.lyric=line?.text||'';canvas.dataset.shot=shot.type;canvas.dataset.time=t.toFixed(3);
 return {shot:shot.label,lyric:line?.text||'',time:t};
}
function animate(){renderAt(audio.currentTime);if(!audio.paused&&!audio.ended)raf=requestAnimationFrame(animate)}
function state(){const playing=!audio.paused&&!audio.ended;$('toggle').textContent=playing?'Ⅱ':'▶';$('toggle').setAttribute('aria-label',playing?'暂停':'播放');$('player').classList.toggle('paused',!playing)}
async function play(){
 $('loading').hidden=false;
 try{await audio.play();started=true;$('cover').classList.add('gone');state();cancelAnimationFrame(raf);animate();}
 catch(e){$('loading').textContent='音乐加载失败，请重试或下载完整目录后播放';$('loading').hidden=false;return}
 $('loading').hidden=true;
}
function pause(){audio.pause();cancelAnimationFrame(raf);renderAt(audio.currentTime);state()}
function toggle(){audio.paused?play():pause()}
$('start').addEventListener('click',play);$('toggle').addEventListener('click',toggle);
canvas.addEventListener('click',()=>{if(started)toggle()});
$('seek').addEventListener('input',e=>{const t=+e.target.value;audio.currentTime=t;renderAt(t)});
$('restart').addEventListener('click',()=>{audio.currentTime=0;renderAt(0);play()});
$('mute').addEventListener('click',()=>{audio.muted=!audio.muted;$('mute').textContent=audio.muted?'声音 关':'声音 开';$('mute').setAttribute('aria-label',audio.muted?'开启声音':'静音')});
$('full').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('player').requestFullscreen()}catch{}});
$('sync').addEventListener('change',e=>{sync=+e.target.value;renderAt(audio.currentTime)});
document.querySelectorAll('[data-seek]').forEach(b=>b.addEventListener('click',()=>{audio.currentTime=+b.dataset.seek;renderAt(audio.currentTime);play()}));
audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(audio.duration)){duration=audio.duration;$('seek').max=duration;renderAt(audio.currentTime)}});
audio.addEventListener('seeked',()=>renderAt(audio.currentTime));audio.addEventListener('pause',()=>{cancelAnimationFrame(raf);state();renderAt(audio.currentTime)});audio.addEventListener('play',state);
audio.addEventListener('ended',()=>{cancelAnimationFrame(raf);state();renderAt(duration)});
audio.addEventListener('waiting',()=>{if(started)$('loading').hidden=false});audio.addEventListener('playing',()=>{$('loading').hidden=true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderAt(audio.currentTime);if(!audio.paused){cancelAnimationFrame(raf);animate()}}});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();toggle()}if(e.code==='ArrowRight'){e.preventDefault();audio.currentTime=Math.min(duration,audio.currentTime+5)}if(e.code==='ArrowLeft'){e.preventDefault();audio.currentTime=Math.max(0,audio.currentTime-5)}});
await document.fonts.ready;
renderAt(0);state();
window.__mv={renderAt,activeLyric,DATA,SHOTS,audio,get duration(){return duration}};
