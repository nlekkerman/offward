import { useRef, useState } from 'react'
import { createVideoDirectUpload, uploadVideoToCloudflare } from '../../services/management/videoUploadApi.js'

const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.m4v']

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size'
  const units = ['bytes', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** index)
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

function getErrorMessage(error) {
  return error?.response?.data?.detail || error?.message || 'Unable to upload this video.'
}

function isAcceptedVideo(file) {
  const filename = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((extension) => filename.endsWith(extension))
}

function VideoUploadField({ onUploadSuccess, onUploadStateChange }) {
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [uploadSession, setUploadSession] = useState(null)

  const updateStatus = (nextStatus) => {
    setStatus(nextStatus)
    onUploadStateChange?.(nextStatus)
  }

  const resetUpload = (nextFile = null) => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setSelectedFile(nextFile)
    setProgress(0)
    setError('')
    setUploadSession(null)
    updateStatus(nextFile ? 'selected' : 'idle')
    onUploadSuccess?.(null)
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) return

    event.target.value = ''

    if (!isAcceptedVideo(file)) {
      resetUpload()
      setError('Choose an MP4, MOV, or M4V video file.')
      updateStatus('error')
      return
    }

    resetUpload(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || status === 'requesting' || status === 'uploading') return

    setError('')
    setProgress(0)
    updateStatus('requesting')
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const session = await createVideoDirectUpload({ file: selectedFile })
      if (abortController.signal.aborted) return

      updateStatus('uploading')
      await uploadVideoToCloudflare({
        uploadUrl: session.upload_url,
        file: selectedFile,
        signal: abortController.signal,
        onProgress: setProgress,
      })

      if (abortController.signal.aborted) return
      setProgress(100)
      setUploadSession(session)
      updateStatus('success')
      onUploadSuccess?.(session)
    } catch (uploadError) {
      if (abortController.signal.aborted) return
      setError(getErrorMessage(uploadError))
      setUploadSession(null)
      updateStatus('error')
      onUploadSuccess?.(null)
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  const isBusy = status === 'requesting' || status === 'uploading'
  const statusText = {
    requesting: 'Preparing upload session...',
    uploading: `Uploading... ${progress}%`,
    success: 'Upload complete. Cloudflare Stream is ready.',
    error: 'Upload failed. Check the error and retry.',
  }[status]

  return (
    <section className="video-upload-section" aria-labelledby="video-upload-title">
      <div>
        <p className="eyebrow">Video file</p>
        <h2 id="video-upload-title">Upload to Cloudflare Stream</h2>
        <p className="video-upload-help">Choose an MP4, MOV, or M4V file before creating this Video.</p>
      </div>

      <input
        ref={inputRef}
        className="video-upload-input"
        type="file"
        accept="video/mp4,video/quicktime,video/x-m4v,.mp4,.mov,.m4v"
        onChange={handleFileChange}
      />
      <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
        {selectedFile ? 'Replace file' : 'Choose video'}
      </button>

      {selectedFile && (
        <div className="video-upload-file">
          <strong>{selectedFile.name}</strong>
          <span>{formatFileSize(selectedFile.size)}</span>
        </div>
      )}

      {selectedFile && status !== 'success' && (
        <button type="button" className="primary-button" onClick={handleUpload} disabled={isBusy}>
          {status === 'error' ? 'Retry upload' : 'Upload video'}
        </button>
      )}

      {isBusy && (
        <div className="video-upload-progress" role="status" aria-live="polite">
          <div className="video-upload-progress-heading">
            <span>{statusText}</span>
            {status === 'uploading' && <strong>{progress}%</strong>}
          </div>
          <progress max="100" value={progress} aria-label="Video upload progress" />
        </div>
      )}

      {status === 'success' && (
        <div className="video-upload-success" role="status">
          <span>{statusText}</span>
          {uploadSession?.provider_id && <span>Provider ID: {uploadSession.provider_id}</span>}
        </div>
      )}
      {error && <div className="management-error" role="alert">{error}</div>}
    </section>
  )
}

export default VideoUploadField
