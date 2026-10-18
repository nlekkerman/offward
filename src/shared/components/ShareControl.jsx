import { useState } from 'react'

function ShareControl({ title, url, description }) {
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
      <button type="button" className="secondary-button" onClick={shareContent}>
        Share
      </button>
      <span className="share-control-feedback" role="status" aria-live="polite">{feedback}</span>
    </div>
  )
}

export default ShareControl
