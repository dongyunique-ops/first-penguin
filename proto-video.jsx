// proto-video.jsx — VideoPlayer that handles real mp4/gif files via blob URLs
// Falls back to MockVideoCanvas for seed data without a real file.

const ProtoVideo = ({ submission, isPlaying = true, autoPlay = false, muted = true, loop = true, style, onLoadedMeta, currentTime, onTimeUpdate, onClick }) => {
  const videoRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const hasFile = submission?.videoUrl;

  // Mount <video> ONLY when actually needed (hover/autoPlay). Otherwise we
  // show a static poster image. This was the source of two bugs:
  //   1) preview grid is slow — every visible tile was streaming its video
  //      in the background with preload="auto", saturating the 6-connection
  //      per-origin limit.
  //   2) clicking a tile to open the player didn't play — the player's
  //      video request was queued behind all the preview downloads.
  const shouldMountVideo = isPlaying || autoPlay;
  const [buffering, setBuffering] = React.useState(false);

  React.useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (isPlaying || autoPlay) {
      const tryPlay = () => v.play().catch(()=>{});
      tryPlay();
      v.addEventListener('canplay', tryPlay, { once: true });
      v.addEventListener('loadeddata', tryPlay, { once: true });
      return () => {
        v.removeEventListener('canplay', tryPlay);
        v.removeEventListener('loadeddata', tryPlay);
      };
    } else {
      v.pause();
    }
  }, [isPlaying, autoPlay, hasFile]);

  React.useEffect(() => {
    if (!videoRef.current || currentTime == null) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.2) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  if (hasFile && submission.videoMime?.startsWith('image/')) {
    return (
      <div ref={wrapRef} className="video-frame" style={style} onClick={onClick}>
        <img src={submission.videoUrl} alt="" loading="lazy"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>
    );
  }
  if (hasFile) {
    const poster = submission.thumbnailUrl;
    const handleMeta = (e) => { onLoadedMeta?.(e.target.duration); };

    return (
      <div ref={wrapRef} className="video-frame" style={style} onClick={onClick}>
        {/* Always-on poster layer — instant, lightweight */}
        {poster ? (
          <img src={poster} alt="" loading="lazy" decoding="async"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{ position:'absolute', inset:0, background:'#1a1812' }}/>
        )}

        {/* Video only mounts on hover/autoPlay. Fades over the poster once ready. */}
        {shouldMountVideo && (
          <video
            ref={videoRef}
            src={submission.videoUrl}
            poster={poster || undefined}
            autoPlay
            muted={muted}
            loop={loop}
            playsInline
            preload="auto"
            onLoadedMetadata={handleMeta}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onTimeUpdate={(e) => onTimeUpdate?.(e.target.currentTime, e.target.duration)}
            style={{
              position:'absolute', inset: 0,
              width:'100%', height:'100%', objectFit:'cover', display:'block',
            }}/>
        )}

        {/* Loading spinner while buffering on hover */}
        {shouldMountVideo && buffering && (
          <div style={{
            position:'absolute', inset:0,
            display:'grid', placeItems:'center',
            background:'rgba(0,0,0,0.2)',
            pointerEvents:'none',
          }}>
            <div className="fp-spinner"/>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="video-frame" style={style} onClick={onClick}>
      <MockVideoCanvas kind={submission?.kind || 'shape'} tone={submission?.tone || 'light'} isPlaying={isPlaying}/>
    </div>
  );
};

// Drop zone overlay that captures dropped video/gif files and turns them
// into a blob URL.
const DropZone = ({ onDrop, children, style, disabled }) => {
  const [over, setOver] = React.useState(false);
  return (
    <div
      onDragEnter={(e) => { if (disabled) return; e.preventDefault(); setOver(true); }}
      onDragOver={(e) => { if (disabled) return; e.preventDefault(); setOver(true); }}
      onDragLeave={(e) => { if (disabled) return; setOver(false); }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault(); setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onDrop(f);
      }}
      style={{ position:'relative', ...style }}>
      {children}
      {over && (
        <div style={{
          position:'absolute', inset: 0, zIndex: 20,
          background:'rgba(255,90,31,.15)',
          border:'2px dashed var(--accent)',
          borderRadius: 6, pointerEvents:'none',
          display:'grid', placeItems:'center',
          color:'var(--accent)', fontWeight: 600,
          fontFamily:'var(--font-mono)', fontSize: 12, letterSpacing:'0.1em',
        }}>DROP TO UPLOAD</div>
      )}
    </div>
  );
};

// Pick a file via standard input
const FilePicker = ({ onFile, accept, children, style, className }) => {
  const ref = React.useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept || 'video/*,image/*'}
        style={{ display:'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}/>
      <button className={className} style={style} onClick={() => ref.current?.click()}>
        {children}
      </button>
    </>
  );
};

// Convert File → submission patch
async function fileToSubmission(file) {
  // Use data URL so the file persists across page reloads (blob: URLs don't).
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const isImage = file.type.startsWith('image/');
  return {
    videoUrl: dataUrl,
    videoMime: file.type,
    videoName: file.name,
    format: isImage ? (file.type === 'image/gif' ? 'gif' : file.type === 'image/png' ? 'png' : 'img') : 'mp4',
  };
}

// Inject spinner styles once
if (typeof document !== 'undefined' && !document.getElementById('fp-video-spinner')) {
  const s = document.createElement('style');
  s.id = 'fp-video-spinner';
  s.textContent = `
    .fp-spinner {
      width: 30px; height: 30px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: fpSpin 0.7s linear infinite;
    }
    @keyframes fpSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { ProtoVideo, DropZone, FilePicker, fileToSubmission });
