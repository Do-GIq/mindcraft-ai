import { marked } from 'marked'

const blockedElements = 'script, style, iframe, object, embed'

function renderMarkdown(markdown: string) {
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

  return document
}

export function markdownToTiptapHtml(markdown: string) {
  return renderMarkdown(markdown).body.innerHTML
}

export function markdownToDisplayHtml(markdown: string) {
  const document = renderMarkdown(markdown)

  document.querySelectorAll('table').forEach((table) => {
    const scrollContainer = document.createElement('div')
    scrollContainer.className = 'markdown-table-scroll'
    table.parentNode?.insertBefore(scrollContainer, table)
    scrollContainer.appendChild(table)
  })

  return document.body.innerHTML
}
