import { Body, ConvexPolyhedron, Plane, SAPBroadphase, Vec3, World } from './vendor/cannon-es-0.20.0.js';

const holdLimit = 6000;
const waveInterval = 60_000;
const waveDuration = 2700;
const remapInterval = 3000;
const blockHeight = .84;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const directions = [
  { name: 'Forward', arrow: '↑', x: 0, z: -1 },
  { name: 'Left', arrow: '←', x: -1, z: 0 },
  { name: 'Right', arrow: '→', x: 1, z: 0 },
  { name: 'Back', arrow: '↓', x: 0, z: 1 },
];
const vertices = [
  [-.60,-.42,-.60], [.60,-.42,-.60], [.60,-.42,.60], [-.60,-.42,.60],
  [-.49,.42,-.49], [.49,.42,-.49], [.49,.42,.49], [-.49,.42,.49],
].map(point => new Vec3(...point));
const faces = [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]];
const shape = new ConvexPolyhedron({vertices,faces});
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const artwork = '<dialog class="babel-game" aria-labelledby="babel-game-title">' +
  '<div class="babel-top"><div><h2 id="babel-game-title">Babel</h2><p>Build a tower with a language that keeps changing.</p></div>' +
  '<form method="dialog"><button type="submit" aria-label="Close game">Close <span aria-hidden="true">×</span></button></form></div>' +
  '<div class="babel-layout"><div class="babel-scene"><canvas tabindex="0" aria-label="Sand tower. Press and hold to lift a block, release to drop."></canvas>' +
  '<div class="babel-scene-status"><strong data-babel-status>Hold to lift</strong><span data-babel-time></span></div>' +
  '<div class="babel-hold-meter" aria-hidden="true"><i></i></div></div>' +
  '<div class="babel-panel"><dl class="babel-scores"><div><dt>Height</dt><dd data-babel-height>0.0</dd></div><div><dt>Best</dt><dd data-babel-best>0.0</dd></div></dl>' +
  '<div class="babel-control-heading"><span>Next wave</span><span data-babel-wave>1:00</span></div>' +
  '<div class="babel-controls"><div class="babel-control-heading"><span>Direction keys</span><span data-babel-remap>3.0 s</span></div>' +
  '<div class="babel-keys">' + directions.map((direction,index) => '<button type="button" data-babel-direction="' + index + '"><span class="babel-key-direction">' + direction.arrow + ' ' + direction.name + '</span><kbd></kbd></button>').join('') + '</div></div>' +
  '<p class="babel-instructions">Hold down a trackpad click or touch the sand. Move with the letters shown and release to drop. The keys change after a move or three seconds. You have six seconds before the block falls. A wave hits the beach every minute.</p>' +
  '<button type="button" class="babel-reset">Start again</button></div></div></dialog>';

function makeWorld() {
  const world = new World({gravity:new Vec3(0,-10,0),allowSleep:true});
  world.broadphase = new SAPBroadphase(world);
  world.solver.iterations = 24;
  world.defaultContactMaterial.friction = .58;
  world.defaultContactMaterial.restitution = .025;
  const floor = new Body({mass:0,shape:new Plane()});
  floor.quaternion.setFromEuler(-Math.PI/2,0,0);
  world.addBody(floor);
  return world;
}

function blockPoints(body) {
  return vertices.map(vertex => body.quaternion.vmult(vertex).vadd(body.position));
}

function makeRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const grain = document.createElement('canvas');
  grain.width = grain.height = 72;
  const texture = grain.getContext('2d');
  const pixels = texture.createImageData(72,72);
  for(let i=0;i<pixels.data.length;i+=4){
    const tone = Math.random() < .48 ? 0 : 255;
    pixels.data.set([tone,tone,tone,Math.random()*31],i);
  }
  texture.putImageData(pixels,0,0);
  const pattern = ctx.createPattern(grain,'repeat');
  const cosYaw = Math.cos(.45), sinYaw = Math.sin(.45);
  const cosPitch = Math.cos(.47), sinPitch = Math.sin(.47);
  let cameraHeight = 3.6;

  function polygon(points) {
    ctx.beginPath();
    points.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.closePath();
  }

  return (blocks, held, tallest, dt, wave) => {
    const w=canvas.clientWidth, h=canvas.clientHeight;
    if(!w || !h) return;
    const ratio=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){
      canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
    }
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const goal=Math.max(3.6,tallest+1.45,held ? held.position.y+.6 : 0);
    cameraHeight+=(goal-cameraHeight)*(1-Math.exp(-dt*4.5));
    const distance=10.9+cameraHeight*1.38;
    const focal=Math.min(w,h)*1.50;
    const focusY=cameraHeight*.49;
    function project(point) {
      const x=cosYaw*point.x-sinYaw*point.z;
      const sideways=sinYaw*point.x+cosYaw*point.z;
      const y=point.y-focusY;
      const depth=Math.max(1,distance-sideways*cosPitch-y*sinPitch);
      return {x:w*.5+x*focal/depth,y:h*.49-(y*cosPitch-sideways*sinPitch)*focal/depth,depth};
    }
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#172c34');sky.addColorStop(.47,'#52666a');
    sky.addColorStop(.52,'#8c8270');sky.addColorStop(1,'#ad8960');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){
      const y=h*(.39+i*.021);
      ctx.beginPath();ctx.moveTo(0,y);
      ctx.bezierCurveTo(w*.32,y-7,w*.68,y+8,w,y-1);
      ctx.strokeStyle=i%2?'#e3d5b32c':'#21383d38';ctx.lineWidth=1;ctx.stroke();
    }
    const platform=[[-3.9,-3.9],[3.9,-3.9],[3.9,3.9],[-3.9,3.9]].map(([x,z])=>project({x,y:0,z}));
    polygon(platform);ctx.fillStyle='#a98963';ctx.fill();
    ctx.fillStyle=pattern;ctx.fill();ctx.strokeStyle='#eed2a26b';ctx.stroke();
    for(let i=-3;i<=3;i++){
      for(const [a,b] of [[{x:i,y:.006,z:-3.9},{x:i,y:.006,z:3.9}],[{x:-3.9,y:.006,z:i},{x:3.9,y:.006,z:i}]]){
        const from=project(a), to=project(b);
        ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);
        ctx.strokeStyle=i===0?'#f3deb363':'#edcf9e24';ctx.stroke();
      }
    }
    if(wave){
      const shore=[];
      for(let x=-7;x<=7;x+=.4){
        const ripple=.17*Math.sin(x*1.35+wave.front*.85);
        shore.push(project({x,y:.025,z:wave.front+ripple}));
      }
      const water=[project({x:-7,y:.025,z:-7.5}),project({x:7,y:.025,z:-7.5}),...shore.slice().reverse()];
      ctx.save();
      ctx.globalAlpha=wave.opacity;
      polygon(water);ctx.fillStyle='#618c91b0';ctx.fill();
      ctx.beginPath();
      shore.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));
      ctx.lineWidth=2;ctx.strokeStyle='#efe9d5cc';ctx.stroke();
      ctx.restore();
    }
    const visibleFaces=[];
    function drawBlock(body, carried) {
      const {x,y,z}=body.position;
      const shadow=project({x:x+.12,y:.01,z:z+.1});
      const radius=focal/shadow.depth*(.67+Math.min(y,8)*.045);
      ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,radius,radius*.41,0,0,Math.PI*2);
      ctx.fillStyle=carried?'#32251f55':'#32251f28';ctx.fill();
      const points=blockPoints(body).map(project);
      const colors=carried?['#ae8051','#f0d3a0','#c59b66','#b58957','#9d734b','#d9b781']
        :['#99704b','#d9bc85','#ba935e','#a98052','#8b653f','#caa875'];
      for(const [index,face] of faces.entries()){
        const screen=face.map(vertex=>points[vertex]);
        const area=screen.reduce((sum,p,i)=>{
          const q=screen[(i+1)%screen.length];return sum+p.x*q.y-p.y*q.x;
        },0);
        if(area>=0) continue;
        visibleFaces.push({screen,color:colors[index],depth:screen.reduce((sum,p)=>sum+p.depth,0)/screen.length});
      }
    }
    blocks.forEach(body=>drawBlock(body,false));
    if(held) drawBlock(held,true);
    visibleFaces.sort((a,b)=>b.depth-a.depth);
    for(const face of visibleFaces){
      polygon(face.screen);ctx.fillStyle=face.color;ctx.fill();
      ctx.fillStyle=pattern;ctx.fill();ctx.strokeStyle='#50372568';ctx.lineWidth=.75;ctx.stroke();
    }
  };
}

function createGame() {
  const template=document.createElement('template');
  template.innerHTML=artwork;
  const dialog=template.content.firstElementChild;
  document.body.append(dialog);
  const canvas=dialog.querySelector('canvas');
  const status=dialog.querySelector('[data-babel-status]');
  const time=dialog.querySelector('[data-babel-time]');
  const remap=dialog.querySelector('[data-babel-remap]');
  const waveLabel=dialog.querySelector('[data-babel-wave]');
  const heightLabel=dialog.querySelector('[data-babel-height]');
  const bestLabel=dialog.querySelector('[data-babel-best]');
  const meter=dialog.querySelector('.babel-hold-meter i');
  const pads=[...dialog.querySelectorAll('[data-babel-direction]')];
  const render=makeRenderer(canvas);
  let world=makeWorld(), blocks=[], held=null, pointer=null, lastDrop=null;
  let lettersByDirection=[], remapAt=0, holdUntil=0, landedAt=0;
  let frame=0, previous=0, best=0, opener;
  let playTime=0, nextWave=waveInterval, waveStart=-Infinity, swept=new WeakSet();

  function shuffle(now) {
    const pool=letters.filter(letter=>!lettersByDirection.includes(letter));
    lettersByDirection=directions.map(()=>pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    pads.forEach((pad,i)=>{
      pad.querySelector('kbd').textContent=lettersByDirection[i];
      pad.setAttribute('aria-label',directions[i].name+' '+lettersByDirection[i]);
      pad.style.order=lettersByDirection[i].charCodeAt(0);
    });
    remapAt=now+remapInterval;
  }

  const topVertex=new Vec3();
  function highestPoint(excludedBody) {
    let height=0;
    for(const body of blocks){
      if(body===excludedBody) continue;
      for(const vertex of vertices){
        body.quaternion.vmult(vertex,topVertex);
        height=Math.max(height,body.position.y+topVertex.y);
      }
    }
    return height;
  }

  function canLift(now) {
    return !lastDrop || (now-landedAt>=600 && (lastDrop.velocity.length()<.55 || now-landedAt>=1400));
  }

  function move(index,now) {
    if(!held) return;
    if(now>=holdUntil){drop(now);return;}
    const direction=directions[index];
    held.position.x=clamp(held.position.x+direction.x*.31,-3.25,3.25);
    held.position.z=clamp(held.position.z+direction.z*.31,-3.25,3.25);
    shuffle(now);
  }

  function drop(now) {
    if(!held) return;
    world.addBody(held);
    blocks.push(held);
    lastDrop=held;
    held=null;
    landedAt=now;
  }

  function release(event) {
    if(event.pointerId!==pointer) return;
    drop(performance.now());
    pointer=null;
  }

  function advanceWave() {
    if(playTime>=nextWave){
      waveStart=nextWave+Math.floor((playTime-nextWave)/waveInterval)*waveInterval;
      nextWave=waveStart+waveInterval;
      swept=new WeakSet();
    }
    const age=playTime-waveStart;
    const seconds=Math.ceil((nextWave-playTime)/1000);
    waveLabel.textContent=age<waveDuration?'Breaking':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    if(age>=waveDuration) return null;

    const surge=clamp(age/1750,0,1);
    const front=-5.8+11.6*surge;
    for(const body of blocks){
      const {x,y,z}=body.position;
      if(swept.has(body)||y>1.05||z>front+.5||z<front-1.8) continue;
      swept.add(body);
      body.wakeUp();
      body.applyImpulse(new Vec3(.14*Math.sin(x*1.3),.04,5.0+.45*Math.cos(x*.9)),new Vec3(0,.10,0));
    }
    return {front,opacity:Math.min(1,age/200)*clamp((waveDuration-age)/950,0,1)};
  }

  function tick(now) {
    const elapsed=previous?now-previous:0;
    const dt=elapsed?Math.min(.06,elapsed/1000):1/60;
    previous=now;
    playTime+=elapsed;
    if(now>=remapAt) shuffle(now);
    if(held && now>=holdUntil) drop(now);
    const wave=advanceWave();
    world.step(1/120,dt,8);
    const top=highestPoint();
    const ready=canLift(now);
    if(ready && blocks.every(body=>body.velocity.length()<.16 && body.angularVelocity.length()<.24)) best=Math.max(best,top);
    heightLabel.textContent=((ready?top:highestPoint(lastDrop))/blockHeight).toFixed(1);
    bestLabel.textContent=(best/blockHeight).toFixed(1);
    status.textContent=held?'Release to drop':!ready?'Let it land':blocks.length>=80?'Start again to clear the beach':pointer!==null?'Lift your finger':'Hold to lift';
    const remaining=held?Math.max(0,holdUntil-now):0;
    time.textContent=held?(remaining/1000).toFixed(1)+' s':'';
    meter.style.transform='scaleX('+(remaining/holdLimit)+')';
    remap.textContent=(Math.max(0,remapAt-now)/1000).toFixed(1)+' s';
    render(blocks,held,top,dt,wave);
    frame=requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown',event=>{
    const now=performance.now();
    if(event.button!==0 || pointer!==null || !canLift(now) || blocks.length>=80) return;
    event.preventDefault();
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    pointer=event.pointerId;
    const x=(Math.random()-.5)*3.0, z=(Math.random()-.5)*3.0;
    held=new Body({mass:1,shape,position:new Vec3(x,highestPoint()+1.95,z),linearDamping:.11,angularDamping:.18,sleepSpeedLimit:.13,sleepTimeLimit:.6});
    holdUntil=now+holdLimit;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,release);
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  dialog.addEventListener('keydown',event=>{
    if(!held||event.repeat||event.ctrlKey||event.altKey||event.metaKey) return;
    const index=lettersByDirection.indexOf(event.key.toUpperCase());
    if(index<0) return;
    event.preventDefault();
    move(index,performance.now());
  });
  pads.forEach((pad,index)=>{
    pad.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch' && held) {event.preventDefault();move(index,performance.now());}
    });
    pad.addEventListener('click',event=>{
      if(event.pointerType!=='touch') move(index,performance.now());
    });
  });
  dialog.querySelector('.babel-reset').addEventListener('click',()=>{
    world=makeWorld();blocks=[];held=null;pointer=null;lastDrop=null;
    playTime=0;nextWave=waveInterval;waveStart=-Infinity;swept=new WeakSet();
    shuffle(performance.now());
    canvas.focus({preventScroll:true});
  });
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(frame);
    frame=0;
    held=null;pointer=null;
    opener?.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',()=>{previous=0;});
  window.addEventListener('blur',()=>{
    if(!dialog.open) return;
    drop(performance.now());pointer=null;
  });

  return trigger=>{
    if(dialog.open) return;
    opener=trigger;
    dialog.showModal();
    canvas.focus({preventScroll:true});
    previous=0;
    shuffle(performance.now());
    frame=requestAnimationFrame(tick);
  };
}

let openGame;
export function openBabelTower(trigger) {
  openGame ??= createGame();
  openGame(trigger);
}

