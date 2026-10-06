'use client';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image as TiptapImage } from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useState, useRef } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import api from '@/lib/api';

// Custom Image extension with align + width attributes
const CustomImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        renderHTML: (a) => ({ 'data-align': a.align }),
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-align') || 'center',
      },
      width: {
        default: '100%',
        renderHTML: (a) => ({ style: `width:${a.width}` }),
        parseHTML: (el) => (el as HTMLElement).style.width || '100%',
      },
    };
  },
});

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your article…' }: Props) {
  const [imageToolbar, setImageToolbar] = useState<{ top: number; left: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({ link: false }),
      CustomImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onSelectionUpdate({ editor }) {
      const { node } = editor.state.selection as any;
      if (node?.type.name === 'image') {
        const dom = editor.view.nodeDOM(editor.state.selection.from) as HTMLElement;
        if (dom && editorRef.current) {
          const er = editorRef.current.getBoundingClientRect();
          const dr = dom.getBoundingClientRect();
          setImageToolbar({ top: dr.top - er.top - 40, left: dr.left - er.left });
        }
      } else {
        setImageToolbar(null);
      }
    },
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none' },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  const uploadImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      const form = new FormData();
      form.append('image', file);
      try {
        const { data } = await api.post('/articles/upload-image/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        editor.chain().focus().setImage({ src: data.url, align: 'center', width: '100%' } as any).run();
      } catch {
        alert('Image upload failed.');
      }
    };
    input.click();
  }, [editor]);

  const setLink = useCallback(() => {
    const url = window.prompt('URL');
    if (!url || !editor) return;
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const setImageAttr = useCallback((attr: Record<string, string>) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('image', attr).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border rounded overflow-hidden bg-white">
      {/* Main toolbar */}
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b bg-gray-50 text-sm">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">B</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><em>I</em></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">H2</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3">H3</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">1. List</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">"</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code">{'</>'}</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Link">🔗</ToolBtn>
        <ToolBtn onClick={uploadImage} active={false} title="Image">🖼</ToolBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">↩</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">↪</ToolBtn>
      </div>

      {/* Editor area with image toolbar */}
      <div ref={editorRef} className="relative">
        {imageToolbar && (
          <div
            className="absolute z-10 flex gap-1 bg-white border rounded shadow-md px-2 py-1 text-xs"
            style={{ top: imageToolbar.top, left: imageToolbar.left }}
          >
            <span className="text-gray-400 self-center mr-1">Align:</span>
            <ToolBtn onClick={() => setImageAttr({ align: 'left' })} active={false} title="Float left">◀ Left</ToolBtn>
            <ToolBtn onClick={() => setImageAttr({ align: 'center' })} active={false} title="Center">Center</ToolBtn>
            <ToolBtn onClick={() => setImageAttr({ align: 'right' })} active={false} title="Float right">Right ▶</ToolBtn>
            <div className="w-px bg-gray-300 mx-1" />
            <span className="text-gray-400 self-center mr-1">Size:</span>
            <ToolBtn onClick={() => setImageAttr({ width: '25%' })} active={false} title="25%">25%</ToolBtn>
            <ToolBtn onClick={() => setImageAttr({ width: '50%' })} active={false} title="50%">50%</ToolBtn>
            <ToolBtn onClick={() => setImageAttr({ width: '75%' })} active={false} title="75%">75%</ToolBtn>
            <ToolBtn onClick={() => setImageAttr({ width: '100%' })} active={false} title="100%">100%</ToolBtn>
          </div>
        )}
        <EditorContent editor={editor} />
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
