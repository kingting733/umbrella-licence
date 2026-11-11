// Local canvas exports: no result image or nickname is uploaded to generate a card.
export const GAME_URL = 'https://www.whatifhk.com/umbrella-licence/';
export const FORMATS = { story: [1080, 1920], post: [1080, 1350] };
const FONT = '"Noto Sans TC", "PingFang HK", sans-serif';
const C = { ink: '#16181d', paper: '#f7f6f1', gold: '#ffc94a', green: '#3aa36b', red: '#e23b3b', muted: '#6b6e74' };
export function captionFor(d) {
  const name = String(d.name || '陳大文').slice(0, 8);
  return d.kind === 'challenge'
    ? `如果香港擔遮要考牌？我係${name}，挑戰模式生存咗 ${Number(d.seconds).toFixed(1)} 秒！你又撐到幾耐？\n#如果香港 #擔遮考牌`
    : `如果香港擔遮要考牌？我係${name}，${{full:'全類別批准',partial:'考到縮骨遮牌',raincoat:'收到雨衣令，出街要著雨衣'}[d.grade] || '完成考試'}！到你考喇。\n#如果香港 #擔遮考牌`;
}
export function threadsURL(d) { const u = new URL('https://www.threads.com/intent/post'); u.searchParams.set('text', captionFor(d)); u.searchParams.set('url', GAME_URL); return u.href; }
export function filenameFor(d, format) { return `whatifhk-${d.kind}-${String(d.name || 'player').slice(0,8).replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g,'_')}-${format}.png`; }
function round(g,x,y,w,h,r,fill) { g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill(); }
function text(g,t,x,y,size=36,color=C.ink,align='left') { g.fillStyle=color;g.font=`900 ${size}px ${FONT}`;g.textAlign=align;g.fillText(String(t),x,y); }
function fit(g,t,x,y,max,size,color=C.ink,align='left') { while(size>20){g.font=`900 ${size}px ${FONT}`;if(g.measureText(t).width<=max)break;size-=2;}text(g,t,x,y,size,color,align); }
async function image(src) { if(!src)return null;const im=new Image();im.src=src;await im.decode();return im; }
export async function renderCard(d,format='story') {
  if(!FORMATS[format]) throw Error('Unknown format');
  if(document.fonts)await document.fonts.ready;
  const [w,h]=FORMATS[format],story=format==='story',c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  const bg=await image(d.background).catch(()=>null);
  function drawBackground() { if(!bg)return;const scale=Math.max(w/bg.width,h/bg.height),bw=bg.width*scale,bh=bg.height*scale;g.drawImage(bg,(w-bw)/2,(h-bh)/2,bw,bh); }
  g.fillStyle=C.ink;g.fillRect(0,0,w,h);drawBackground();
  const shade=g.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#101820b3');shade.addColorStop(.32,'#10182000');shade.addColorStop(.72,'#10182018');shade.addColorStop(1,'#101820cc');g.fillStyle=shade;g.fillRect(0,0,w,h);
  const top=story?150:65;
  text(g,'WHAT IF HK',70,top,30,'#fff');text(g,'如果香港',1010,top,28,C.gold,'right');
  text(g,'如果香港擔遮',70,top+103,66,'#fff');text(g,'要考牌？',70,top+194,88,C.gold);
  const py=story?900:top+245,ph=story?720:770;
  g.save();g.beginPath();g.roundRect(50,py,980,ph,32);g.clip();g.filter='blur(18px)';drawBackground();g.restore();
  round(g,50,py,980,ph,32,bg?'rgba(247,246,241,.86)':C.paper);
  const subtitle=d.kind==='challenge'?'④ 挑戰模式 · 生存紀錄':'③ 領牌 · 考試結果';
  text(g,subtitle,96,py+53,27,C.muted);
  fit(g,d.name||'陳大文',96,py+112,880,48);
  if(d.kind==='challenge') {
    text(g,'我撐咗',96,py+174,30,C.muted);
    fit(g,Number(d.seconds).toFixed(1),540,py+330,880,180,C.ink,'center');
    text(g,'秒',540,py+385,38,C.muted,'center');
    const yy=py+425;
    round(g,96,yy,888,95,18,C.gold);
    text(g,`完美錯開 ${Number(d.perfect)||0} 次`,124,yy+61,42);
    text(g,`最高連擊 ${Number(d.combo)||0}`,96,yy+153,32);
    text(g,`速度 ×${Number(d.speed||1).toFixed(2)}`,984,yy+153,32,C.ink,'right');
    text(g,`個人最佳 ${Number(d.best||d.seconds).toFixed(1)} 秒`,96,yy+212,30,C.muted);
    if(d.rank)text(g,`個人最佳排名 #${d.rank} / ${d.total} 人`,96,yy+264,28,C.muted);
  } else {
    const im=await image(d.card);if(im){const width=888,height=width*im.height/im.width;g.drawImage(im,96,py+132,width,height);}

  }
  const footer=py+ph+82;
  text(g,d.kind==='challenge'?'你又撐到幾耐？':'到你考喇。',70,footer,story?63:52,C.gold);
  text(g,'whatifhk.com/umbrella-licence',70,footer+65,32,'#fff');
  text(g,'純屬虛構 · 分享你嘅成績，叫朋友一齊考',70,footer+112,22,'#ffffffa6');
  const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),'image/png'));
  return {blob,width:w,height:h};
}
let dialog,preview,status,save,native,threads,copy,formatButtons,current,format='story',asset,assetURL,seq=0,opener;
export function setupSharing() {
  dialog=document.getElementById('shareDialog');preview=document.getElementById('sharePreview');status=document.getElementById('shareStatus');save=document.getElementById('shareSave');native=document.getElementById('shareNative');threads=document.getElementById('shareThreads');copy=document.getElementById('shareCopy');formatButtons=[...dialog.querySelectorAll('[data-format]')];
  document.getElementById('shareClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{seq++;asset=null;if(assetURL)URL.revokeObjectURL(assetURL);assetURL=null;preview.removeAttribute('src');opener?.focus();});
  formatButtons.forEach(b=>b.onclick=()=>{format=b.dataset.format;refresh();});
  save.onclick=()=>{if(!asset)return;window.WhatIfVisitor?.track('share_image_saved',{mode:current.kind,format});status.textContent='圖片已開啟儲存；如果未下載，可以長按預覽圖儲存。去 Instagram 加張圖，再貼上文案／遊戲連結。';};
  native.onclick=async()=>{if(!asset)return;const file=new File([asset.blob],filenameFor(current,format),{type:'image/png'});if(!navigator.canShare?.({files:[file]})){status.textContent='呢個瀏覽器未支援分享圖片。請撳「儲存圖片」，再去 Instagram／Threads 上載。';return;}
    try{await navigator.share({files:[file]});status.textContent='已交畀分享選單；發佈前可以喺所選 App 編輯。';window.WhatIfVisitor?.track('share_sheet_completed',{mode:current.kind,format});}catch(e){status.textContent=e.name==='AbortError'?'已取消分享，你仍可以儲存圖片。':'分享選單暫時用唔到；請儲存圖片再上載。';}};
  copy.onclick=async()=>{const caption=captionFor(current)+'\n'+GAME_URL;try{await navigator.clipboard.writeText(caption);status.textContent='已複製文案同遊戲連結。';}catch{const field=document.getElementById('shareCaption');field.hidden=false;field.value=caption;field.focus();field.select();status.textContent='請長按／選取文字複製。';}};
  threads.onclick=()=>{window.WhatIfVisitor?.track('share_threads_opened',{mode:current.kind});status.textContent='Threads 會填好文字同連結；想加成績圖，請先儲存，再喺 Threads 附加圖片。';};
}
async function refresh() {
  const version=++seq;asset=null;save.removeAttribute('href');save.setAttribute('aria-disabled','true');native.disabled=true;status.textContent='整緊分享圖…';formatButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===format)));
  threads.href=threadsURL(current);document.getElementById('shareCaption').hidden=true;
  try{const result=await renderCard({...current},format);if(version!==seq||!dialog.open)return;if(assetURL)URL.revokeObjectURL(assetURL);asset=result;assetURL=URL.createObjectURL(result.blob);preview.src=assetURL;save.href=assetURL;save.download=filenameFor(current,format);save.removeAttribute('aria-disabled');native.disabled=false;status.textContent='Instagram：儲存圖片後上載，或用分享選單揀 Instagram（如有）。Threads：文字／連結已準備好，圖片要另外附加。';}
  catch{if(version!==seq)return;status.textContent='整圖暫時失敗，請重新揀格式再試。你仍可以複製文案或分享到 Threads。';}
}
export function openSharing(d) { current={...d};opener=document.activeElement;if(!dialog.open)dialog.showModal();refresh();window.WhatIfVisitor?.track('share_opened',{mode:d.kind}); }
export function updateChallengeRank(rank,total) { if(current?.kind!=='challenge'||!dialog?.open)return;current.rank=rank;current.total=total;refresh(); }
