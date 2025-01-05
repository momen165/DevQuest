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
	Undo
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

import 'styles/CustomEditor.css';

// const LICENSE_KEY =
// 	'[REDACTED]';
	
	const LICENSE_KEY =
	'GPL';


const DEFAULT_CONFIG = {
	codeBlock: {
		languages: [
			{language: 'plaintext', label: 'Plain text'},
			{language: 'javascript', label: 'JavaScript'},
			{language: 'css', label: 'CSS'},
			{language: 'html', label: 'HTML'},
			{language: 'python', label: 'Python'},
			{language: 'java', label: 'Java'},
			{language: 'csharp', label: 'C#'},
			{language: 'php', label: 'PHP'},
			{language: 'ruby', label: 'Ruby'},
			{language: 'typescript', label: 'TypeScript'},
		
			{language: 'go', label: 'Go'},
			{language: 'swift', label: 'Swift'},
			{language: 'kotlin', label: 'Kotlin'},
			{language: 'rust', label: 'Rust'},
			{language: 'c', label: 'C'},
			{language: 'c++', label: 'C++'},
			{language: 'sql', label: 'SQL'},
			{language: 'bash', label: 'Bash'},
			{language: 'powershell', label: 'PowerShell'},
			{language: 'markdown', label: 'Markdown'}
		]
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
			'link',
			'insertTable',
			'highlight',
			'blockQuote',
			'codeBlock',
			'|',
			'alignment',
			'|',
			'outdent',
			'indent'
		],
		shouldNotGroupWhenFull: false
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
		Undo
	],
	fontFamily: {
		supportAllValues: true
	},
	fontSize: {
		options: [
			{
				title: '12px',
				model: '12px',
				view: {
					name: 'span',
					styles: { 'font-size': '12px' }
				}
			},
			{
				title: '14px',
				model: '14px',
				view: {
					name: 'span',
					styles: { 'font-size': '14px' }
				}
			},
			{
				title: '16px',
				model: '16px',
				view: {
					name: 'span',
					styles: { 'font-size': '16px' }
				}
			},
			{
				title: '18px',
				model: '18px',
				view: {
					name: 'span',
					styles: { 'font-size': '18px' }
				}
			},
			{
				title: '20px',
				model: '20px',
				view: {
					name: 'span',
					styles: { 'font-size': '20px' }
				}
			},
			{
				title: '24px',
				model: '24px',
				view: {
					name: 'span',
					styles: { 'font-size': '24px' }
				}
			},
			{
				title: '28px',
				model: '28px',
				view: {
					name: 'span',
					styles: { 'font-size': '28px' }
				}
			},
			{
				title: '32px',
				model: '32px',
				view: {
					name: 'span',
					styles: { 'font-size': '32px' }
				}
			}
			
		],
		supportAllValues: true
	},
	heading: {
		options: [
			{
				model: 'paragraph',
				title: 'Paragraph',
				class: 'ck-heading_paragraph'
			},
			{
				model: 'heading1',
				view: 'h1',
				title: 'Heading 1',
				class: 'ck-heading_heading1'
			},
			{
				model: 'heading2',
				view: 'h2',
				title: 'Heading 2',
				class: 'ck-heading_heading2'
			},
			{
				model: 'heading3',
				view: 'h3',
				title: 'Heading 3',
				class: 'ck-heading_heading3'
			},
			{
				model: 'heading4',
				view: 'h4',
				title: 'Heading 4',
				class: 'ck-heading_heading4'
			},
			{
				model: 'heading5',
				view: 'h5',
				title: 'Heading 5',
				class: 'ck-heading_heading5'
			},
			{
				model: 'heading6',
				view: 'h6',
				title: 'Heading 6',
				class: 'ck-heading_heading6'
			}
		]
	},
	htmlSupport: {
		allow: [
			{
				name: /.*/,
				attributes: true,
				classes: true,
				styles: {
					'font-size': true,
					// ... other styles
				}
			}
		]
	},
	initialData:
		'',

        licenseKey: LICENSE_KEY,
        link: {
            addTargetToExternalLinks: true,
            defaultProtocol: 'https://',
            decorators: {
                toggleDownloadable: {
                    mode: 'manual',
                    label: 'Downloadable',
                    attributes: {
                        download: 'file'
                    }
                }
            }
        },

	
	menuBar: {
		isVisible: true
	},
	placeholder: 'Type or paste your content here!',
	style: {
		definitions: [
			{
				name: 'Article category',
				element: 'h3',
				classes: ['editor-category']
			},
			{
				name: 'Title',
				element: 'h2',
				classes: ['editor-title']
			},
			{
				name: 'Subtitle',
				element: 'h3',
				classes: ['editor-subtitle']
			},
			{
				name: 'Info box',
				element: 'p',
				classes: ['editor-info-box']
			},
			{
				name: 'Side quote',
				element: 'blockquote',
				classes: ['editor-side-quote']
			},
			{
				name: 'Marker',
				element: 'span',
				classes: ['editor-marker']
			},
			{
				name: 'Spoiler',
				element: 'span',
				classes: ['editor-spoiler']
			},
			{
				name: 'Code (dark)',
				element: 'pre',
				classes: ['editor-code', 'editor-code--dark']
			},
			{
				name: 'Code (bright)',
				element: 'pre',
				classes: ['editor-code', 'editor-code--light']
			}
		]
	},
	table: {
		contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
	},
	output: {
		dataIndentChar: ' ',
		dataIndent: 2,
		presetStyles: true
	},
	generalhtmlsupport: {
		allow: [
			{
				name: /.*/,
				attributes: true,
				classes: true,
				styles: {
					'font-size': true
				}
			}
		]
	}
};

const CustomEditor = ({ 
	initialData = '', 
	config = {},
	onChange,
	className,
	disabled
}) => {
	const editorContainerRef = useRef(null);
	const editorRef = useRef(null);
	const [isLayoutReady, setIsLayoutReady] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		setIsLayoutReady(true);
		return () => setIsLayoutReady(false);
	}, []);

	const handleChange = (event, editor) => {
		const data = editor.getData();
		console.log('Editor data:', data);
		if (onChange) {
			onChange(data);
		}
	};

	const handleReady = (editor) => {
		editorRef.current = editor;
		editor.model.document.on('change:data', () => {
			const data = editor.getData();
			if (onChange) {
				onChange(data);
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
		disabled
	};

	return (
		<div className={`custom-editor ${className || ''}`}>
			<div className="main-container">
				<div 
					className="editor-container editor-container_classic-editor editor-container_include-style" 
					ref={editorContainerRef}
				>
					<div className="editor-container__editor">
						<div ref={editorRef}>
							{isLayoutReady && (
								<CKEditor
									editor={ClassicEditor}
									config={mergedConfig}
									onChange={handleChange}
									onReady={handleReady}
									onError={(error) => setError(error)}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CustomEditor;
