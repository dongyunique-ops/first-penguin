// proto-video.jsx — VideoPlayer that handles real mp4/gif files via blob URLs
// Falls back to MockVideoCanvas for seed data without a real file.

const ProtoVideo = ({ submission, isPlaying = true, autoPlay = false, muted = true, loop = true, style, onLoadedMeta, currentTime, onTimeUpdate, onClick }) => {
  const videoRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const hasFile = submission?.videoUrl;
  // Only mount the <video> when actually in viewport. Massive speed up when
  // there are dozens of videos (전체보기) because the browser doesn't pre-fetch
  // metadata for off-screen items.
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!wrapRef.current || visible) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { setVisible(true); io.disconnect(); }
      });
    }, { rootMargin: '200px' });
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, [visible]);

  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.play().catch(()=>{});
    else videoRef.current.pause();
  }, [isPlaying, hasFile, visible]);

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
    // Append #t=1 to the URL — modern browsers will fetch & display that frame
    // as the natural poster without needing a full seek round-trip.
    const posterUrl = submission.videoUrl.includes('#') ? submission.videoUrl : submission.videoUrl + '#t=1';
    const handleMeta = (e) => {
      const v = e.target;
      onLoadedMeta?.(v.duration);
      // Belt-and-suspenders: also seek programmatically in case the fragment didn't take
      if (v.currentTime < 0.5) {
        const target = Math.min(1, (v.duration || 1) * 0.1);
        try { v.currentTime = target; } catch {}
      }
    };
    return (
      <div ref={wrapRef} className="video-frame" style={style} onClick={onClick}>
        {visible ? (
          <video
            ref={videoRef}
            src={posterUrl}
            autoPlay={autoPlay}
            muted={muted}
            loop={loop}
            playsInline
            preload="auto"
            onLoadedMetadata={handleMeta}
            onTimeUpdate={(e) => onTimeUpdate?.(e.target.currentTime, e.target.duration)}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{
            position:'absolute', inset:0,
            background:'#1a1812',
          }}/>
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

Object.assign(window, { ProtoVideo, DropZone, FilePicker, fileToSubmission });
