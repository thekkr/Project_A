'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CharacterCount } from '@tiptap/extension-character-count';
import { useCallback, useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

const FLOAT_STYLE: Record<string, string> = {
  left: 'float:left;margin-right:1em',
  right: 'float:right;margin-left:1em',
  center: 'display:block;margin:0 auto',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: { src: string; alt?: string; align?: string; width?: string; caption?: string }) => ReturnType;
    };
  }
}

const CustomFigure = Node.create({
  name: 'figure',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      align: { default: 'center' },
      width: { default: '100%' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector('img');
          const figcaption = (el as HTMLElement).querySelector('figcaption');
          const figStyle = (el as HTMLElement).getAttribute('style') || '';
          const widthMatch = figStyle.match(/width\s*:\s*([^;]+)/);
          return {
            src: img?.getAttribute('src') || null,
            alt: img?.getAttribute('alt') || '',
            align: (el as HTMLElement).getAttribute('data-align') || img?.getAttribute('data-align') || 'center',
            width: widthMatch ? widthMatch[1].trim() : '100%',
            caption: figcaption?.textContent?.trim() || '',
          };
        },
      },
      {
        tag: 'img',
        getAttrs: (el) => {
          if ((el as HTMLElement).parentElement?.tagName === 'FIGURE') return false;
          const raw = (el as HTMLElement).getAttribute('style') || '';
          const match = raw.match(/width\s*:\s*([^;]+)/);
          return {
            src: (el as HTMLElement).getAttribute('src') || null,
            alt: (el as HTMLElement).getAttribute('alt') || '',
            align: (el as HTMLElement).getAttribute('data-align') || 'center',
            width: match ? match[1].trim() : '100%',
            caption: '',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, align, width, caption } = node.attrs;
    const floatPart = FLOAT_STYLE[align] ?? '';
    const figStyle = floatPart ? `${floatPart};width:${width}` : `width:${width}`;
    return [
      'figure',
      { 'data-align': align, style: figStyle },
      ['img', { src, alt: alt || '', 'data-align': align, style: 'width:100%;display:block' }],
      ['figcaption', {}, caption || ''],
    ];
  },

  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

const IMAGE_TOOLBAR_WIDTH = 420;

function offsetRelativeTo(el: HTMLElement, container: HTMLElement): { top: number; left: number } {
  let top = 0;
  let left = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== container) {
    top += cur.offsetTop;
    left += cur.offsetLeft;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { top, left };
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your article…' }: Props) {
  const [imageToolbar, setImageToolbar] = useState<{
    top: number; left: number; align: string; width: string; caption: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ visible: boolean; url: string }>({ visible: false, url: '' });
  const [isDragOver, setIsDragOver] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const captionInputActive = useRef(false);
  const selectedFigurePosRef = useRef<number | null>(null);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({ link: false }),
      CustomFigure,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
    ],
    content: value,
    onUpdate({ editor }) {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    onSelectionUpdate({ editor }) {
      const { node } = editor.state.selection as any;
      if (node?.type.name === 'figure') {
        selectedFigurePosRef.current = editor.state.selection.from;
        const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement;
        if (dom && editorRef.current) {
          const { top: rawTop, left: rawLeft } = offsetRelativeTo(dom, editorRef.current);
          const containerWidth = editorRef.current.offsetWidth;
          setImageToolbar({
            top: rawTop + 4,
            left: Math.min(rawLeft, Math.max(0, containerWidth - IMAGE_TOOLBAR_WIDTH)),
            align: node.attrs.align || 'center',
            width: node.attrs.width || '100%',
            caption: node.attrs.caption || '',
          });
        }
      } else if (!captionInputActive.current) {
        setImageToolbar(null);
      }
    },
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none px-4 py-3 focus:outline-none' },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const incoming = value || '';
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (linkModal.visible) {
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }
  }, [linkModal.visible]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href || '';
    setLinkModal({ visible: true, url: existing });
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkModal.url.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href =
        url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')
          ? url
          : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setLinkModal({ visible: false, url: '' });
  }, [editor, linkModal.url]);

  const cancelLink = useCallback(() => {
    setLinkModal({ visible: false, url: '' });
    editor?.commands.focus();
  }, [editor]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
  }, [editor]);

  const doUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploadError(null);
    const form = new FormData();
    form.append('image', file);
    try {
      const { data } = await api.post('/articles/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      editor.chain().focus().insertFigure({ src: data.url, align: 'center', width: '100%', caption: '' }).run();
    } catch (err: any) {
      const msg = err?.response?.data?.image?.[0] || err?.response?.data?.detail || 'Image upload failed.';
      setUploadError(msg);
    }
  }, [editor]);

  const uploadImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) doUpload(file);
    };
    input.click();
  }, [doUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    );
    if (file) doUpload(file);
  }, [doUpload]);

  const setImageAttr = useCallback((attr: Record<string, string>) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('figure', attr).run();
    setImageToolbar(prev => prev ? { ...prev, ...attr } : null);
  }, [editor]);

  const saveCaptionToNode = useCallback((caption: string) => {
    if (!editor || selectedFigurePosRef.current === null) return;
    const pos = selectedFigurePosRef.current;
    editor.chain().setNodeSelection(pos).updateAttributes('figure', { caption }).run();
  }, [editor]);

  if (!editor) return null;

  const isLink = editor.isActive('link');
  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div className="border rounded overflow-hidden bg-white">
      {/* Main toolbar */}
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b bg-gray-50 text-sm">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">≡L</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">≡C</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">≡R</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">1. List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">"</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">{'</>'}</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">―</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={editor.isActive('table')}
          title="Insert table"
        >
          Table
        </ToolBtn>
        {editor.isActive('table') && (
          <>
            <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} active={false} title="Add column">+Col</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} active={false} title="Add row">+Row</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} active={false} title="Delete column">-Col</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} active={false} title="Delete row">-Row</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} active={false} title="Delete table">Del Table</ToolBtn>
          </>
        )}
        <div className="w-px bg-gray-300 mx-1" />
        <div className="relative">
          <ToolBtn onClick={openLinkModal} active={isLink} title="Insert / edit link (Ctrl+K)">Link</ToolBtn>
          {linkModal.visible && (
            <div
              className="absolute left-0 top-full mt-1 z-20 bg-white border rounded shadow-lg p-2 flex gap-1 items-center"
              style={{ minWidth: 260 }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <input
                ref={linkInputRef}
                type="url"
                value={linkModal.url}
                onChange={(e) => setLinkModal((s) => ({ ...s, url: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyLink();
                  if (e.key === 'Escape') cancelLink();
                }}
                placeholder="https://example.com"
                className="flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button type="button" onClick={applyLink} className="px-2 py-1 bg-black text-white rounded text-xs">Apply</button>
              <button type="button" onClick={cancelLink} className="px-2 py-1 text-gray-500 hover:text-gray-800 rounded text-xs">✕</button>
            </div>
          )}
        </div>
        {isLink && (
          <ToolBtn onClick={removeLink} active={false} title="Remove link">Unlink</ToolBtn>
        )}
        <ToolBtn onClick={uploadImage} active={false} title="Insert image (or drag & drop)">Img</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo (Ctrl+Z)">↩</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo (Ctrl+Y)">↪</ToolBtn>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div
        ref={editorRef}
        className={`relative transition-colors ${isDragOver ? 'bg-blue-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onMouseDown={(e) => {
          const figure = (e.target as HTMLElement).closest('figure') as HTMLElement | null;
          if (!figure || !editor) return;
          requestAnimationFrame(() => {
            if (!editorRef.current) return;
            const view = editor.view;
            let figurePos = -1;
            let figureNode: any = null;
            view.state.doc.descendants((node, pos) => {
              if (figurePos !== -1) return false;
              if (node.type.name === 'figure') {
                const dom = view.nodeDOM(pos) as HTMLElement | null;
                if (dom && (dom === figure || dom.contains(figure) || figure.contains(dom))) {
                  figurePos = pos;
                  figureNode = node;
                }
              }
              return figurePos === -1;
            });
            if (figurePos === -1 || !figureNode) return;
            try {
              view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, figurePos)));
            } catch {}
            selectedFigurePosRef.current = figurePos;
            const { top: rawTop, left: rawLeft } = offsetRelativeTo(figure, editorRef.current!);
            const containerWidth = editorRef.current!.offsetWidth;
            setImageToolbar({
              top: rawTop + 4,
              left: Math.min(rawLeft, Math.max(0, containerWidth - IMAGE_TOOLBAR_WIDTH)),
              align: figureNode.attrs.align || 'center',
              width: figureNode.attrs.width || '100%',
              caption: figureNode.attrs.caption || '',
            });
          });
        }}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none border-2 border-dashed border-blue-400 rounded text-blue-500 text-sm font-medium bg-blue-50/80">
            Drop image here
          </div>
        )}
        {imageToolbar && (
          <div
            className="absolute z-10 flex flex-col gap-1.5 bg-white border rounded shadow-md px-2 py-1.5 text-xs"
            style={{ top: imageToolbar.top, left: imageToolbar.left, width: IMAGE_TOOLBAR_WIDTH }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex gap-1 items-center flex-wrap">
              <span className="text-gray-400 self-center mr-1">Align:</span>
              <ToolBtn onClick={() => setImageAttr({ align: 'left' })} active={imageToolbar.align === 'left'} title="Float left">Left</ToolBtn>
              <ToolBtn onClick={() => setImageAttr({ align: 'center' })} active={imageToolbar.align === 'center'} title="Center">Center</ToolBtn>
              <ToolBtn onClick={() => setImageAttr({ align: 'right' })} active={imageToolbar.align === 'right'} title="Float right">Right</ToolBtn>
              <div className="w-px bg-gray-300 mx-1" />
              <span className="text-gray-400 self-center mr-1">Size:</span>
              <ToolBtn onClick={() => setImageAttr({ width: '25%' })} active={imageToolbar.width === '25%'} title="25%">25%</ToolBtn>
              <ToolBtn onClick={() => setImageAttr({ width: '50%' })} active={imageToolbar.width === '50%'} title="50%">50%</ToolBtn>
              <ToolBtn onClick={() => setImageAttr({ width: '75%' })} active={imageToolbar.width === '75%'} title="75%">75%</ToolBtn>
              <ToolBtn onClick={() => setImageAttr({ width: '100%' })} active={imageToolbar.width === '100%'} title="100%">100%</ToolBtn>
            </div>
            <div className="flex gap-1 items-center border-t pt-1">
              <span className="text-gray-400 shrink-0">Caption:</span>
              <input
                type="text"
                value={imageToolbar.caption}
                onChange={(e) => setImageToolbar(prev => prev ? { ...prev, caption: e.target.value } : null)}
                onFocus={() => { captionInputActive.current = true; }}
                onBlur={(e) => {
                  captionInputActive.current = false;
                  saveCaptionToNode(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Add a caption…"
                className="flex-1 border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      <div className="px-4 py-1.5 border-t bg-gray-50 text-xs text-gray-400 text-right select-none">
        {wordCount} words · {charCount} characters
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
        active ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
