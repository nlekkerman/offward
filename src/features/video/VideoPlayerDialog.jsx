import { useEffect, useRef } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import './VideoPlayerDialog.css'

function VideoPlayerDialog({ video, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!video) return undefined

    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose, video])

  if (!video) return null

  return (
    <div className="video-player-dialog-backdrop" onClick={onClose}>
      <div className="video-player-dialog" role="dialog" aria-modal="true" aria-label={video.title || 'Video'} ref={dialogRef} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="video-player-dialog-header">
          <div><p className="eyebrow">Video</p><h2>{video.title || 'Video'}</h2></div>
          <button type="button" className="video-player-dialog-close" onClick={onClose} aria-label="Close video">×</button>
        </div>
        <VideoPlayer
          key={video.id || video.playback_url}
          playbackUrl={video.playback_url}
          thumbnailUrl={video.thumbnail_url}
          title={video.title}
          initiallyActivated
        />
      </div>
    </div>
  )
}

export default VideoPlayerDialog