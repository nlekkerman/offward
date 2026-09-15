import { useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../../services/apiClient.js'
import { routeMapApi } from '../../services/management/routeMapApi.js'
import { createVideoDirectUpload, uploadVideoToCloudflare } from '../../services/management/videoUploadApi.js'
import { slugify } from '../management/entityConfig.js'
import VideoPlayer from './VideoPlayer.jsx'

const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.m4v']

function normalizeVideoIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean))]
}

function getResourcePath(resourceKey) {
  switch (resourceKey) {
    case 'route':
    case 'routes':
      return 'routes'
    case 'story':
    case 'stories':
      return 'stories'
    case 'place':
    case 'places':
      return 'places'
    case 'tour':
    case 'tours':
      return 'tours'
    case 'event':
    case 'events':
      return 'events'
    case 'segment':
    case 'waypoint':
      return 'routes'
    default:
      return resourceKey || ''
  }
}

function getRelationField(resourceKey) {
  return resourceKey === 'segment' || resourceKey === 'waypoint' ? 'media_ids' : 'video_ids'
}

function getRecordList(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.results)) {
    return data.results
  }
  return []
}

function normalizeVideoRecord(video) {
  const id = video?.id ?? video?.video_id ?? ''
  return {
    ...video,
    id: String(id),
    title: video?.title || video?.name || 'Untitled video',
    status: video?.status || 'draft',
    thumbnail_url: video?.thumbnail_url || video?.thumbnail || '',
    playback_url: video?.playback_url || video?.playbackUrl || '',
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size'
  const units = ['bytes', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** index)
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

function getErrorMessage(error) {
  return error?.response?.data?.detail || error?.message || 'Unable to complete this video action.'
}

function ContentVideoManager({
  resourceKey = 'routes',
  resourceId,
  attachedVideoIds = [],
  onAttachmentsChange,
  routeId = '',
  segmentId = '',
  waypointId = '',
}) {
  const [allVideos, setAllVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [mode, setMode] = useState('upload')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExistingId, setSelectedExistingId] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('draft')
  const [uploadState, setUploadState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [previewVideoId, setPreviewVideoId] = useState('')
  const [retryVideoId, setRetryVideoId] = useState('')
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  const relationshipField = getRelationField(resourceKey)
  const backendResourcePath = getResourcePath(resourceKey)

  const normalizedAttachedIds = useMemo(() => normalizeVideoIds(attachedVideoIds), [attachedVideoIds])

  useEffect(() => {
    let active = true

    async function loadVideos() {
      try {
        setLoadingVideos(true)
        const { data } = await apiClient.get('/api/offward/manage/videos/')
        if (!active) return
        setAllVideos(getRecordList(data).map(normalizeVideoRecord))
      } catch {
        if (active) {
          setAllVideos([])
        }
      } finally {
        if (active) {
          setLoadingVideos(false)
        }
      }
    }

    loadVideos()

    return () => {
      active = false
    }
  }, [])

  const attachedVideos = useMemo(
    () => allVideos.filter((video) => normalizedAttachedIds.includes(String(video.id))),
    [allVideos, normalizedAttachedIds],
  )

  const filteredVideos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return allVideos
    }
    return allVideos.filter((video) => `${video.title} ${video.status}`.toLowerCase().includes(query))
  }, [allVideos, searchTerm])

  const resetUploadForm = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setSelectedFile(null)
    setTitleDraft('')
    setStatusDraft('draft')
    setProgress(0)
    setUploadState('idle')
    setError('')
    setNotice('')
    setRetryVideoId('')
  }

  const persistRelationship = async (nextIds) => {
    const nextVideoIds = normalizeVideoIds(nextIds)

    if (resourceKey === 'segment') {
      if (!routeId) {
        throw new Error('A Route is required to update Segment media.')
      }
      const segments = await routeMapApi.getSegments(routeId)
      const nextSegments = segments.map((segment) => {
        if (String(segment.id) !== String(segmentId)) {
          return segment
        }
        return { ...segment, media_ids: [...nextVideoIds] }
      })
      await routeMapApi.updateSegments(routeId, nextSegments)
      return nextVideoIds
    }

    if (resourceKey === 'waypoint') {
      if (!routeId) {
        throw new Error('A Route is required to update Waypoint media.')
      }
      const { waypoints } = await routeMapApi.getWaypoints(routeId)
      const nextWaypoints = waypoints.map((waypoint) => {
        if (String(waypoint.id) !== String(waypointId)) {
          return waypoint
        }
        return { ...waypoint, media_ids: [...nextVideoIds] }
      })
      await routeMapApi.updateWaypoints(routeId, nextWaypoints)
      return nextVideoIds
    }

    if (!resourceId) {
      throw new Error('This content item has no id yet.')
    }

    await apiClient.patch(`/api/offward/manage/${backendResourcePath}/${resourceId}/`, {
      [relationshipField]: nextVideoIds,
    })

    return nextVideoIds
  }

  const updateRelationship = async (nextIds, { silent = false } = {}) => {
    const nextVideoIds = normalizeVideoIds(nextIds)
    try {
      const updated = await persistRelationship(nextVideoIds)
      onAttachmentsChange?.(updated)
      if (!silent) {
        setNotice('Video attachment updated.')
      }
      return updated
    } catch (requestError) {
      const message = getErrorMessage(requestError)
      if (!silent) {
        setError(message)
      }
      throw requestError
    }
  }

  const attachVideo = async (videoId) => {
    const currentIds = normalizeVideoIds(attachedVideoIds)
    const nextIds = currentIds.includes(String(videoId)) ? currentIds : [...currentIds, String(videoId)]
    await updateRelationship(nextIds)
    setSelectedExistingId('')
    setRetryVideoId('')
    setNotice('Video attached.')
  }

  const detachVideo = async (videoId) => {
    const nextIds = normalizeVideoIds(attachedVideoIds).filter((id) => String(id) !== String(videoId))
    await updateRelationship(nextIds)
    if (previewVideoId === String(videoId)) {
      setPreviewVideoId('')
    }
    setNotice('Video detached from this content.')
    setError('')
  }

  const createVideoRecord = async ({ file, provider, providerId, title, status }) => {
    const finalTitle = title?.trim() || file.name.replace(/\.[^.]+$/, '') || 'New video'
    const slug = slugify(finalTitle) || 'new-video'

    const { data } = await apiClient.post('/api/offward/manage/videos/', {
      title: finalTitle,
      slug,
      provider,
      provider_id: providerId,
      status,
    })

    return data
  }

  const uploadAndAttach = async () => {
    if (!selectedFile) {
      setError('Choose a video file before uploading.')
      return
    }

    setError('')
    setNotice('')
    setUploadState('requesting')
    let createdVideoId = ''
    let session = null

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      session = await createVideoDirectUpload({ file: selectedFile })
      if (abortController.signal.aborted) return

      setUploadState('uploading')
      await uploadVideoToCloudflare({
        uploadUrl: session.upload_url,
        file: selectedFile,
        signal: abortController.signal,
        onProgress: setProgress,
      })

      if (abortController.signal.aborted) return
      setProgress(100)
      setUploadState('creating')

      const createdVideo = await createVideoRecord({
        file: selectedFile,
        provider: session.provider,
        providerId: session.provider_id,
        title: titleDraft,
        status: statusDraft,
      })

      createdVideoId = createdVideo?.id || createdVideo?.video_id || ''
      if (!createdVideoId) {
        throw new Error('The video record was created without a valid id.')
      }

      setUploadState('attaching')
      await updateRelationship([...normalizedAttachedIds, String(createdVideoId)], { silent: true })
      setUploadState('success')
      setNotice('Video uploaded and attached.')
      setRetryVideoId('')
      resetUploadForm()
      setIsPanelOpen(false)
    } catch (requestError) {
      if (abortController.signal.aborted) return

      if (session && createdVideoId) {
        setRetryVideoId(String(createdVideoId))
        setError('Video uploaded successfully, but could not be attached.')
      } else if (session && !createdVideoId) {
        setError('The Cloudflare upload succeeded, but the Offward Video record could not be created.')
      } else {
        setError(getErrorMessage(requestError))
      }
      setUploadState('error')
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  const handleExistingAttach = async () => {
    if (!selectedExistingId) {
      setError('Choose an existing video to attach.')
      return
    }
    setError('')
    setNotice('')
    try {
      await attachVideo(selectedExistingId)
      setIsPanelOpen(false)
    } catch {
      // error is already displayed by attachVideo
    }
  }

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) {
      return
    }

    const isAccepted = ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))
    if (!isAccepted) {
      setSelectedFile(null) && resourceKey !== 'waypoint'
      setUploadState('error')
      setError('Choose an MP4, MOV, or M4V video file.')
      return
    }

    setSelectedFile(file)
    setTitleDraft(file.name.replace(/\.[^.]+$/, '') || 'New video')
    setUploadState('selected')
    setError('')
    setNotice('')
  }

  const isBusy = uploadState === 'requesting' || uploadState === 'uploading' || uploadState === 'creating' || uploadState === 'attaching'

  if (!resourceId && resourceKey !== 'segment') {
    return null
  }

  return (
    <section className="content-video-manager">
      <div className="content-video-header">
        <div>
          <p className="eyebrow">Media</p>
          <strong>Videos</strong>
        </div>
      </div>

      <div className="content-video-card-list">
        {attachedVideos.length > 0 ? (
          attachedVideos.map((video) => (
            <div key={video.id} className="content-video-card">
              <div className="content-video-thumb-wrap">
                {video.thumbnail_url ? (
                  <img className="content-video-thumb" src={video.thumbnail_url} alt={video.title} />
                ) : (
                  <div className="content-video-thumb content-video-thumb-fallback" aria-hidden="true" />
                )}
              </div>
              <div className="content-video-details">
                <strong>{video.title}</strong>
                <span className="content-video-status">{video.status}</span>
              </div>
              <div className="content-video-actions">
                <button type="button" className="secondary-button small-button" onClick={() => setPreviewVideoId((current) => current === String(video.id) ? '' : String(video.id))}>
                  {previewVideoId === String(video.id) ? 'Hide' : 'Preview'}
                </button>
                <button type="button" className="danger-button small-button" onClick={() => detachVideo(video.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="content-video-empty">No videos attached yet.</div>
        )}
      </div>

      {previewVideoId && (
        <div className="content-video-preview-box">
          {(() => {
            const selectedVideo = allVideos.find((video) => String(video.id) === String(previewVideoId))
            if (!selectedVideo) return null
            return (
              <VideoPlayer
                playbackUrl={selectedVideo.playback_url}
                thumbnailUrl={selectedVideo.thumbnail_url}
                title={selectedVideo.title}
              />
            )
          })()}
        </div>
      )}

      <div className="content-video-panel-toggle">
        <button type="button" className="secondary-button" onClick={() => setIsPanelOpen((current) => !current)}>
          {isPanelOpen ? 'Close video manager' : '+ Add video'}
        </button>
      </div>

      {isPanelOpen && (
        <div className="content-video-upload-panel">
          <div className="content-video-tabs">
            <button type="button" className={mode === 'upload' ? 'is-active secondary-button small-button' : 'secondary-button small-button'} onClick={() => setMode('upload')}>
              Upload new
            </button>
            <button type="button" className={mode === 'existing' ? 'is-active secondary-button small-button' : 'secondary-button small-button'} onClick={() => setMode('existing')}>
              Choose existing
            </button>
          </div>

          {mode === 'upload' && (
            <div className="content-video-upload-form">
              <div className="content-video-file-picker">
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-m4v,.mp4,.mov,.m4v"
                  onChange={handleFileSelection}
                />
                <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
                  Choose video
                </button>
              </div>

              {selectedFile && (
                <div className="content-video-file-meta">
                  <strong>{selectedFile.name}</strong>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="content-video-title">Title</label>
                <input
                  id="content-video-title"
                  className="form-input"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="content-video-status">Status</label>
                <select id="content-video-status" className="form-input" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              {isBusy && (
                <div className="content-video-progress" role="status" aria-live="polite">
                  <div className="content-video-progress-row">
                    <span>{uploadState}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="content-video-progress-bar">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {retryVideoId && (
                <div className="content-video-error-box">
                  <span>Video record created. You can now attach it from the existing list.</span>
                </div>
              )}

              {error && <div className="management-error" role="alert">{error}</div>}
              {notice && <div className="management-empty" role="status">{notice}</div>}

              <div className="content-video-panel-actions">
                <button type="button" className="secondary-button" onClick={resetUploadForm}>
                  Cancel
                </button>
                <button type="button" className="primary-button" disabled={!selectedFile || isBusy} onClick={uploadAndAttach}>
                  {isBusy ? 'Uploading...' : 'Upload & Attach'}
                </button>
              </div>
            </div>
          )}

          {mode === 'existing' && (
            <div className="content-video-existing-picker">
              <div className="form-field">
                <label htmlFor="content-video-search">Search videos</label>
                <input
                  id="content-video-search"
                  className="form-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by title or status"
                />
              </div>

              {loadingVideos ? (
                <div className="management-empty">Loading videos…</div>
              ) : (
                <div className="content-video-picker-list">
                  {filteredVideos.length > 0 ? (
                    filteredVideos.map((video) => {
                      const isSelected = String(video.id) === String(selectedExistingId)
                      const isAttached = normalizedAttachedIds.includes(String(video.id))
                      return (
                        <button
                          key={video.id}
                          type="button"
                          className={isSelected ? 'content-video-picker-item is-selected' : 'content-video-picker-item'}
                          onClick={() => setSelectedExistingId(video.id)}
                        >
                          <div className="content-video-picker-thumb">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} />
                            ) : (
                              <div className="content-video-thumb content-video-thumb-fallback" aria-hidden="true" />
                            )}
                          </div>
                          <div className="content-video-picker-copy">
                            <strong>{video.title}</strong>
                            <span>{video.status}</span>
                          </div>
                          <span className="content-video-picker-badge">{isAttached ? 'Attached' : 'Available'}</span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="management-empty">No matching videos found.</div>
                  )}
                </div>
              )}

              <div className="content-video-panel-actions">
                <button type="button" className="secondary-button" onClick={() => setSelectedExistingId('')}>
                  Clear selection
                </button>
                <button type="button" className="primary-button" disabled={!selectedExistingId} onClick={handleExistingAttach}>
                  Attach selected
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ContentVideoManager
