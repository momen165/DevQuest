import { useState, useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  AccessibilityHelp,
  Alignment,
  Autoformat,
  AutoLink,
  Autosave,
  BlockQuote,
  Bold,
  Code,
  CodeBlock,
  Essentials,
  FindAndReplace,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  Highlight,
  HorizontalLine,
  Indent,
  IndentBlock,
  Italic,
  Link,
  Paragraph,
  RemoveFormat,
  SelectAll,
  ShowBlocks,
  SpecialCharacters,
  SpecialCharactersArrows,
  SpecialCharactersCurrency,
  SpecialCharactersEssentials,
  SpecialCharactersLatin,
  SpecialCharactersMathematical,
  SpecialCharactersText,
  Strikethrough,
  Style,
  Subscript,
  Superscript,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TextTransformation,
  Underline,
  Undo,
  Image,
  ImageUpload,
  ImageToolbar,
  ImageStyle,
  ImageResizeEditing,
  ImageResizeButtons,
  List,
  type EditorConfig
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

import '@/styles/CustomEditor.css';

import { useAuth } from '@/contexts/AuthContext';
import { FaQuestionCircle } from 'react-icons/fa';

const LICENSE_KEY = 'GPL';

const DEFAULT_CONFIG: EditorConfig = {
  codeBlock: {
    languages: [
      { language: 'plaintext', label: 'Plain text' },
      { language: 'javascript', label: 'JavaScript' },
      { language: 'css', label: 'CSS' },
      { language: 'html', label: 'HTML' },
      { language: 'python', label: 'Python' },
      { language: 'java', label: 'Java' },
      { language: 'csharp', label: 'C#' },
      { language: 'php', label: 'PHP' },
      { language: 'ruby', label: 'Ruby' },
      { language: 'typescript', label: 'TypeScript' },

      { language: 'go', label: 'Go' },
      { language: 'swift', label: 'Swift' },
      { language: 'kotlin', label: 'Kotlin' },
      { language: 'rust', label: 'Rust' },
      { language: 'c', label: 'C' },
      { language: 'c++', label: 'C++' },
      { language: 'sql', label: 'SQL' },
      { language: 'bash', label: 'Bash' },
      { language: 'powershell', label: 'PowerShell' },
      { language: 'markdown', label: 'Markdown' },
    ],
  },
  toolbar: {
    items: [
      'undo',
      'redo',
      '|',
      'showBlocks',
      '|',
      'heading',
      'style',
      '|',
      'fontSize',
      'fontFamily',
      'fontColor',
      'fontBackgroundColor',
      '|',
      'bold',
      'italic',
      'underline',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'link',
      'insertTable',
      'highlight',
      'blockQuote',
      'codeBlock',
      '|',
      'alignment',
      '|',
      'outdent',
      'indent',
      'uploadImage',
      '|',
    ],
    shouldNotGroupWhenFull: false,
  },
  plugins: [
    AccessibilityHelp,
    Alignment,
    Autoformat,
    AutoLink,
    Autosave,
    BlockQuote,
    Bold,
    Code,
    CodeBlock,
    Essentials,
    FindAndReplace,
    FontBackgroundColor,
    FontColor,
    FontFamily,
    FontSize,
    GeneralHtmlSupport,
    Heading,
    Highlight,
    HorizontalLine,
    Indent,
    IndentBlock,
    Italic,
    Link,
    Paragraph,
    RemoveFormat,
    SelectAll,
    ShowBlocks,
    SpecialCharacters,
    SpecialCharactersArrows,
    SpecialCharactersCurrency,
    SpecialCharactersEssentials,
    SpecialCharactersLatin,
    SpecialCharactersMathematical,
    SpecialCharactersText,
    Strikethrough,
    Style,
    Subscript,
    Superscript,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    Underline,
    Undo,
    Image,
    ImageUpload,
    ImageToolbar,
    ImageStyle,
    ImageResizeEditing,
    ImageResizeButtons,
    List,
  ],
  fontFamily: {
    options: [
      'Source Sans Pro, sans-serif',
      'Nunito Sans, sans-serif',
      'Inter, sans-serif',
      'Lato, sans-serif',
      'Open Sans, sans-serif',
      'Roboto, sans-serif',
    ],
    supportAllValues: true,
  },
  fontSize: {
    options: [
      {
        title: '12px',
        model: '12px',
        view: {
          name: 'span',
          styles: { 'font-size': '12px' },
        },
      },
      {
        title: '14px',
        model: '14px',
        view: {
          name: 'span',
          styles: { 'font-size': '14px' },
        },
      },
      {
        title: '16px',
        model: '16px',
        view: {
          name: 'span',
          styles: { 'font-size': '16px' },
        },
      },
      {
        title: '18px',
        model: '18px',
        view: {
          name: 'span',
          styles: { 'font-size': '18px' },
        },
      },
      {
        title: '20px',
        model: '20px',
        view: {
          name: 'span',
          styles: { 'font-size': '20px' },
        },
      },
      {
        title: '24px',
        model: '24px',
        view: {
          name: 'span',
          styles: { 'font-size': '24px' },
        },
      },
      {
        title: '28px',
        model: '28px',
        view: {
          name: 'span',
          styles: { 'font-size': '28px' },
        },
      },
      {
        title: '32px',
        model: '32px',
        view: {
          name: 'span',
          styles: { 'font-size': '32px' },
        },
      },
    ],
    supportAllValues: true,
  },
  heading: {
    options: [
      {
        model: 'paragraph',
        title: 'Paragraph',
        class: 'ck-heading_paragraph',
      },
      {
        model: 'heading1',
        view: {
          name: 'h1',

        },
        title: 'Heading 1',
        class: 'ck-heading_heading1',
      },
      {
        model: 'heading2',
        view: {
          name: 'h2',

        },
        title: 'Heading 2',
        class: 'ck-heading_heading2',
      },
      {
        model: 'heading3',
        view: {
          name: 'h3',
          classes: ['editor-subtitle'],
        },
        title: 'Heading 3',
        class: 'ck-heading_heading3',
      },
    ],
  },
  htmlSupport: {
    allow: [
      {
        name: /.*/,
        attributes: true,
        classes: [
          'editor-font-nunito',
          'editor-font-inter',
          'editor-font-source',
          'editor-font-lato',
          'editor-font-opensans',
          'editor-font-roboto',
        ],
        styles: {
          'font-family': true,
          'font-size': true,
          // ... other styles
        },
      },
    ],
  },
  initialData: '',

  licenseKey: LICENSE_KEY,
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: 'https://',
    decorators: {
      toggleDownloadable: {
        mode: 'manual',
        label: 'Downloadable',
        attributes: {
          download: 'file',
        },
      },
    },
  },

  menuBar: {
    isVisible: true,
  },
  placeholder: 'Type or paste your content here!',
  style: {
    definitions: [
      {
        name: 'Article category',
        element: 'h3',
        classes: ['editor-category'],
      },
      {
        name: 'Title',
        element: 'h2',
        classes: ['editor-title'],
      },
      {
        name: 'Subtitle',
        element: 'h3',
        classes: ['editor-subtitle'],
      },
      {
        name: 'Info box',
        element: 'p',
        classes: ['editor-info-box'],
      },
      {
        name: 'Side quote',
        element: 'blockquote',
        classes: ['editor-side-quote'],
      },
      {
        name: 'Marker',
        element: 'span',
        classes: ['editor-marker'],
      },
      {
        name: 'Spoiler',
        element: 'span',
        classes: ['editor-spoiler'],
      },
      {
        name: 'Code (dark)',
        element: 'pre',
        classes: ['editor-code', 'editor-code--dark'],
      },
      {
        name: 'Code (bright)',
        element: 'pre',
        classes: ['editor-code', 'editor-code--light'],
      },
    ],
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableProperties',
      'tableCellProperties',
    ],
  },
  image: {
    toolbar: [
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side',
      '|',
      'toggleImageCaption',
      'imageTextAlternative',
      '|',
      'resizeImage',
    ],
    upload: {
      types: ['jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg'],
    },
    resizeOptions: [
      {
        name: 'resizeImage:original',
        value: null,
        label: 'Original',
      },
      {
        name: 'resizeImage:50',
        value: '50',
        label: '50%',
      },
      {
        name: 'resizeImage:75',
        value: '75',
        label: '75%',
      },
    ],
    styles: ['full', 'side', 'alignLeft', 'alignCenter', 'alignRight'],
  },
};

interface CustomEditorProps {
  initialData?: string;
  config?: EditorConfig;
  onChange?: (data: string) => void;
  className?: string;
  disabled?: boolean;
}

const CustomEditor: React.FC<CustomEditorProps> = ({ initialData = '', config = {}, onChange, className, disabled }) => {
  const { user } = useAuth();
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLayoutReady(true);
    return () => setIsLayoutReady(false);
  }, []);

  const handleChange = (event: any, editor: any) => {
    const data = editor.getData();

    if (onChange) {
      const cleanedData = cleanEmptyParagraphs(data);
      onChange(cleanedData);
    }
  };

  const cleanEmptyParagraphs = (html: string) => {
    if (!html) return html;

    const cleaned = html
      .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, '')
      .replace(/<p><span>(\s|&nbsp;)*<\/span><\/p>/g, '')
      .replace(/<p[^>]*>\s*<\/p>/g, '');

    return cleaned;
  };

  const handleReady = (editor: any) => {
    editorRef.current = editor;

    // Set up custom keystroke handlers
    // Note: Keystrokes handling might need adjustment based on specific CKEditor 5 version/API
    // For now, simplified or omitted if complex

    editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
      return new ImageUploadAdapter(loader, user?.token);
    };

    editor.model.document.on('change:data', () => {
      const data = editor.getData();
      if (onChange) {
        const cleanedData = cleanEmptyParagraphs(data);
        onChange(cleanedData);
      }
    });
  };

  if (error) {
    return <div className="editor-error">Error: {error.message}</div>;
  }

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    initialData: initialData || DEFAULT_CONFIG.initialData,
    
  };

  return (
    <div className={`custom-editor ${className || ''}`}>
      <div className="main-container">
        <div
          className="editor-container editor-container_classic-editor editor-container_include-style"
          ref={editorContainerRef}
        >
          <div className="editor-container__editor">
            <div className="editor-help-tooltip">
              <FaQuestionCircle className="help-icon" />
              <div className="tooltip-content">
                <h4>Keyboard Shortcuts</h4>
                <ul>
                  <li>
                    <kbd>Ctrl + Alt + I</kbd> Insert Image
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + J</kbd> JavaScript Code Block
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + P</kbd> Python Code Block
                  </li>
                  <li>
                    <kbd>Ctrl + Alt + H</kbd> HTML Code Block
                  </li>
                </ul>
              </div>
            </div>
            <div ref={editorRef}>
              {isLayoutReady && (
                <CKEditor
                  editor={ClassicEditor}
                  config={mergedConfig}
                  onChange={handleChange}
                  onReady={handleReady}
                  onError={(error: any) => setError(error)}
                  disabled={disabled}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

class ImageUploadAdapter {
  loader: any;
  token: string | undefined;

  constructor(loader: any, token: string | undefined) {
    this.loader = loader;
    this.token = token;
  }

  async upload() {
    try {
      const file = await this.loader.file;
      const formData = new FormData();
      formData.append('file', file);

      if (!this.token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/editor`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return {
        default: data.fileUrl,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  abort() {
    // Abort upload if needed
  }
}

export default CustomEditor;
