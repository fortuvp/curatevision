import { useEffect } from 'react'

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let meta = document.querySelector(selector) as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    document.head.append(meta)
  }
  Object.entries(attributes).forEach(([key, value]) =>
    meta?.setAttribute(key, value),
  )
}

const upsertLink = (selector: string, attributes: Record<string, string>) => {
  let link = document.querySelector(selector) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    document.head.append(link)
  }
  Object.entries(attributes).forEach(([key, value]) =>
    link?.setAttribute(key, value),
  )
}

const useDocumentHead = (title?: string, description?: string) => {
  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    if (!description) return
    const currentTitle = title || document.title
    const canonical = `${window.location.origin}${window.location.pathname}`

    upsertMeta('meta[name="description"]', {
      name: 'description',
      content: description,
    })
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: 'index,follow,max-image-preview:large',
    })
    upsertMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: currentTitle,
    })
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    })
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    })
    upsertMeta('meta[property="og:url"]', {
      property: 'og:url',
      content: canonical,
    })
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    })
    upsertMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: currentTitle,
    })
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })
    upsertLink('link[rel="canonical"]', {
      rel: 'canonical',
      href: canonical,
    })
    upsertLink('link[rel="llms"]', {
      rel: 'llms',
      type: 'text/plain',
      href: '/llms.txt',
    })
  }, [description, title])
}

export default useDocumentHead
