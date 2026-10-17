import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, DecorationSet } from '@tiptap/pm/state';
import { Decoration } from '@tiptap/pm/view';

const LT_KEY = new PluginKey('languageTool');

interface LTMatch {
  message: string;
  offset: number;
  length: number;
  rule: { issueType: string };
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Build char-index → doc-position map, matching textBetween(0, size, '\n')
function buildPosMap(doc: any): number[] {
  const positions: number[] = [];
  let prevWasBlock = false;

  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      prevWasBlock = false;
      for (let i = 0; i < node.text.length; i++) {
        positions.push(pos + i);
      }
    } else if (node.isBlock && !node.isLeaf) {
      if (prevWasBlock && positions.length > 0) {
        positions.push(pos); // newline separator
      }
      prevWasBlock = true;
    }
  });

  return positions;
}

export const LanguageToolExtension = Extension.create({
  name: 'languageTool',

  addStorage() {
    return { matches: [] as LTMatch[], checking: false };
  },

  addProseMirrorPlugins() {
    const ext = this;

    const check = debounce(async (text: string, view: any) => {
      if (text.trim().length < 20) return;
      ext.storage.checking = true;
      try {
        const res = await fetch('https://api.languagetool.org/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ text, language: 'en-US' }).toString(),
        });
        if (!res.ok) return;
        const data = await res.json();
        const matches: LTMatch[] = data.matches || [];
        ext.storage.matches = matches;

        const { doc } = view.state;
        const posMap = buildPosMap(doc);
        const decorations: Decoration[] = [];

        for (const m of matches) {
          const from = posMap[m.offset];
          const to = posMap[Math.min(m.offset + m.length - 1, posMap.length - 1)];
          if (from == null || to == null || from > to) continue;

          const issue = m.rule?.issueType ?? 'misspelling';
          const cls =
            issue === 'grammar' ? 'lt-grammar'
            : issue === 'style' || issue === 'locale-violation' ? 'lt-style'
            : 'lt-spelling';

          decorations.push(Decoration.inline(from, to + 1, { class: cls, title: m.message }));
        }

        view.dispatch(
          view.state.tr.setMeta(LT_KEY, DecorationSet.create(doc, decorations))
        );
      } catch {
        // silently ignore — never interrupt editing
      } finally {
        ext.storage.checking = false;
      }
    }, 1500);

    return [
      new Plugin({
        key: LT_KEY,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(LT_KEY);
            if (meta) return meta;
            if (tr.docChanged) return old.map(tr.mapping, tr.doc);
            return old;
          },
        },
        props: {
          decorations(state) { return this.getState(state); },
        },
        view: () => ({
          update(view, prev) {
            if (!view.state.doc.eq(prev.doc)) {
              const text = view.state.doc.textBetween(0, view.state.doc.content.size, '\n');
              check(text, view);
            }
          },
        }),
      }),
    ];
  },
});
