import {
  pipeline,
  env
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = id => document.getElementById(id);

const videoInput = $("videoInput");
const video = $("video");
const overlay = $("captionOverlay");
const track = $("captionsTrack");
const seek = $("seek");

const status = $("status");
const generateBtn = $("generateCaptions");
const stylesGrid = $("stylesGrid");

const progressBar = $("progressBar");
const progressText = $("progressText");

const wordsRange = $("wordsPerCaption");
const wordCount = $("wordCount");
const fontSize = $("fontSize");
const fontSizeValue = $("fontSizeValue");
const position = $("captionPosition");

let captions = [];
let currentCue = -1;
let model = null;
let selected = null;

const presets = [
  ["Neon Glow", "#d7ff34", "glow"],
  ["Clean Pop", "#ffffff", "pop"],
  ["Orange Bounce", "#ff8a00", "bounce"],
  ["Purple Slide", "#b46cff", "slide"],
  ["Ice Blue", "#63dcff", "pop"],
  ["Red Impact", "#ff4b4b", "bounce"],
  ["Gold", "#ffd24d", "zoom"],
  ["Green Punch", "#4dff9a", "bounce"],
  ["Electric Neon", "#37f5ff", "neon"],
  ["Hot Pink", "#ff4fba", "glow"],
  ["Karaoke Gold", "#ffd24d", "glow"],
  ["Typewriter", "#ffffff", "type"],
  ["Glitch", "#ffffff", "glitch"],
  ["Zoom Impact", "#ffffff", "zoom"],
  ["White Bold", "#ffffff", "pop"],
  ["Cinematic", "#ffffff", "glow"],
  ["Blue Glow", "#58a6ff", "glow"],
  ["Violet Neon", "#c77dff", "neon"],
  ["Lime Punch", "#b7ff00", "bounce"],
  ["Fire", "#ff6b35", "pop"],
  ["Sky Pop", "#70d6ff", "pop"],
  ["Rose Glow", "#ff8fab", "glow"],
  ["Mono Minimal", "#ffffff", "pop"],
  ["Cyber", "#a8ffea", "glitch"],
  ["Dream", "#d9b3ff", "slide"],
  ["Sunset", "#ff9f1c", "bounce"],
  ["Ice", "#bde0fe", "zoom"],
  ["Loud Lyrics", "#ffffff", "bounce"],
  ["Soft Subtitle", "#ffffff", "pop"],
  ["Electric Purple", "#8b5cf6", "neon"],
  ["Viral Pop", "#ffffff", "pop"],
  ["Word Zoom", "#f8f9fa", "zoom"],
  ["Retro", "#ffd166", "type"],
  ["Nightclub", "#00f5d4", "glitch"],
  ["Street", "#f1f1f1", "bounce"],
  ["Luxury", "#f8e7b0", "glow"],
  ["Reel Flash", "#ffffff", "zoom"],
  ["Beat Glow", "#00ff9d", "glow"],
  ["Kinetic", "#ffffff", "slide"],
  ["Comic", "#ffea00", "bounce"],
  ["Deep Red", "#ff304f", "glow"]
];

selected = presets[0];

function stat(text) {
  if (status) status.textContent = "● " + text;
}

function fmt(t) {
  if (!Number.isFinite(t)) return "00:00.0";

  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 10);

  return (
    String(min).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0") +
    "." +
    ms
  );
}

function renderPresets() {
  if (!stylesGrid) return;

  stylesGrid.innerHTML = "";

  const count = $("presetCount");
  if (count) {
    count.textContent = presets.length + " presets";
  }

  presets.forEach((preset, index) => {
    const button = document.createElement("button");

    button.className = "style " + (index === 0 ? "active" : "");
    button.textContent = "Aa Lyrics";
    button.style.color = preset[1];
    button.style.textShadow = `0 0 12px ${preset[1]}`;
    button.title = preset[0];

    button.onclick = () => {
      selected = preset;

      document
        .querySelectorAll(".style")
        .forEach(x => x.classList.remove("active"));

      button.classList.add("active");

      refresh(true);
    };

    stylesGrid.appendChild(button);
  });
}

function setVideo(file) {
  if (!file) return;

  if (!file.type.startsWith("video/")) {
    stat("Please select a video file");
    return;
  }

  video.src = URL.createObjectURL(file);
  video.load();

  const empty = $("emptyState");
  if (empty) empty.style.display = "none";

  captions = [];
  currentCue = -1;

  if (track) {
    track.innerHTML =
      "<p>Generate captions to see the timeline.</p>";
  }

  if (overlay) {
    overlay.textContent = "";
  }

  stat("Video loaded");
}

if ($("chooseVideo")) {
  $("chooseVideo").onclick = () => videoInput.click();
}

if ($("uploadTop")) {
  $("uploadTop").onclick = () => videoInput.click();
}

if (videoInput) {
  videoInput.onchange = () => {
    setVideo(videoInput.files[0]);
  };
}

if ($("dropZone")) {
  $("dropZone").ondragover = e => {
    e.preventDefault();
  };

  $("dropZone").ondrop = e => {
    e.preventDefault();
    setVideo(e.dataTransfer.files[0]);
  };
}

video.onloadedmetadata = () => {
  const duration = $("duration");

  if (duration) {
    duration.textContent = fmt(video.duration);
  }

  stat("Video ready");
};

video.ontimeupdate = () => {
  if (seek && video.duration) {
    seek.value =
      (video.currentTime / video.duration) * 1000;
  }

  const current = $("currentTime");

  if (current) {
    current.textContent = fmt(video.currentTime);
  }

  refresh(false);
};

const playBtn = $("playBtn");

if (playBtn) {
  playBtn.onclick = async () => {
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error(error);
    }
  };
}

video.onplay = () => {
  if (playBtn) playBtn.textContent = "❚❚";
};

video.onpause = () => {
  if (playBtn) playBtn.textContent = "▶";
};

if (seek) {
  seek.oninput = () => {
    if (video.duration) {
      video.currentTime =
        (seek.value / 1000) * video.duration;
    }
  };
}

if (wordsRange) {
  wordsRange.oninput = () => {
    if (wordCount) {
      wordCount.textContent = wordsRange.value;
    }
  };
}

if (fontSize) {
  fontSize.oninput = () => {
    if (fontSizeValue) {
      fontSizeValue.textContent = fontSize.value;
    }

    if (overlay) {
      overlay.style.fontSize =
        fontSize.value + "px";
    }
  };
}

if (position) {
  position.onchange = () => {
    if (!overlay) return;

    if (position.value === "top") {
      overlay.style.top = "9%";
      overlay.style.bottom = "auto";
    }

    if (position.value === "center") {
      overlay.style.top = "45%";
      overlay.style.bottom = "auto";
    }

    if (position.value === "bottom") {
      overlay.style.top = "auto";
      overlay.style.bottom = "9%";
    }
  };
}

function refresh(force) {
  if (!video || !overlay) return;

  const index = captions.findIndex(
    c =>
      video.currentTime >= c.start &&
      video.currentTime < c.end
  );

  if (index === currentCue && !force) return;

  currentCue = index;

  const caption = captions[index];

  if (!caption) {
    overlay.textContent = "";
    return;
  }

  overlay.className =
    "caption-overlay " + selected[2];

  overlay.style.color = selected[1];
  overlay.style.fontSize =
    (fontSize ? fontSize.value : 48) + "px";

  overlay.textContent = caption.text;

  document.querySelectorAll(".cue").forEach(item => {
    item.classList.toggle(
      "active",
      Number(item.dataset.i) === index
    );
  });
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTrack() {
  if (!track) return;

  track.innerHTML = "";

  captions.forEach((caption, index) => {
    const element = document.createElement("div");

    element.className = "cue";
    element.dataset.i = index;

    element.innerHTML =
      "<b>" +
      esc(caption.text) +
      "</b>" +
      "<span>" +
      fmt(caption.start) +
      " - " +
      fmt(caption.end) +
      "</span>";

    element.onclick = () => {
      video.currentTime = caption.start;
      video.play().catch(() => {});
    };

    track.appendChild(element);
  });
}

/* =========================
   LOCAL AUDIO PROCESSING
========================= */

async function audio(file) {
  const AudioCtx =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioCtx) {
    throw new Error(
      "Your browser does not support AudioContext"
    );
  }

  const context = new AudioCtx();

  try {
    const buffer = await file.arrayBuffer();

    const audioBuffer =
      await context.decodeAudioData(buffer);

    const targetRate = 16000;

    const duration =
      Math.min(audioBuffer.duration, 600);

    const length =
      Math.floor(duration * targetRate);

    const output =
      new Float32Array(length);

    for (
      let channel = 0;
      channel < audioBuffer.numberOfChannels;
      channel++
    ) {
      const data =
        audioBuffer.getChannelData(channel);

      const ratio =
        audioBuffer.sampleRate / targetRate;

      for (let i = 0; i < length; i++) {
        const sourceIndex =
          Math.floor(i * ratio);

        output[i] +=
          (data[sourceIndex] || 0) /
          audioBuffer.numberOfChannels;
      }
    }

    return output;
  } finally {
    try {
      await context.close();
    } catch (_) {}
  }
}

/* =========================
   WHISPER MODEL
========================= */

async function getModel() {
  if (model) return model;

  progressText.textContent =
    "Downloading Whisper AI model — first time only...";

  model = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny",
    {
      dtype: "q8",
      progress_callback: progress => {
        if (
          progress &&
          typeof progress.progress === "number"
        ) {
          const value =
            Math.round(progress.progress);

          if (progressBar) {
            progressBar.style.width =
              value + "%";
          }

          if (progressText) {
            progressText.textContent =
              "Model download " +
              value +
              "%";
          }
        }
      }
    }
  );

  return model;
}

/* =========================
   CAPTION SEGMENTS
========================= */

function chunks(chunksArray, text) {
  if (!Array.isArray(chunksArray) || !chunksArray.length) {
    if (text && text.trim()) {
      return [
        {
          text: text.trim(),
          start: 0,
          end: Math.max(video.duration || 5, 1)
        }
      ];
    }

    return [];
  }

  const result = [];
  let group = [];
  let start = null;
  let end = null;

  const limit =
    Number(wordsRange ? wordsRange.value : 4);

  for (const chunk of chunksArray) {
    const textValue =
      String(chunk.text || "").trim();

    if (!textValue) continue;

    const timestamp =
      Array.isArray(chunk.timestamp)
        ? chunk.timestamp
        : [0, 0];

    const startTime =
      Number(timestamp[0]) || 0;

    const endTime =
      Number(timestamp[1]) ||
      startTime + 0.8;

    if (start === null) {
      start = startTime;
    }

    end = endTime;
    group.push(textValue);

    const wordNumber =
      group.join(" ").split(/\s+/).length;

    if (
      wordNumber >= limit ||
      /[.!?]$/.test(textValue)
    ) {
      result.push({
        text: group.join(" "),
        start,
        end: Math.max(end, start + 0.5)
      });

      group = [];
      start = null;
      end = null;
    }
  }

  if (group.length) {
    result.push({
      text: group.join(" "),
      start: start ?? 0,
      end: Math.max(
        end ?? 2,
        (start ?? 0) + 0.5
      )
    });
  }

  return result;
}

/* =========================
   GENERATE CAPTIONS
========================= */

if (generateBtn) {
  generateBtn.onclick = async () => {
    const file =
      videoInput && videoInput.files
        ? videoInput.files[0]
        : null;

    if (!file) {
      stat("Pehle video upload karo");
      return;
    }

    try {
      generateBtn.disabled = true;

      stat("Local AI model loading...");

      const whisper = await getModel();

      stat("Audio processing...");

      const audioData = await audio(file);

      if (
        !audioData ||
        !(audioData instanceof Float32Array)
      ) {
        throw new Error(
          "Audio data prepare nahi hua"
        );
      }

      stat("Captions generating...");

      const language =
        $("language")
          ? $("language").value
          : "auto";

      const options = {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        task: "transcribe"
      };

      if (
        language &&
        language !== "auto" &&
        language !== "Auto detect"
      ) {
        options.language = language;
      }

      /*
        IMPORTANT:
        Whisper ko clean Float32Array diya ja raha hai.
        Isse "subarray is not a function" wali
        problem avoid hoti hai.
      */

      const cleanAudio =
        new Float32Array(audioData);

      const result =
        await whisper(
          cleanAudio,
          options
        );

      captions = chunks(
        result && result.chunks
          ? result.chunks
          : [],
        result ? result.text : ""
      );

      if (!captions.length) {
        throw new Error(
          "Speech detect nahi hui"
        );
      }

      renderTrack();
      refresh(true);

      stat(
        captions.length +
        " captions generated!"
      );

      if (progressText) {
        progressText.textContent =
          "Done — processed locally.";
      }

    } catch (error) {
      console.error(
        "CAPTION ERROR:",
        error
      );

      stat(
        "Caption failed: " +
        (
          error && error.message
            ? error.message
            : "Browser processing failed"
        )
      );

      if (progressText) {
        progressText.textContent =
          "Chrome/Edge use karo aur short video se test karo.";
      }

    } finally {
      generateBtn.disabled = false;
    }
  };
}

/* =========================
   DOWNLOAD HELPERS
========================= */

function downloadFile(
  filename,
  content,
  type
) {
  const blob =
    new Blob([content], { type });

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function srtTime(time) {
  const hours =
    Math.floor(time / 3600);

  const minutes =
    Math.floor(
      (time % 3600) / 60
    );

  const seconds =
    Math.floor(time % 60);

  const milliseconds =
    Math.floor(
      (time % 1) * 1000
    );

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "," +
    String(milliseconds).padStart(3, "0")
  );
}

if ($("downloadSrt")) {
  $("downloadSrt").onclick = () => {
    const output = captions
      .map(
        (caption, index) =>
          `${index + 1}
${srtTime(caption.start)} --> ${srtTime(caption.end)}
${caption.text}
`
      )
      .join("\n");

    downloadFile(
      "captions.srt",
      output,
      "text/plain"
    );
  };
}

if ($("exportSrt")) {
  $("exportSrt").onclick = () => {
    if ($("downloadSrt")) {
      $("downloadSrt").click();
    }
  };
}

if ($("downloadJson")) {
  $("downloadJson").onclick = () => {
    downloadFile(
      "caption-style.json",
      JSON.stringify(
        {
          preset: selected[0],
          captions
        },
        null,
        2
      ),
      "application/json"
    );
  };
}

/* =========================
   VIDEO EXPORT BUTTON
========================= */

function createExportButton() {
  let button =
    $("exportVideo");

  if (button) return button;

  button =
    document.createElement("button");

  button.id = "exportVideo";
  button.textContent =
    "🎬 Export Caption Video";

  button.style.cssText = `
    margin:10px 0;
    padding:12px 18px;
    border:0;
    border-radius:10px;
    cursor:pointer;
    font-weight:700;
  `;

  const parent =
    $("downloadSrt")
      ? $("downloadSrt").parentElement
      : document.body;

  parent.appendChild(button);

  return button;
}

async function exportCaptionVideo() {
  if (!video.src) {
    stat("Pehle video upload karo");
    return;
  }

  if (!captions.length) {
    stat("Pehle captions generate karo");
    return;
  }

  if (!window.MediaRecorder) {
    stat(
      "Is browser me video export supported nahi hai"
    );
    return;
  }

  const canvas =
    document.createElement("canvas");

  const width =
    video.videoWidth || 720;

  const height =
    video.videoHeight || 1280;

  canvas.width = width;
  canvas.height = height;

  const ctx =
    canvas.getContext("2d");

  const stream =
    canvas.captureStream(30);

  let audioContext = null;
  let source = null;

  try {
    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    source =
      audioContext.createMediaElementSource(
        video
      );

    const destination =
      audioContext.createMediaStreamDestination();

    source.connect(destination);
    source.connect(audioContext.destination);

    destination.stream
      .getAudioTracks()
      .forEach(track => {
        stream.addTrack(track);
      });
  } catch (error) {
    console.warn(
      "Audio export unavailable:",
      error
    );
  }

  let mimeType =
    "video/webm;codecs=vp9,opus";

  if (
    !MediaRecorder.isTypeSupported(
      mimeType
    )
  ) {
    mimeType =
      "video/webm;codecs=vp8,opus";
  }

  if (
    !MediaRecorder.isTypeSupported(
      mimeType
    )
  ) {
    mimeType = "video/webm";
  }

  const recorder =
    new MediaRecorder(
      stream,
      {
        mimeType,
        videoBitsPerSecond:
          5000000
      }
    );

  const parts = [];

  recorder.ondataavailable = event => {
    if (
      event.data &&
      event.data.size > 0
    ) {
      parts.push(event.data);
    }
  };

  recorder.onerror = event => {
    console.error(
      "EXPORT ERROR:",
      event
    );

    stat("Export failed");
  };

  const finished =
    new Promise(resolve => {
      recorder.onstop = resolve;
    });

  const oldTime =
    video.currentTime;

  video.pause();
  video.currentTime = 0;

  await new Promise(resolve => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.onloadeddata = resolve;
    }
  });

  if (
    audioContext &&
    audioContext.state === "suspended"
  ) {
    await audioContext.resume();
  }

  stat("Exporting caption video...");

  recorder.start(250);

  await video.play();

  await new Promise(resolve => {
    function draw() {
      ctx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      const active =
        captions.find(
          c =>
            video.currentTime >= c.start &&
            video.currentTime < c.end
        );

      if (active) {
        drawCaption(
          ctx,
          active.text,
          width,
          height
        );
      }

      if (
        !video.ended &&
        recorder.state === "recording"
      ) {
        requestAnimationFrame(draw);
      } else {
        resolve();
      }
    }

    draw();
  });

  video.pause();

  if (
    recorder.state === "recording"
  ) {
    recorder.stop();
  }

  await finished;

  video.currentTime =
    Math.min(
      oldTime,
      video.duration || oldTime
    );

  const blob =
    new Blob(parts, {
      type: mimeType
    });

  if (!blob.size) {
    stat("Export file empty hai");
    return;
  }

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "caption-video.webm";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);

  if (audioContext) {
    try {
      await audioContext.close();
    } catch (_) {}
  }

  stat("Video export complete!");
}

function drawCaption(
  ctx,
  text,
  width,
  height
) {
  const size =
    Number(fontSize ? fontSize.value : 48);

  ctx.save();

  ctx.font =
    `800 ${size}px Arial, sans-serif`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let y =
    height * 
