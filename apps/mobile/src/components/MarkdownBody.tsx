import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { StyleSheet, View, type TextStyle } from 'react-native'
import { Renderer, useMarkdown } from 'react-native-marked'
import { openDocumentLink } from '@/lib/documents'
import { colors, fonts } from '@/theme'

/** Opens links in the app where it has the page, and shows raw HTML as text. */
class DocumentRenderer extends Renderer {
  link(children: string | ReactNode[], href: string, styles?: TextStyle, title?: string): ReactNode {
    const element = super.link(children, href, styles, title)

    return isValidElement(element) ? cloneElement(element as ReactElement<{ onPress: () => void }>, { onPress: () => openDocumentLink(href) }) : element
  }
}

const renderer = new DocumentRenderer()

/** A page's Markdown body drawn with marked, in the app's type. */
export function MarkdownBody({ value }: { value: string }) {
  const elements = useMarkdown(value, { renderer, styles: markdown, colorScheme: 'light' })

  return <View>{elements}</View>
}

const heading: TextStyle = { fontFamily: fonts.display, color: colors.ink900, letterSpacing: -0.3, borderBottomWidth: 0, paddingBottom: 0 }

const markdown = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.ink700 },
  paragraph: { paddingVertical: 6 },
  strong: { fontFamily: fonts.semibold, color: colors.ink900 },
  em: { fontStyle: 'italic' },
  link: { fontFamily: fonts.medium, fontStyle: 'normal', color: colors.brand700 },
  h1: { ...heading, fontSize: 26, lineHeight: 32, marginTop: 20, marginBottom: 4 },
  h2: { ...heading, fontSize: 21, lineHeight: 28, marginTop: 24, marginBottom: 4 },
  h3: { ...heading, fontSize: 18, lineHeight: 24, marginTop: 18, marginBottom: 2 },
  li: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.ink700 },
  list: { paddingVertical: 4 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: colors.surface200, paddingLeft: 12, backgroundColor: 'transparent' },
  codespan: { fontSize: 14, backgroundColor: colors.surface100, color: colors.ink900 },
  hr: { borderBottomWidth: 1, borderBottomColor: colors.surface200, marginVertical: 12 },
})
