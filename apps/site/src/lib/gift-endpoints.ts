type GiftEndpoints = {
  checkoutEndpoint: string
  ideasEndpoint: string
  paymentStatusEndpoint: string
}

function backendURL(value: string | undefined): URL | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'

    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:'))
    ) {
      return null
    }

    url.search = ''
    url.hash = ''
    return url
  } catch {
    return null
  }
}

function endpointURL(backend: URL, pathname: string) {
  const endpoint = new URL(backend)
  endpoint.pathname = pathname
  return endpoint.toString()
}

export function giftEndpoints(
  value: string | undefined = process.env.PAYLOAD_PUBLIC_URL,
  contentMode: string | undefined = process.env.STATIC_CONTENT_MODE,
): GiftEndpoints {
  const backend = backendURL(value)
  if (backend) {
    return {
      checkoutEndpoint: endpointURL(backend, '/api/gifts/checkout'),
      ideasEndpoint: endpointURL(backend, '/api/gifts/ideas'),
      paymentStatusEndpoint: endpointURL(backend, '/api/gifts/payment-status'),
    }
  }

  if (contentMode === 'fixture') {
    return {
      checkoutEndpoint: '/api/gifts/checkout',
      ideasEndpoint: '/api/gifts/ideas',
      paymentStatusEndpoint: '/api/gifts/payment-status',
    }
  }

  throw new Error(
    'PAYLOAD_PUBLIC_URL must identify the HTTPS gift backend for a remote static-site build.',
  )
}
