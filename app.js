import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";
env.allowLocalModels=false; env.useBrowserCache=true;

const $=s=>document.querySelector(s);
const video=$("#video"),stage=$("#stage"),overlay=$("#captionOverlay"),timeline=$("#timeline");
const input=$("#videoInput"),status=$("#status"),auto=$("#autoCaption");
let file=null,url=null,captions=[],styleIndex=0,recognizer=null;

const styles=[
["Neon Glow","neon"],["All Abdal","white"],["CapCut Shadows","shadow"],["CapCut","neon"],["Clean Motion","white"],["Bubble Style","blue"],
["Horror Style","red"],["Editing Block","orange"],["Mr Beast Style","white"],["Mr Beast Style 2","yellow"],["Iman Gadzhi","wide"],["Devil Jatho","purple"],
["Highlighted Word","yellow"],["Clean Glow Style","cinema"],["CapCut Clean","white"],["Black Punch","black"],["CapCut Words","blue"],["Pixelated Words","outline"],
["Liquid Glass","glass"],["Yashbh","italic"],["Design Glow","pink"],["Seccha Sandha","block"],["Thora Cinematic","cinema"],["Delhi","white"],
["Illusion","shadow"],["Editor Masala","yellow"],["Aura","neon"],["Swass","focus"],["Big Powers","big"],["The Big Head","second"],
["Scribble","scribble"],["Archives","italic"],["Blockbuster","red"],["Focus Deeply","focus"],["Hello","yellow"],["Second","second"]
];

function sample(i){return["THE QUICK","BROWN FOX","JUMPS OVER","QUICK BROWN","BROWN FOX","THE PROCESS","HELLO GUYS","SECOND","FOCUS","BIG WORDS"][i%10]}
function renderStyles(){
 $("#stylesGrid").innerHTML=styles.map((s,i)=>`<button class="style-card ${s[1]} ${i===styleIndex?"selected":""}" data-i="${i}"><span>${sample(i)}</span><small class="style-name">${s[0]}</small></button>`).join("");
 document.querySelectorAll(".style-card").forEach(b=>b.onclick=()=>{styleIndex=+b.dataset.i;renderStyles();applyStyle()});
}
function applyStyle(){overlay.className="";overlay.classList.add(styles[styleIndex][1]);overlay.style.textShadow=(styles[styleIndex][1]==="neon"||styles[styleIndex][1]==="pink")?"0 0 14px currentColor,0 3px 10px #000":"0 3px 10px #000"}
renderStyles();applyStyle();

function fmt(t){if(!isFinite(t))return"00:00";return String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0")}
function load(f){if(!f)return;if(!f.type.startsWith("video/"))return alert("Please choose a video file.");file=f;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);video.src=url;video.load();$("#dropHint").style.display="none";captions=[];renderTimeline();status.textContent="Video loaded — tap Generate Auto Captions."}
input.onchange=e=>load(e.target.files[0]);$("#chooseBtn").onclick=()=>input.click();
stage.addEventListener("dragover",e=>e.preventDefault());stage.addEventListener("drop",e=>{e.preventDefault();load(e.dataTransfer.files[0])});
video.onloadedmetadata=()=>{$("#seek").max=video.duration;$("#time").textContent=`00:00 / ${fmt(video.duration)}`};
video.ontimeupdate=()=>{
 $("#seek").value=video.currentTime;$("#time").textContent=`${fmt(video.currentTime)} / ${fmt(video.duration)}`;
 const i=captions.findIndex(c=>video.currentTime>=c.start&&video.currentTime<c.end);
 overlay.textContent=i>=0?captions[i].text:"";
 document.querySelectorAll(".clip").forEach((x,j)=>x.classList.toggle("active",j===i));
};
$("#seek").oninput=e=>video.currentTime=+e.target.value;
$("#play").onclick=()=>{if(video.paused){video.play();$("#play").textContent="Ⅱ"}else{video.pause();$("#play").textContent="▶"}};
$("#back").onclick=()=>video.currentTime=Math.max(0,video.currentTime-3);
$("#forward").onclick=()=>video.currentTime=Math.min(video.duration||0,video.currentTime+3);

function renderTimeline(){
 if(!captions.length){timeline.innerHTML='<div class="empty">Generated caption blocks appear here.</div>';return}
 timeline.innerHTML=captions.map((c,i)=>`<div class="clip" data-i="${i}">${esc(c.text)}<small>${fmt(c.start)} – ${fmt(c.end)}</small></div>`).join("");
 timeline.querySelectorAll(".clip").forEach(x=>x.onclick=()=>video.currentTime=captions[+x.dataset.i].start);
}
function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function audioTo16k(file){
 const ctx=new AudioContext();const buf=await ctx.decodeAudioData(await file.arrayBuffer());
 const len=Math.ceil(buf.duration*16000),off=new OfflineAudioContext(1,len,16000);
 const src=off.createBufferSource();src.buffer=buf;src.connect(off.destination);src.start();
 const rendered=await off.startRendering();await ctx.close();return rendered.getChannelData(0);
}
function showProgress(title,text){$("#progress").classList.remove("hidden");$("#progressTitle").textContent=title;$("#progressText").textContent=text;$("#progressBar").style.width="5%"}
function hideProgress(){$("#progress").classList.add("hidden")}

/* Critical fix:
   Whisper can return sentence/segment timestamps containing lots of words.
   We now split EVERY returned segment into short 2–5 word caption blocks,
   proportionally across that segment's duration. This prevents giant repeated
   timeline cards and produces CapCut-like readable captions. */
function splitSegment(seg){
 const text=(seg.text||"").trim().replace(/\s+/g," ");
 if(!text)return[];
 const words=text.split(" ");
 const maxWords=Math.max(2,Math.min(5,Number($("#words").value)||5));
 const groups=[];
 for(let i=0;i<words.length;i+=maxWords)groups.push(words.slice(i,i+maxWords).join(" "));
 let a=Number(seg.start)||0,b=Number(seg.end);
 if(!isFinite(b)||b<=a)b=a+Math.max(.8,groups.length*.65);
 const step=(b-a)/groups.length;
 return groups.map((g,i)=>({start:a+i*step,end:i===groups.length-1?b:a+(i+1)*step,text:g.toUpperCase()}));
}
function normalizeChunks(chunks,total){
 const out=[];
 for(const c of chunks||[])out.push(...splitSegment({text:c.text,start:c.timestamp?.[0],end:c.timestamp?.[1]}));
 // Remove overlaps and micro-gaps while preserving speech timing.
 for(let i=0;i<out.length;i++){
   out[i].start=Math.max(0,Math.min(total,out[i].start));
   out[i].end=Math.max(out[i].start+0.25,Math.min(total,out[i].end));
   if(i&&out[i].start<out[i-1].end)out[i].start=out[i-1].end;
 }
 return out.filter(c=>c.end>c.start);
}
async function getRecognizer(){
 if(recognizer)return recognizer;
 showProgress("Loading free Whisper AI…","First run downloads the speech model and caches it.");
 recognizer=await pipeline("automatic-speech-recognition","Xenova/whisper-tiny",{device:"wasm",progress_callback:p=>{if(typeof p.progress==="number")$("#progressBar").style.width=Math.max(5,Math.min(100,p.progress))+"%"}});
 return recognizer;
}
auto.onclick=async()=>{
 if(!file)return alert("Upload a video first.");
 auto.disabled=true;auto.textContent="⏳ Transcribing…";
 try{
  status.textContent="Extracting audio…";const audio=await audioTo16k(file);
  const model=await getRecognizer();status.textContent="Whisper is transcribing…";
  $("#progressTitle").textContent="Transcribing your video…";$("#progressBar").style.width="60%";
  const lang=$("#language").value,args={chunk_length_s:30,stride_length_s:5,return_timestamps:true};
  if(lang!=="auto")args.language=lang;
  const out=await model(audio,args);
  captions=normalizeChunks(out.chunks||[],video.duration);
  if(!captions.length){
    const text=(out.text||"").trim().replace(/\s+/g," ");
    const ws=text.split(" ").filter(Boolean),n=Math.max(2,Math.min(5,Number($("#words").value)||5));
    const groups=[];for(let i=0;i<ws.length;i+=n)groups.push(ws.slice(i,i+n).join(" "));
    const step=video.duration/Math.max(1,groups.length);
    captions=groups.map((t,i)=>({start:i*step,end:i===groups.length-1?video.duration:(i+1)*step,text:t.toUpperCase()}));
  }
  renderTimeline();applyStyle();status.textContent=`Done — ${captions.length} short caption blocks generated.`;
 }catch(e){console.error(e);status.textContent="Auto caption failed.";alert("Auto caption failed: "+(e?.message||e))}
 finally{hideProgress();auto.disabled=false;auto.textContent="✨ Generate Auto Captions"}
};
$("#clearCaptions").onclick=()=>{captions=[];overlay.textContent="";renderTimeline();status.textContent="Captions cleared."};
document.querySelectorAll(".ratios button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".ratios button").forEach(x=>x.classList.remove("active"));b.classList.add("active");stage.style.aspectRatio=b.dataset.ratio});

$("#exportBtn").onclick=async()=>{
 if(!file||!captions.length)return alert("Upload a video and generate captions first.");
 $("#exportBtn").disabled=true;status.textContent="Rendering captioned video…";
 const canvas=$("#renderCanvas"),ctx=canvas.getContext("2d"),[rw,rh]=($("#quality").value==="1080p"?[1080,1920]:[720,1280]);
 canvas.width=rw;canvas.height=rh;canvas.style.display="block";video.style.visibility="hidden";overlay.style.display="none";
 try{
  const stream=canvas.captureStream(30),ac=new AudioContext(),source=ac.createMediaElementSource(video),dest=ac.createMediaStreamDestination();
  source.connect(dest);source.connect(ac.destination);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const rec=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9,opus"}),parts=[];rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
  const draw=()=>{ctx.fillStyle="#000";ctx.fillRect(0,0,rw,rh);ctx.drawImage(video,0,0,rw,rh);const i=captions.findIndex(x=>video.currentTime>=x.start&&video.currentTime<x.end);if(i>=0){ctx.textAlign="center";ctx.font="900 72px Arial";ctx.lineWidth=16;ctx.strokeStyle="#000";ctx.strokeText(captions[i].text,rw/2,rh*.84);ctx.fillStyle="#fff";ctx.fillText(captions[i].text,rw/2,rh*.84)}if(!video.paused&&!video.ended)requestAnimationFrame(draw)};
  rec.start(500);await video.play();draw();await new Promise(r=>{const q=()=>video.ended?r():setTimeout(q,250);q()});rec.stop();await new Promise(r=>rec.onstop=r);video.pause();video.currentTime=0;
  const blob=new Blob(parts,{type:"video/webm"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="captionx-final.webm";a.click();status.textContent="Export complete.";
  source.disconnect();await ac.close();
 }catch(e){console.error(e);alert("Export failed: "+e.message)}
 canvas.style.display="none";video.style.visibility="visible";overlay.style.display="block";$("#exportBtn").disabled=false;
};
   
