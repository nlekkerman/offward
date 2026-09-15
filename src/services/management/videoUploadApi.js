import { apiClient } from '../apiClient.js'

const TUS_VERSION = '1.0.0'

export async function createVideoDirectUpload({ file, maxDurationSeconds = 600 }) {
  const { data } = await apiClient.post('/api/offward/manage/videos/direct-upload/', {
    original_filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size_bytes: file.size,
    max_duration_seconds: maxDurationSeconds,
  })

  if (!data?.upload_url || !data?.provider_id) {
    throw new Error('The upload session response did not include a Cloudflare upload URL and video ID.')
  }

  return {
    provider: data.provider || 'cloudflare',
    provider_id: data.provider_id,
    upload_url: data.upload_url,
    upload_url_expires_at: data.upload_url_expires_at || '',
  }
}

function getUploadError(xhr) {
  if (xhr.status === 401 || xhr.status === 403) {
    return 'The Cloudflare upload session is no longer valid. Start the upload again.'
  }
  if (xhr.status === 409) {
    return 'Cloudflare rejected the upload offset. Start the upload again.'
  }
  if (xhr.status >= 400) {
    return `Cloudflare upload failed (${xhr.status}).`
  }
  return 'Cloudflare upload failed.'
}

export function uploadVideoToCloudflare({ uploadUrl, file, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let settled = false

    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    if (signal) {
      if (signal.aborted) {
        fail(new Error('Upload cancelled.'))
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.open('PATCH', uploadUrl)
    xhr.setRequestHeader('Tus-Resumable', TUS_VERSION)
    xhr.setRequestHeader('Upload-Offset', '0')
    xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        settled = true
        if (typeof onProgress === 'function') onProgress(100)
        resolve()
        return
      }
      fail(new Error(getUploadError(xhr)))
    }

    xhr.onerror = () => fail(new Error('The network connection to Cloudflare failed.'))
    xhr.onabort = () => fail(new Error('Upload cancelled.'))
    xhr.ontimeout = () => fail(new Error('The Cloudflare upload timed out.'))
    xhr.send(file)
  })
}
