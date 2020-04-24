import { Editor, Element, Transforms, Range } from 'slate'
import { ReactEditor } from 'slate-react'

import IndentIcon from '../../assets/indent-icon'
import UnindentIcon from '../../assets/unindent-icon'
import HangingIndentIcon from '../../assets/hanging-indent-icon'
import toggleHangingIndent from 'obojobo-chunks-text/util/toggle-hanging-indent'

const INDENT = 'indent'
const UNINDENT = 'unindent'
const HANGING_INDENT = 'hanging-indent'

const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'
const CODE_NODE = 'ObojoboDraft.Chunks.Code'
const CODE_LINE_NODE = 'ObojoboDraft.Chunks.Code.CodeLine'
const LIST_NODE = 'ObojoboDraft.Chunks.List'
const LIST_LINE_NODE = 'ObojoboDraft.Chunks.List.Line'
const LIST_LEVEL_NODE = 'ObojoboDraft.Chunks.List.Level'

// These values are also defined in obojobo-chinks-list/list-styles
const unorderedBullets = ['disc', 'circle', 'square']
const orderedBullets = ['decimal', 'lower-alpha', 'lower-roman', 'upper-alpha', 'upper-roman']

const locationOfSelectionChildren = (editor, path) => {
	const nodeRange = Editor.range(editor, path)
	return Range.intersection(editor.selection, nodeRange)
}

const getNodes = (editor, path, subType, mode = 'all') => {
	// Get only the Element children of the current node that are in the current selection
	return Editor.nodes(editor, {
		at: locationOfSelectionChildren(editor, path),
		match: child => child.subtype === subType,
		mode
	})
}

const setNodeIndent = (editor, node, path, indent) => {
	Transforms.setNodes(
		editor,
		{ content: {...node.content, indent: indent} },
		{ at: path }
	)
}

const AlignMarks = {
	plugins: {
		commands: {
			indentText(editor, [, path]) {
				const nodes = getNodes(editor, path, TEXT_LINE_NODE)

				// For each child in the selection, increment the indent without letting it get above 20
				for(const [child, path] of nodes){
					setNodeIndent(editor, child, path, Math.min(child.content.indent + 1, 20))
				}
			},
			indentCode(editor, [, path]) {
				const nodes = getNodes(editor, path, CODE_LINE_NODE)

				// For each child in the selection, increment the indent without letting it get above 20
				for(const [child, path] of nodes){
					setNodeIndent(editor, child, path, Math.min(child.content.indent + 1, 20))
				}
			},
			indentList(editor, [, path]) {
				const nodes = getNodes(editor, path, LIST_LINE_NODE, 'lowest')

				// Normalization will merge consecutive ListLevels into a single node,
				// which can change the paths of subsequent ListLines. To keep the paths consistant,
				// prevent normalization until all Lines have been indented
				Editor.withoutNormalizing(editor, () => {
					for(const [, path] of nodes) {
						const [parent,] = Editor.parent(editor, path)

						const bulletList =
						parent.content.type === 'unordered' ? unorderedBullets : orderedBullets
						const bulletStyle = bulletList[(bulletList.indexOf(parent.content.bulletStyle) + 1) % bulletList.length]

						Transforms.wrapNodes(
							editor,
							{
								type: LIST_NODE,
								subtype: LIST_LEVEL_NODE,
								content: { type: parent.content.type, bulletStyle }
							},
							{
								at: path,
							}
						)
					}
				})
			},
			unindentText(editor, [, path]) {
				const nodes = getNodes(editor, path, TEXT_LINE_NODE)

				// For each child in the selection, decrement the indent without letting it drop below 0
				for(const [child, path] of nodes){
					setNodeIndent(editor, child, path, Math.max(child.content.indent - 1, 0))
				}
			},
			unindentCode(editor, [, path]) {
				const nodes = getNodes(editor, path, CODE_LINE_NODE)

				// For each child in the selection, decrement the indent without letting it drop below 0
				for(const [child, path] of nodes){
					setNodeIndent(editor, child, path, Math.max(child.content.indent - 1, 0))
				}
			},
			unindentList(editor, [, path]) {
				Transforms.liftNodes(editor, {
					at: locationOfSelectionChildren(editor, path),
					match: child => child.subtype === LIST_LINE_NODE,
					mode: 'lowest'
				})
			}
		}
	},
	marks: [
		{
			name: 'Indent',
			type: INDENT,
			icon: IndentIcon,
			action: editor => {
				const list = Editor.nodes(editor, {
					mode: 'lowest',
					match: node => Element.isElement(node) && !editor.isInline(node) && !node.subtype
				})

				// create a fast hashtable to look up which editor function to call based on node type
				const fnMap = {
					[CODE_NODE]: editor.indentCode,
					[LIST_NODE]: editor.indentList,
					[TEXT_NODE]: editor.indentText
				}

				for(const [child] of list){
					const editorFn = fnMap[child.type]
					if(editorFn) editorFn(child)
				}

				ReactEditor.focus(editor)
			}
		},
		{
			name: 'Unindent',
			type: UNINDENT,
			icon: UnindentIcon,
			action: editor => {
				Editor.withoutNormalizing(editor, () => {
					const list = Editor.nodes(editor, {
						mode: 'lowest',
						match: node => Element.isElement(node) && !editor.isInline(node) && !node.subtype
					})

					// create a fast hashtable to look up which editor function to call based on node type
					const fnMap = {
						[CODE_NODE]: editor.unindentCode,
						[LIST_NODE]: editor.unindentList,
						[TEXT_NODE]: editor.unindentText
					}

					// call function for each nodeZ
					for(const [child] of list){
						const editorFn = fnMap[child.type]
						if(editorFn) editorFn(child)
					}

				})

				ReactEditor.focus(editor)
			}
		},
		{
			name: 'Hanging Indent',
			type: HANGING_INDENT,
			icon: HangingIndentIcon,
			action: editor => {
				const list = Editor.nodes(editor, {
					mode: 'lowest',
					match: node => Element.isElement(node) && !editor.isInline(node) && !node.subtype
				})

				for(const entry of list){
					toggleHangingIndent(entry, editor)
				}
			}
		}
	]
}

export default AlignMarks
