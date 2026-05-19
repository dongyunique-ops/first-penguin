// proto-video.jsx — VideoPlayer that handles real mp4/gif files via blob URLs
// Falls back to MockVideoCanvas for seed data without a real file.

const ProtoVideo = ({ submission, isPlaying = true, autoPlay = false, muted = true, loop = true, style, onLoadedMeta, currentTime, onTimeUpdate, onClick }) => {
  const videoRef = React.useRef(null);
  const hasFile = submission?.videoUrl;
  // Lazy-load: only mount the <video> element when it's been requested to play
  // at least once, OR when autoPlay is true. Big speed win for The Roll page
  // because dozens of off-screen videos no longer fetch their data.
  const [shouldMount, setShouldMount] = React.useState(autoPlay || isPlaying);
  React.useEffect(() => {
    if (isPlaying || autoPlay) setShouldMount(true);
  }, [isPlaying, autoPlay]);

  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.play().catch(()=>{});
    else videoRef.current.pause();
  }, [isPlaying, hasFile, shouldMount]);

  React.useEffect(() => {
    if (!videoRef.current || currentTime == null) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.2) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  if (hasFile && submission.videoMime?.startsWith('image/')) {
    return (
      <div className="video-frame" style={style} onClick={onClick}>
        <img src={submission.videoUrl} alt="" loading="lazy"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>
    );
  }
  if (hasFile) {
    // Off-screen placeholder until play requested
    if (!shouldMount) {
      return (
        <div className="video-frame" style={style} onClick={onClick}>
          <div style={{
            position:'absolute', inset: 0,
            background: '#15140f',
            display:'grid', placeItems:'center',
            color:'rgba(255,247,230,.55)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius:'50%',
              background:'rgba(255,247,230,.15)',
              display:'grid', placeItems:'center',
            }}>
              <span style={{
                width: 0, height: 0,
                borderLeft:'12px solid #fff7e6',
                borderTop:'8px solid transparent',
                borderBottom:'8px solid transparent',
                marginLeft: 4,
              }}/>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="video-frame" style={style} onClick={onClick}>
        <video
          ref={videoRef}
          src={submission.videoUrl}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => onLoadedMeta?.(e.target.duration)}
          onTimeUpdate={(e) => onTimeUpdate?.(e.target.currentTime, e.target.duration)}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>
    );
  }
  // Fallback: animated mock
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
