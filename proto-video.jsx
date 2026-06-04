// proto-video.jsx — VideoPlayer that handles real mp4/gif files via blob URLs
// Falls back to MockVideoCanvas for seed data without a real file.

const ProtoVideo = ({ submission, isPlaying = true, autoPlay = false, muted = true, loop = true, style, onLoadedMeta, currentTime, onTimeUpdate, onClick }) => {
  const wrapRef = React.useRef(null);
  const hasFile = submission?.videoUrl;

  // EGRESS-SAFE PREVIEW: the grid NEVER downloads/plays the video. It only
  // ever shows the lightweight thumbnail image. The actual video is fetched
  // only when the user clicks into the full player. This keeps Supabase
  // egress tiny (thumbnails are ~30KB vs. multi-MB videos looping forever).
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
    return (
      <div ref={wrapRef} className="video-frame" style={style} onClick={onClick}>
        {poster ? (
          <img src={poster} alt="" loading="lazy" decoding="async"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
        ) : (
          <div style={{ position:'absolute', inset:0, background:'#1a1812' }}/>
        )}
        {/* Play affordance — signals this is a video you can open */}
        <div style={{
          position:'absolute', inset:0,
          display:'grid', placeItems:'center',
          pointerEvents:'none',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius:'50%',
            background:'rgba(15,14,12,0.55)',
            backdropFilter:'blur(2px)',
            display:'grid', placeItems:'center',
            boxShadow:'0 2px 10px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 0, height: 0,
              borderLeft:'13px solid #fff7e6',
              borderTop:'8px solid transparent',
              borderBottom:'8px solid transparent',
              marginLeft: 3,
            }}/>
          </div>
        </div>
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
