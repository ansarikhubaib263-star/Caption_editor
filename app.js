import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";
env.allowLocalModels=false;env.useBrowserCache=true;
const $=s=>document.querySelector(s),video=$("#video"),stage=$("#stage"),overlay=$("#captionOverlay"),timeline=$("#timeline");
const input=$("#videoInput"),status=$("#status"),auto=$("#autoCaption");let file=null,url=null,captions=[],styleIndex=0,recognizer=null;
const fonts={Inter:"Arial, sans-serif",Impact:"Impact, Arial Black, sans-serif",Georgia:"Georgia, serif","Arial Black":"Arial Black, Arial, sans-serif","Comic":"Comic Sans MS, cursive","Condensed":"Arial Narrow, Arial, sans-serif","Mono":"monospace"};
const anims={Pop:"anim-pop",Bounce:"anim-bounce","Slide Up":"anim-slideup","Slide Left":"anim-slideleft",Zoom:"anim-zoom",Shake:"anim-shake","Glow Pulse":"anim-glow","Word Pop":"anim-word"};
const effects={None:"effect-none",Neon:"effect-neon",Glow:"effect-glow",Shadow:"effect-shadow",Outline:"effect-outline",Stroke:"effect-stroke",Glitch:"effect-glitch"};
const styles=[
["Neon Glow","neon","Inter","Glow Pulse","Neon"],["All Abdal","white","Inter","Pop","Shadow"],["CapCut Shadows","shadow","Arial Black","Pop","Shadow"],
["CapCut","neon","Arial Black","Pop","Glow"],["Clean Motion","white","Inter","Slide Up","Shadow"],["Bubble Style","blue","Comic","Bounce","Glow"],
["Horror Style","red","Impact","Shake","Shadow"],["Editing Block","orange","Arial Black","Pop","Stroke"],["Mr Beast Style","white","Arial Black","Pop","Stroke"],
["Mr Beast Style 2","yellow","Arial Black","Bounce","Shadow"],["Iman Gadzhi","wide","Inter","Fade","Shadow"],["Devil Jatho","purple","Inter","Pop","Glow"],
["Highlighted Word","yellow","Inter","Word Pop","Shadow"],["Clean Glow Style","cinema","Georgia","Glow Pulse","Glow"],["CapCut Clean","white","Inter","Slide Up","None"],
["Black Punch","black","Arial Black","Pop","None"],["CapCut Words","blue","Inter","Word Pop","Shadow"],["Pixelated Words","outline","Arial Black","Glitch","Outline"],
["Liquid Glass","glass","Inter","Bounce","Glow"],["Yashbh","italic","Georgia","Slide Left","Shadow"],["Design Glow","pink","Arial Black","Glow Pulse","Glitch"],
["Seccha Sandha","block","Arial Black","Pop","Stroke"],["Thora Cinematic","cinema","Georgia","Slide Up","Shadow"],["Delhi","white","Inter","Pop","Shadow"],
["Illusion","shadow","Inter","Zoom","Shadow"],["Editor Masala","yellow","Impact","Pop","Glow"],["Aura","neon","Georgia","Glow Pulse","Glow"],
["Swass","focus","Arial Black","Zoom","Stroke"],["Big Powers","big","Arial Black","Pop","Shadow"],["The Big Head","second","Georgia","Slide Up","Shadow"],
["Scribble","scribble","Comic","Bounce","None"],["Archives","italic","Georgia","Slide Left","Shadow"],["Blockbuster","red","Impact","Zoom","Stroke"],
["Focus Deeply","focus","Arial Black","Word Pop","Shadow"],["Hello","yellow","Impact","Bounce","Glow"],["Second","second","Georgia","Slide Up","Stroke"],
["Fire Caption","redbox","Arial Black","Pop","Glow"],["Green Beast","green","Arial Black","Bounce","Glow"],["Gold Cinema","gold","Georgia","Slide Up","Glow"],
["Minimal","minimal","Inter","Fade","None"],["Comic Pop","comic","Comic","Bounce","None"],["Thin Clean","thin","Inter","Fade","None"],
["Condensed","condensed","Condensed","Pop","Stroke"],["Mono Type","white","Mono","Slide Left","Glow"],["Red Alert","red","Impact","Shake","Glitch"],
["White Outline","outline","Arial Black","Pop","Outline"],["Neon Pink","pink","Arial Black","Glow Pulse","Neon"],["Ice Blue","blue","Inter","Slide Up","Glow"],
["Royal Purple","purple","Georgia","Zoom","Glow"],["Hard Punch","black","Impact","Pop","Outline"]
];
function fillSelect(id,obj){$(id).innerHTML=Object.keys(obj).map(k=>`<option>${k}</option>`).join("")}
fillSelect("#fontSelect",fonts);fillSelect("#animationSelect",anims);fillSelect("#effectSelect",effects);
function sample(i){return["THE QUICK","BROWN FOX","JUMPS OVER","QUICK BROWN","BROWN FOX","THE PROCESS","HELLO GUYS","SECOND","FOCUS","BIG WORDS"][i%10]}
function renderStyles(){$("#stylesGrid").innerHTML=styles.map((s,i)=>`<button class="style-card ${s[1]} ${i===styleIndex?"selected":""}" data-i="${i}"><span>${sample(i)}</span><small class="style-name">${s[0]}</small></button>`).join("");document.querySelectorAll(".style-card").forEach(b=>b.onclick=()=>{styleIndex=+b.dataset.i;applyPreset();renderStyles()})}
function applyPreset(){const s=styles[styleIndex];$("#fontSelect").value=s[2];$("#animationSelect").value=s[3];$("#effectSelect").value=s[4];applyStyle()}
function applyStyle(){overlay.className="pos-"+$("#positionSelect").value+" "+anims[$("#animationSelect").value]+" "+effects[$("#effectSelect").value];overlay.style.fontFamily=fonts[$("#fontSelect").value];overlay.style.animationName=anims[$("#animationSelect").value].replace("anim-","");overlay.style.animationIterationCount="1";overlay.style.color=getComputedStyle(document.querySelector(".style-card.selected")||document.body).color||"#fff"}
renderStyles();applyPreset();
["fontSelect","animationSelect","effectSelect","positionSelect"].forEach(id=>$("#"+id).onchange=applyStyle);

function fmt(t){if(!isFinite(t))return"00:00";return String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0")}
function load(f){if(!f)return;if(!f.type.startsWith("video/"))return alert("Please choose a video file.");file=f;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);video.src=url;video.load();$("#dropHint").style.display="none";captions=[];renderTimeline();status.textContent="Video loaded — tap Generate Auto Captions."}
input.onchange=e=>load(e.target.files[0]);$("#chooseBtn").onclick=()=>input.click();stage.addEventListener("dragover",e=>e.preventDefault());stage.addEventListener("drop",e=>{e.preventDefault();load(e.dataTransfer.files[0])});
video.onloadedmetadata=()=>{$("#seek").max=video.duration;$("#time").textContent=`00:00 / ${fmt(video.duration)}`};
video.ontimeupdate=()=>{$("#seek").value=video.currentTime;$("#time").textContent=`${fmt(video.currentTime)} / ${fmt(video.duration)}`;const i=captions.findIndex(c=>video.currentTime>=c.start&&video.currentTime<c.end);overlay.textContent=i>=0?captions[i].text:"";document.querySelectorAll(".clip").forEach((x,j)=>x.classList.toggle("active",j===i));if(i>=0){overlay.classList.remove("anim-pop","anim-bounce","anim-slideup","anim-slideleft","anim-zoom","anim-shake","anim-glow","anim-word");void overlay.offsetWidth;overlay.classList.add(anims[$("#animationSelect").value])}};
$("#seek").oninput=e=>video.currentTime=+e.target.value;$("#play").onclick=()=>{if(video.paused){video.play();$("#play").textContent="Ⅱ"}else{video.pause();$("#play").textContent="▶"}};$("#back").onclick=()=>video.currentTime=Math.max(0,video.currentTime-3);$("#forward").onclick=()=>video.currentTime=Math.min(video.duration||0,video.currentTime+3);
function renderTimeline(){if(!captions.length){timeline.innerHTML='<div class="empty">Generated caption blocks appear here.</div>';return}timeline.innerHTML=captions.map((c,i)=>`<div class="clip" data-i="${i}">${esc(c.text)}<small>${fmt(c.start)} – ${fmt(c.end)}</small></div>`).join("");timeline.querySelectorAll(".clip").forEach(x=>x.onclick=()=>video.currentTime=captions[+x.dataset.i].start)}
function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function audioTo16k(f){const ctx=new AudioContext(),buf=await ctx.decodeAudioData(await f.arrayBuffer()),len=Math.ceil(buf.duration*16000),off=new OfflineAudioContext(1,len,16000),src=off.createBufferSource();src.buffer=buf;src.connect(off.destination);src.start();const r=await off.startRendering();await ctx.close();return r.getChannelData(0)}
function showProgress(t,x){$("#progress").classList.remove("hidden");$("#progressTitle").textContent=t;$("#progressText").textContent=x;$("#progressBar").style.width="5%"}function hideProgress(){$("#progress").classList.add("hidden")}
function splitSeg(s){const text=(s.text||"").trim().replace(/\s+/g," ");if(!text)return[];const ws=text.split(" "),n=Math.max(2,Math.min(5,+$("#words").value||5)),groups=[];for(let i=0;i<ws.length;i+=n)groups.push(ws.slice(i,i+n).join(" "));let a=+s.start||0,b=+s.end;if(!isFinite(b)||b<=a)b=a+groups.length*.7;const d=(b-a)/groups.length;return groups.map((g,i)=>({start:a+i*d,end:i===groups.length-1?b:a+(i+1)*d,text:g.toUpperCase()}))}
function normalize(chunks,total){let out=[];for(const c of chunks||[])out.push(...splitSeg({text:c.text,start:c.timestamp?.[0],end:c.timestamp?.[1]}));for(let i=0;i<out.length;i++){out[i].start=Math.max(0,Math.min(total,out[i].start));out[i].end=Math.max(out[i].start+.25,Math.min(total,out[i].end));if(i&&out[i].start<out[i-1].end)out[i].start=out[i-1].end}return out.filter(c=>c.end>c.start)}
async function getModel(){if(recognizer)return recognizer;showProgress("Loading free Whisper AI…","First run downloads the model and caches it.");recognizer=await pipeline("automatic-speech-recognition","Xenova/whisper-tiny",{device:"wasm",progress_callback:p=>{if(typeof p.progress==="number")$("#progressBar").style.width=Math.max(5,Math.min(100,p.progress))+"%"}});return recognizer}
auto.onclick=async()=>{if(!file)return alert("Upload a video first.");auto.disabled=true;auto.textContent="⏳ Transcribing…";try{status.textContent="Extracting audio…";const audio=await audioTo16k(file),model=await getModel();status.textContent="Whisper is transcribing…";$("#progressTitle").textContent="Transcribing your video…";$("#progressBar").style.width="60%";const args={chunk_length_s:30,stride_length_s:5,return_timestamps:true},lang=$("#language").value;if(lang!=="auto")args.language=lang;const out=await model(audio,args);captions=normalize(out.chunks||[],video.duration);if(!captions.length){const t=(out.text||"").trim(),ws=t.split(/\s+/),n=Math.max(2,Math.min(5,+$("#words").value||5)),groups=[];for(let i=0;i<ws.length;i+=n)groups.push(ws.slice(i,i+n).join(" "));const d=video.duration/Math.max(1,groups.length);captions=groups.map((x,i)=>({start:i*d,end:i===groups.length-1?video.duration:(i+1)*d,text:x.toUpperCase()}))}renderTimeline();status.textContent=`Done — ${captions.length} caption blocks generated.`}catch(e){console.error(e);status.textContent="Auto caption failed.";alert("Auto caption failed: "+(e?.message||e))}finally{hideProgress();auto.disabled=false;auto.textContent="✨ Generate Auto Captions"}};
$("#clearCaptions").onclick=()=>{captions=[];overlay.textContent="";renderTimeline();status.textContent="Captions cleared."};
document.querySelectorAll(".ratios button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".ratios button").forEach(x=>x.classList.remove("active"));b.classList.add("active");stage.style.aspectRatio=b.dataset.ratio});

$("#exportBtn").onclick=async()=>{
  if(!file||!captions.length)return alert("Upload a video and generate captions first.");

  const btn=$("#exportBtn");
  btn.disabled=true;
  status.textContent="Preparing export…";

  const canvas=$("#renderCanvas");
  const ctx=canvas.getContext("2d",{alpha:false});
  const [w,h]=$("#quality").value==="1080p"?[1080,1920]:[720,1280];
  canvas.width=w; canvas.height=h;

  // Pick a codec supported by this browser instead of assuming VP9.
  const mimeCandidates=[
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  const mime=mimeCandidates.find(x=>window.MediaRecorder && MediaRecorder.isTypeSupported(x));
  if(!mime){
    btn.disabled=false;
    return alert("Is browser me video export codec supported nahi hai. Chrome/Edge ka latest version try karo.");
  }

  canvas.style.display="block";
  video.style.visibility="hidden";
  overlay.style.display="none";

  let audioCtx=null, source=null, recorder=null, raf=0;
  try{
    // Reset playback before recording.
    video.pause();
    video.currentTime=0;
    await new Promise(resolve=>{
      if(video.readyState>=2) resolve();
      else video.addEventListener("loadeddata",resolve,{once:true});
    });

    const canvasStream=canvas.captureStream(30);

    // Capture video audio when the browser allows it.
    let finalStream=canvasStream;
    try{
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      source=audioCtx.createMediaElementSource(video);
      const destination=audioCtx.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioCtx.destination);
      const tracks=destination.stream.getAudioTracks();
      if(tracks.length){
        finalStream=new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...tracks
        ]);
      }
      if(audioCtx.state==="suspended") await audioCtx.resume();
    }catch(audioErr){
      console.warn("Audio capture unavailable; exporting video-only.",audioErr);
      finalStream=canvasStream;
    }

    const parts=[];
    recorder=new MediaRecorder(finalStream,{mimeType:mime,videoBitsPerSecond:8000000});
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};

    const drawFrame=()=>{
      ctx.fillStyle="#000";
      ctx.fillRect(0,0,w,h);

      // Cover-fit the source video while preserving aspect ratio.
      const vw=video.videoWidth||w, vh=video.videoHeight||h;
      const scale=Math.max(w/vw,h/vh);
      const dw=vw*scale, dh=vh*scale;
      ctx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh);

      const i=captions.findIndex(c=>video.currentTime>=c.start&&video.currentTime<c.end);
      if(i>=0){
        const text=captions[i].text;
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.font=`900 ${Math.round(w*.065)}px ${fonts[$("#fontSelect").value]||"Arial"}`;

        let y=h*(
          $("#positionSelect").value==="top"?0.20:
          $("#positionSelect").value==="middle"?0.52:0.84
        );

        const eff=$("#effectSelect").value;
        ctx.lineWidth=Math.max(4,Math.round(w*.012));

        if(eff==="Neon"||eff==="Glow"){
          ctx.shadowColor=eff==="Neon"?"#d7ff34":"#ffffff";
          ctx.shadowBlur=24;
        }else{
          ctx.shadowColor="transparent";
          ctx.shadowBlur=0;
        }

        if(eff==="Glitch"){
          ctx.fillStyle="#00eaff";
          ctx.fillText(text,w/2-6,y);
          ctx.fillStyle="#ff1744";
          ctx.fillText(text,w/2+6,y);
        }

        ctx.strokeStyle="#000";
        ctx.strokeText(text,w/2,y);
        ctx.fillStyle="#fff";
        ctx.fillText(text,w/2,y);
        ctx.shadowBlur=0;
      }

      if(!video.paused&&!video.ended) raf=requestAnimationFrame(drawFrame);
    };

    recorder.start(250);
    await video.play();
    drawFrame();

    await new Promise(resolve=>{
      const check=()=>{
        if(video.ended){resolve();return}
        setTimeout(check,150);
      };
      check();
    });

    if(recorder.state!=="inactive") recorder.stop();
    await new Promise(resolve=>recorder.addEventListener("stop",resolve,{once:true}));

    const blob=new Blob(parts,{type:mime});
    if(!blob.size) throw new Error("Export produced an empty video.");

    const downloadUrl=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=downloadUrl;
    a.download="CaptionX-Export.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>URL.revokeObjectURL(downloadUrl),30000);
    status.textContent="✅ Export complete — video saved.";
  }catch(e){
    console.error("Export error:",e);
    alert("Export failed: "+(e?.message||e));
    status.textContent="Export failed.";
  }finally{
    cancelAnimationFrame(raf);
    try{if(source)source.disconnect()}catch{}
    try{if(audioCtx)await audioCtx.close()}catch{}
    video.pause();
    video.currentTime=0;
    canvas.style.display="none";
    video.style.visibility="visible";
    overlay.style.display="block";
    btn.disabled=false;
  }
};

