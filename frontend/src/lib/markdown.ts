import { marked } from 'marked'

const blockedElements = 'script, style, iframe, object, embed'

export function markdownToTiptapHtml(markdown: string) {
  const rendered = marked.parse(markdown, { async: false })
  const document = new DOMParser().parseFromString(rendered, 'text/html')

  document.querySelectorAll(blockedElements).forEach((element) => element.remove())
  document.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return document.body.innerHTML
}
