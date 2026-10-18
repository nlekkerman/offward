import { useState } from 'react'

function ShareControl({ title, url, description, type }) {
  const [feedback, setFeedback] = useState('')

  async function shareContent() {
    setFeedback('')

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          url,
          ...(description ? { text: description } : {}),
        })
      } catch (error) {
        if (error?.name !== 'AbortError') setFeedback('Unable to share link')
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setFeedback('Link copied')
    } catch {
      setFeedback('Unable to copy link')
    }
  }

  return (
    <div className="share-control">
      <button type="button" className="share-control-button" onClick={shareContent}>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
          <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="m5.8 7 4.4-2.8M5.8 9l4.4 2.8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        Share {type}
      </button>
      <span className="share-control-feedback" role="status" aria-live="polite">{feedback}</span>
    </div>
  )
}

export default ShareControl
