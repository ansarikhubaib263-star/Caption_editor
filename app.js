import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const $=s=>document.querySelector(s);
const video=$("#video"), stage=$("#stage"), overlay=$("#captionOverlay"), timeline=$("#timeline");
const input=$("#videoInput"), status=$("#status"), auto=$("#autoCaption");
let file=null, url=null, captions=[], styleIndex=0, ratio="9/16", recognizer=null;

const styles=[
["Neon Glow","neon"],["All Abdal","white"],["CapCut Shadows","shadow"],["CapCut","neon"],["Clean Motion","white"],["Bubble Style","blue"],
["Horror Style","red"],["Editing Block","orange"],["Mr Beast Style","white"],["Mr Beast Style 2","yellow"],["Iman Gadzhi","wide"],["Devil Jatho","purple"],
["Highlighted Word","yellow"],["Clean Glow Style","cinema"],["CapCut Clean","white"],["Black Punch","black"],["CapCut Words","blue"],["Pixelated Words","outline"],
["Liquid Glass","glass"],["Yashbh","italic"],["Design Glow","pink"],["Seccha Sandha","block"],["Thora Cinematic","cinema"],["Delhi","white"],
["Illusion","shadow"],["Editor Masala","yellow"],["Aura","neon"],["Swass","focus"],["Big Powers","big"],["The Big Head","second"],
["Scribble","scribble"],["Archives","italic"],["Blockbuster","red"],["Focus Deeply","focus"],["Hello","yellow"],["Second","second"]
];

function renderStyles(){
 $("#stylesGrid").innerHTML=styles.map((s,i)=>`<button class="style-card ${s[1]} ${i===styleIndex?"selected":""}" data-i="${i}"><span>${sample(i)}</span><small class="style-name">${s[0]}</small></button>`).join("");
 document.querySelectorAll(".style-card").forEach(b=>b.onclick=()=>{styleIndex=+b.dataset.i;renderStyles();applyStyle()});
}
function sample(i){return ["THE QUICK","BROWN FOX","JUMPS OVER","QUICK BROWN","BROWN FOX","THE PROCESS","HELLO GUYS","SECOND","FOCUS","BIG WORDS"][i%10]}
renderStyles();

function fmt(t){if(!isFinite(t))return"00:00";return String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0")}
function applyStyle(){
 overlay.className=""; overlay.classList.add(styles[styleIndex][1]);
 const s=styles[styleIndex][1];
 overlay.style.textShadow=s==="neon"||s==="pink"?"0 0 14px currentColor,0 3px 10px #000":"0 3px 10px #000";
}
applyStyle();

function load(f){
 if(!f)return;
 if(!f.type.startsWith("video/"))return alert("Please choose a video file.");
 file=f;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);video.src=url;video.load();
 $("#dropHint").style.display="none";captions=[];renderTimeline();status.textContent="Video loaded — tap Generate Auto Captions.";
}
input.onchange=e=>load(e.target.files[0]);$("#chooseBtn").onclick=()=>input.click();
stage.addEventListener("dragover",e=>e.preventDefault());stage.addEventListener("drop",e=>{e.preventDefault();load(e.dataTransfer.files[0])});

video.onloadedmetadata=()=>{$("#seek").max=video.duration;$("#time").textContent=`00:00 / ${fmt(video.duration)}`};
video.ontimeupdate=()=>{
 $("#seek").value=video.currentTime;$("#time").textContent=`${fmt(video.currentTime)} / ${fmt(video.duration)}`;
 let i=captions.findIndex(c=>video.currentTime>=c.start&&video.currentTime<c.end);
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
function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]) )}

// Decode the video's audio directly in the browser. No paid API and no backend required.
async function audioTo16k(file){
 const ctx=new AudioContext();
 const buf=await ctx.decodeAudioData(await file.arrayBuffer());
 const len=Math.ceil(buf.duration*16000);
 const off=new OfflineAudioContext(1,len,16000);
 const src=off.createBufferSource();src.buffer=buf;src.connect(off.destination);src.start();
 const rendered=await off.startRendering();await ctx.close();
 return rendered.getChannelData(0);
}

function groupWords(text,duration){
 const words=(text||"").trim().split(/\s+/).filter(Boolean), n=Number($("#words").value)||5;
 if(!words.length)return[];
 const groups=[];for(let i=0;i<words.length;i+=n)groups.push(words.slice(i,i+n).join(" "));
 const step=duration/groups.length;
 return groups.map((t,i)=>({start:i*step,end:i===groups.length-1?duration:(i+1)*step,text:t.toUpperCase()}));
}

function showProgress(title,text){$("#progress").classList.remove("hidden");$("#progressTitle").textContent=title;$("#progressText").textContent=text;$("#progressBar").style.width="15%"}
function hideProgress(){$("#progress").classList.add("hidden")}

async function getRecognizer(){
 if(recognizer)return recognizer;
 showProgress("Loading free Whisper AI…","First use downloads a small speech-recognition model. It is cached in this browser.");
 recognizer=await pipeline("automatic-speech-recognition","Xenova/whisper-tiny",{device:"wasm",progress_callback:p=>{
   if(typeof p.progress==="number")$("#progressBar").style.width=Math.max(5,Math.min(100,p.progress))+"%";
 }});
 return recognizer;
}

auto.onclick=async()=>{
 if(!file)return alert("Upload a video first.");
 auto.disabled=true;auto.textContent="⏳ Transcribing…";status.textContent="Extracting audio…";
 try{
   const audio=await audioTo16k(file);
   const model=await getRecognizer();
   status.textContent="Whisper is transcribing the audio…";
   $("#progressTitle").textContent="Transcribing your video…";$("#progressText").textContent="Keep this tab open until transcription finishes.";$("#progressBar").style.width="60%";
   const lang=$("#language").value;
   const args={chunk_length_s:30,stride_length_s:5,return_timestamps:true};
   if(lang!=="auto")args.language=lang;
   const out=await model(audio,args);
   const chunks=(out.chunks||[]).filter(x=>x.text&&x.text.trim());
   if(chunks.length){
     captions=chunks.map(x=>({start:Number(x.timestamp?.[0]||0),end:Number(x.timestamp?.[1]||0),text:x.text.trim().toUpperCase()}));
     // If Whisper returns coarse/zero timestamps, make a clean evenly-spaced fallback.
     if(captions.some(c=>c.end<=c.start))captions=groupWords(out.text||"",video.duration);
   }else captions=groupWords(out.text||"",video.duration);
   renderTimeline();applyStyle();status.textContent=`Done — ${captions.length} caption blocks generated.`;
 }catch(err){
   console.error(err);status.textContent="Auto caption failed.";
   alert("Auto caption could not run in this browser. Try Chrome/Edge with a modern device and a supported video file. Details: "+(err?.message||err));
 }finally{hideProgress();auto.disabled=false;auto.textContent="✨ Generate Auto Captions";}
};

$("#clearCaptions").onclick=()=>{captions=[];overlay.textContent="";renderTimeline();status.textContent="Captions cleared."};

document.querySelectorAll(".ratios button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".ratios button").forEach(x=>x.classList.remove("active"));b.classList.add("active");ratio=b.dataset.ratio;stage.style.aspectRatio=ratio});

$("#exportBtn").onclick=async()=>{
 if(!file||!captions.length)return alert("Upload a video and generate captions first.");
 // Browser-native recording: burns the selected caption style into a WebM file.
 status.textContent="Rendering captioned video…";$("#exportBtn").disabled=true;
 try{
   const c=$("#renderCanvas"), ctx=c.getContext("2d");const w=720,h=Math.round(720/(eval(ratio)));
   c.width=w;c.height=h;c.style.display="block";video.style.visibility="hidden";overlay.style.display="none";
   const stream=c.captureStream(30);const audioCtx=new AudioContext();const source=audioCtx.createMediaElementSource(video);const dest=audioCtx.createMediaStreamDestination();source.connect(dest);source.connect(audioCtx.destination);
   dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
   const rec=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9,opus"});const parts=[];rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
   const draw=()=>{ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);ctx.drawImage(video,0,0,w,h);let i=captions.findIndex(x=>video.currentTime>=x.start&&video.currentTime<x.end);if(i>=0){ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 44px Arial";ctx.lineWidth=10;ctx.strokeStyle="#000";ctx.strokeText(captions[i].text,w/2,h*.84);ctx.fillStyle=getComputedStyle(overlay).color||"#fff";ctx.fillText(captions[i].text,w/2,h*.84)}if(!video.paused&&!video.ended)requestAnimationFrame(draw)};
   await video.play();rec.start(1000);draw();await new Promise(resolve=>{const check=()=>video.ended?resolve():setTimeout(check,250);check()});rec.stop();await new Promise(r=>rec.onstop=r);video.pause();video.currentTime=0;
   const blob=new Blob(parts,{type:"video/webm"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="captionx-captioned.webm";a.click();status.textContent="Export complete (.webm).";
   c.style.display="none";video.style.visibility="visible";overlay.style.display="block";source.disconnect();await audioCtx.close();
 }catch(e){console.error(e);alert("Export failed: "+e.message);$("#renderCanvas").style.display="none";video.style.visibility="visible";overlay.style.display="block"}
 $("#exportBtn").disabled=false;
};
