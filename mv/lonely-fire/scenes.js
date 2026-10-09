// Director's shot scripts: every picture is computed from absolute time.
// No image assets, no video playback, no remote fonts or graphics engines.
export const SHOTS = [
  [0,'intro','序幕 · 余烬'],[17,'duet','相对 · 无言'],[24,'walk','你远去'],[33,'city','城市的间奏'],
  [50,'duet','说不出口'],[59,'walk','我也远去'],[68,'rails','平行的轨道'],[84,'room','没有天地'],
  [92,'glass','独自把酒喝'],[101,'orbit','无日无夜'],[118,'room','如果你在'],[127,'fire','第一团火'],
  [133,'chains','身上的枷锁'],[141,'inferno','火与城市'],[151,'room','炽热的空房'],[168,'city','回声'],
  [184,'room','再一次 · 如果'],[193,'inferno','痛苦与欢乐'],[199,'chains','松开的链节'],
  [214,'orbit','心跳的间奏'],[237,'city','烧过的城市'],[255,'duet','最后一次沉默'],
  [267,'walk','什么也不说'],[284,'outro','尾声 · 余烬'],
].map(([start,type,label],i,a)=>({start,type,label,end:a[i+1]?.[0]||290.3079167,index:i}));
const C={ink:'#111719',coal:'#202b2d',rust:'#a6442b',copper:'#c87842',sand:'#e2b078',paper:'#eddfbd',dusk:'#3c4440'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const lerp=(a,b,p)=>a+(b-a)*p;
function path(c,pts,fill,stroke,line=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(fill){c.closePath();c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke()}}
function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function line(c,x,y,a,b,col,w=1){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke()}
function sky(c,t,hot=0){
  const g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,C.ink);g.addColorStop(.50,hot?'#64362c':'#694433');g.addColorStop(.78,hot?'#c46132':'#ad6a40');g.addColorStop(1,C.ink);c.fillStyle=g;c.fillRect(0,0,1600,900);
  for(let k=0;k<13;k++){c.globalAlpha=.065;path(c,[[0,100+k*34],[1600,65+k*34],[1600,90+k*34],[0,127+k*34]],C.paper)}c.globalAlpha=1;
}
function sun(c,x=800,y=389,r=104,intensity=1){
  c.save();c.globalAlpha=intensity;const g=c.createRadialGradient(x,y,r*.05,x,y,r*3.7);g.addColorStop(0,'#edba7355');g.addColorStop(.5,'#c8753022');g.addColorStop(1,'#c8753000');c.fillStyle=g;c.fillRect(x-r*4,y-r*4,r*8,r*8);
  ellipse(c,x,y,r,r,C.sand);c.fillStyle='#984d312a';for(let i=0;i<14;i++)c.fillRect(x-r,y-r+i*16,r*2,3+noise(i)*5);c.restore();
}
function skyline(c,t,y=515,alpha=1,shift=0){
  c.save();c.globalAlpha=alpha;
  for(let layer=0;layer<3;layer++){
    c.fillStyle=['#5c4940','#383633',C.coal][layer];
    for(let k=-1;k<23;k++){
      let w=55+noise(k+layer*100)*76,x=k*87+shift*(.1+layer*.13),h=35+noise(k*4+layer*120)*112;
      c.fillRect(x,y+layer*37-h,w,h+150);
      if(k%4===0){path(c,[[x-5,y+layer*37-h],[x+w/2,y+layer*37-h-28],[x+w+5,y+layer*37-h]],c.fillStyle)}
      if(layer===2){for(let j=0;j<3;j++)for(let n=0;n<2;n++)if(noise(k*21+j*4+n)>.58){c.fillStyle='#b3865059';c.fillRect(x+15+j*17,y+layer*37-h+18+n*24,6,10);c.fillStyle=C.coal}}
    }
  }
  for(let k=0;k<7;k++){let x=k*278+shift*.3;line(c,x,412,x,699,C.ink,7);line(c,x-36,447,x+36,447,C.ink,4);c.strokeStyle=C.ink;c.lineWidth=2;c.beginPath();c.moveTo(x-278,444);c.quadraticCurveTo(x-139,488,x,444);c.stroke()}
  c.restore();
}
function ground(c,y=593){const g=c.createLinearGradient(0,y,0,900);g.addColorStop(0,'#3e3c33');g.addColorStop(1,C.ink);c.fillStyle=g;c.fillRect(0,y,1600,900);for(let i=0;i<27;i++){let yy=y+Math.pow(i/27,1.8)*(900-y);line(c,0,yy,1600,yy,'#a08a611b',1)} }
function figure(c,x,y,size,t,walk=false,ghost=1){
 c.save();c.translate(x,y);c.scale(size,size);c.globalAlpha=ghost;
 const sway=walk?Math.sin(t*3.6)*.055:Math.sin(t*.4)*.006;c.rotate(sway);
 ellipse(c,0,-116,14,17,C.ink);
 path(c,[[-10,-98],[12,-99],[22,-52],[16,-39],[-19,-39],[-22,-56]],C.ink);
 const leg=walk?Math.sin(t*3.6)*16:3;
 line(c,-9,-44,-11+leg,0,C.ink,13);line(c,8,-44,13-leg,0,C.ink,13);
 line(c,-19,-84,-29,-38,C.ink,9);line(c,19,-84,24+(walk?Math.sin(t*3.6)*7:0),-34,C.ink,9);
 line(c,-11,-97,-16,-53,'#b17a4545',2);c.restore();
}
function shadow(c,x,y,len,bend=0,alpha=.60){c.save();c.globalAlpha=alpha;c.fillStyle='#090f12';c.beginPath();c.moveTo(x-14,y);c.bezierCurveTo(x+40*bend,y+len*.3,x-100*bend,y+len*.6,x-25+90*bend,y+len);c.lineTo(x+38+90*bend,y+len);c.bezierCurveTo(x+85*bend,y+len*.6,x+12+40*bend,y+len*.3,x+14,y);c.fill();c.restore()}
function chair(c,x,y,s=1,alpha=1){c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=alpha;path(c,[[-33,-104],[27,-104],[31,-31],[-30,-31]],'#263030',C.sand,2);for(let i=0;i<4;i++)line(c,-22+i*13,-94,-20+i*13,-37,'#b89b6f70',2);path(c,[[-39,-31],[33,-31],[52,-13],[-19,-13]],'#3e3b31',C.sand,2);line(c,-22,-13,-27,62,C.sand,3);line(c,44,-13,51,62,C.sand,3);line(c,-36,-31,-43,45,C.sand,3);c.restore()}
function flame(c,t,x=800,y=690,size=1,amp=.5,wide=false){
 c.save();c.translate(x,y);c.scale(size,size);
 const glow=c.createRadialGradient(0,-100,20,0,-120,420);glow.addColorStop(0,'#d27d324b');glow.addColorStop(1,'#d27d3200');c.fillStyle=glow;c.fillRect(-650,-800,1300,900);
 // Smooth asymmetric tongues, layered like hand-cut copper and gold paper.
 for(let layer=0;layer<4;layer++){
  c.fillStyle=[C.rust,'#c66e36','#e2a85b','#f1d898'][layer];c.globalAlpha=[.85,.88,.92,.95][layer];
  const width=(wide?280:130)*(1-layer*.21),h=(320-layer*56)*(1+amp*.10);
  const lean=Math.sin(t*.8+layer*.7)*23;
  c.beginPath();c.moveTo(-width,0);
  c.bezierCurveTo(-width*.80,-h*.10,-width*.73+lean,-h*.28,-width*.46,-h*.38);
  c.bezierCurveTo(-width*.28,-h*.55,-width*.35+lean,-h*.62,-width*.24,-h*.75);
  c.bezierCurveTo(-width*.15,-h*.87,lean-14,-h*.99,lean+6,-h*1.09);
  c.bezierCurveTo(lean+17,-h*.83,width*.29+lean,-h*.71,width*.21,-h*.59);
  c.bezierCurveTo(width*.51,-h*.60,width*.45,-h*.36,width*.63,-h*.24);
  c.bezierCurveTo(width*.76,-h*.12,width*.84,-h*.07,width,0);
  c.closePath();c.fill();
 }
 for(let k=0;k<5;k++){
   const x=(noise(k+23)-.5)*(wide?460:180),h=95+noise(k+42)*155;
   c.strokeStyle=k%2?'#f1d89877':'#d58b4266';c.lineWidth=1.5;c.beginPath();c.moveTo(x,-35);
   c.bezierCurveTo(x-25,-h*.4,x+Math.sin(t*.65+k)*30,-h*.9,x-8,-h);c.stroke();
 }
 c.restore();
}
function chain(c,t,p,x=800,y=452,r=191,release=false){
 c.save();c.translate(x,y);
 for(let k=0;k<19;k++){
  const a=k/19*Math.PI*2+t*.03,fall=release?smooth((p-.23)/.6)*(55+noise(k)*250):0;
  const dx=Math.cos(a)*(r+fall*.6),dy=Math.sin(a)*(r*.56)+fall;
  c.save();c.translate(dx,dy);c.rotate(a+Math.PI/2);ellipse(c,0,0,18,32,null,'#3f4037',8);ellipse(c,0,0,18,32,null,'#c6a477',2.5);line(c,-11,-24,-7,14,'#f0d3a55e',1);c.restore();
 }c.restore();
}
function room(c,t,p,amp,shot){
 sky(c,t);sun(c,800,358,79,.67);skyline(c,t,490,.38);
 c.fillStyle='#10191ce8';c.fillRect(0,0,490,630);c.fillRect(1110,0,490,630);
 path(c,[[0,75],[480,137],[480,630],[0,827]],'#20292a');path(c,[[1600,75],[1120,137],[1120,630],[1600,827]],'#1a2325');
 for(let i=0;i<7;i++){line(c,90+i*55,120+i*8,90+i*55,740-i*20,'#dac39616',2);line(c,1190+i*50,115-i*8,1190+i*50,640+i*23,'#dac39616',2)}
 ground(c,628);path(c,[[486,629],[1114,629],[1350,900],[260,900]],'#b1915410');
 // Empty right chair and distant left silhouette: an unfilled relationship.
 chair(c,590,644,1.2);chair(c,1020,644,1.2);
 if(shot.start<119)figure(c,590,640,1.2,t,false,.66);
 if(shot.start>=118&&shot.start<141){figure(c,1010,641,1.2,t,false,.12+.09*Math.sin(t*.35));}
 ellipse(c,800,647,205,35,'#594432','#bc966d',2);
 path(c,[[619,647],[982,647],[974,674],[629,674]],'#2c2925');
 line(c,684,674,666,843,C.ink,14);line(c,924,674,945,843,C.ink,14);
 // Small glass on the table, a shape match for the sun.
 ellipse(c,795,614,18,6,null,C.sand,2);line(c,777,614,781,643,C.sand,2);line(c,813,614,809,643,C.sand,2);ellipse(c,795,643,14,4,'#a05a2b',C.sand,1);
 if(shot.start===151)flame(c,t,800,649,.36,amp);
}
function duet(c,t,p,amp,shot){sky(c,t);sun(c,800,380+p*15,105);skyline(c,t,540,.55);ground(c,608);const spread=shot.start>240?250:185;shadow(c,800-spread,634,265,-.13);shadow(c,800+spread,634,265,.2);figure(c,800-spread,634,1.2,t);figure(c,800+spread,634,1.2,t+.8);line(c,800,452,800,636,'#edc99333',1);for(let k=0;k<5;k++)ellipse(c,800,560,27+k*18,7+k*3,null,'#cf9b5418',1)}
function walk(c,t,p,amp,shot){sky(c,t);sun(c,820,430+p*55,99,shot.start>260?.6:1);skyline(c,t,533,.75,-p*60);ground(c,622);const direction=shot.start===24?1:-1;const x=800+direction*(110+p*240);shadow(c,x,645,220+p*80,Math.sin(p*5)*.55);figure(c,x,645,1.1-p*.23,t,true);line(c,50,693,1550,640,'#d7ae6630',2)}
function city(c,t,p,amp,shot){sky(c,t,shot.start<240?1:0);sun(c,860-p*90,355+Math.sin(p*2)*30,110,.7);skyline(c,t,490,1,-p*95);ground(c,650);for(let k=0;k<14;k++){let x=k*130-100,y=665+noise(k)*80;line(c,x,y,x+170,y-20,'#daa26115',2)}if(shot.start===168){for(let k=0;k<8;k++)flame(c,t+k,100+k*205,630,.1+.03*Math.sin(k),amp)}else{figure(c,780-p*20,688,.55,t,true)} }
function rails(c,t,p){sky(c,t);sun(c,800,432,91,.7);skyline(c,t,540,.6);ground(c,626);for(const x of [250,560,1040,1350])line(c,x,900,800+(x-800)*.035,585,'#8c7e61',3);for(let k=0;k<19;k++){let yy=600+Math.pow(k/19,2)*(900-600),half=(yy-585)*1.9;line(c,800-half,yy,800+half,yy,'#5d615249',4)}figure(c,1030,714,.8,t,true)}
function glass(c,t,p,amp){sky(c,t);c.fillStyle='#11191dd9';c.fillRect(0,0,1600,900);sun(c,807,385,85,.24);const beam=c.createLinearGradient(790,0,950,700);beam.addColorStop(0,'#d7a25818');beam.addColorStop(1,'#e5b96c00');path(c,[[820,0],[920,0],[1380,740],[450,740]],beam);ellipse(c,800,696,450,68,'#654a33',C.sand,2);ellipse(c,800,693,440,57,null,'#8b6e4b',1);c.save();c.translate(800,619);c.rotate(Math.sin(t*.12)*.017);path(c,[[-72,-192],[72,-192],[56,30],[-56,30]],'#d7ca8f0a',C.sand,2);ellipse(c,0,-192,72,19,null,C.sand,2);ellipse(c,0,30,56,14,'#b5733339',C.sand,2);ellipse(c,0,-45,64,15,'#c57d3f55','#cf975c',2);for(let k=0;k<8;k++)line(c,-56,-44+k*7,56,-46+k*7,'#ffdda21a',1);line(c,-52,-162,-45,1,'#ecd2a950',2);c.restore();chair(c,1220,570,.6,.27);}
function fireScene(c,t,p,amp,shot){sky(c,t,1);skyline(c,t,605,.45);ground(c,669);flame(c,t,800,725,shot.type==='inferno'?1.65:1.12,amp,shot.type==='inferno');figure(c,shot.type==='inferno'?1260:1120,714,.7,t,false,.82);if(shot.type==='chains')chain(c,t,p,800,457,190,shot.start>=199);}
function orbit(c,t,p,amp){sky(c,t,1);c.fillStyle='#1117199a';c.fillRect(0,0,1600,900);for(let k=0;k<9;k++){c.save();c.translate(800,465);c.rotate(t*.025+k*.06);ellipse(c,0,0,150+k*36,75+k*23,null,k%2?'#d8864288':'#6a503c',1.2);c.restore()}sun(c,800+Math.cos(t*.09)*42,451+Math.sin(t*.09)*30,50+amp*4,.9);for(let k=0;k<25;k++){let a=k/25*Math.PI*2+t*.02,x=800+Math.cos(a)*360,y=465+Math.sin(a)*220;ellipse(c,x,y,2,2,'#d1965599')}if(t>214)flame(c,t,800,620,.56,amp)}
function intro(c,t,p,amp){sky(c,t);sun(c,800,438,93,.28+.72*smooth(p*2));skyline(c,t,593,.4);ground(c,686);line(c,625,720,975,720,'#c07a47',1);}
function outro(c,t,p){c.fillStyle=C.ink;c.fillRect(0,0,1600,900);skyline(c,t,638,.12);ellipse(c,800,546,2+Math.sin(t)*.3,2,'#d69459');}
const SCRIPT={intro,duet,walk,city,rails,room,glass,orbit,fire:fireScene,chains:fireScene,inferno:fireScene,outro};
// A reusable deterministic woodcut/paper texture. Low contrast avoids grit overwhelming content.
let paper;
function grain(c,t){if(!paper){paper=document.createElement('canvas');paper.width=1600;paper.height=900;const g=paper.getContext('2d');for(let k=0;k<25000;k++){const x=noise(k*3)*1600,y=noise(k*3+1)*900;g.fillStyle=k%2?'#eee0ba0b':'#070e1514';g.fillRect(x,y,noise(k)*2+.3,.7)}for(let k=0;k<180;k++){let y=noise(k+10000)*900;g.strokeStyle='#e9cda806';g.lineWidth=.6;g.beginPath();g.moveTo(0,y);g.lineTo(1600,y+noise(k)*9);g.stroke()}}c.drawImage(paper,0,0)}
export function findShot(t){let i=SHOTS.length-1;while(i>0&&t<SHOTS[i].start)i--;return SHOTS[i]}
export function drawShot(c,shot,t,amp){c.clearRect(0,0,1600,900);c.save();const p=clamp((t-shot.start)/(shot.end-shot.start));const zoom=1+smooth(p)*.018;c.translate(800,450);c.scale(zoom,zoom);c.translate(-800,-450);SCRIPT[shot.type](c,t,p,amp,shot);c.restore();
 // Rising sparks are fully time-indexed, so seek and deterministic frame capture work.
 if(['fire','chains','inferno','orbit','intro'].includes(shot.type))for(let k=0;k<65;k++){
  const speed=18+noise(k+3)*31,span=550,yy=720-((t*speed+noise(k)*span)%span),xx=800+(noise(k+33)-.5)*470+Math.sin(t*.23+k)*24;
  c.globalAlpha=.15+.32*Math.sin(Math.PI*(720-yy)/span);ellipse(c,xx,yy,1+noise(k+9)*1.6,1.5+noise(k+9)*2.5,C.sand);
 }c.globalAlpha=1;grain(c,t);
 const v=c.createRadialGradient(800,430,230,800,430,970);v.addColorStop(0,'#09111500');v.addColorStop(1,'#09111599');c.fillStyle=v;c.fillRect(0,0,1600,900);
}
