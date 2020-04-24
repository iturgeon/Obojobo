import { Editor, Transforms, Range } from 'slate'
import ListStyles from '../list-styles'
import getListIndentForNode from '../util/get-list-indent-for-node'

const LIST_NODE = 'ObojoboDraft.Chunks.List'
const LIST_LEVEL_NODE = 'ObojoboDraft.Chunks.List.Level'
const LIST_LINE_NODE = 'ObojoboDraft.Chunks.List.Line'

const wrapLevel = (entry, editor, event) => {
	console.log("WRAP LEVEL")
	event.preventDefault()
	const [node, nodePath] = entry
	const nodeRange = Editor.range(editor, nodePath)

	const list = Array.from(
		Editor.nodes(editor, {
			at: Range.intersection(editor.selection, nodeRange),
			mode: 'lowest',
			match: child => child.subtype === LIST_LINE_NODE
		})
	)

	// Normalization will merge consecutive ListLevels into a single node,
	// which can change the paths of subsequent ListLines. To keep the paths consistant,
	// prevent normalization until all Lines have been indented
	Editor.withoutNormalizing(editor, () => {
		for (const [, path] of list) {
			// Do not allow indenting past 20 (18 levels), because it will cause display errors
			if (path.length >= 20) continue

			const [parent] = Editor.parent(editor, path)

			const bulletList =
				parent.content.type === ListStyles.TYPE_UNORDERED
					? ListStyles.UNORDERED_LIST_BULLETS
					: ListStyles.ORDERED_LIST_BULLETS
			const indexOfNextStyle = (bulletList.indexOf(parent.content.bulletStyle) + 1) % bulletList.length
			const bulletStyle = bulletList[indexOfNextStyle]

			const content = getListIndentForNode(node, nodePath)
			console.log('xXxXxXxXxXx WRAP LEVEL SET CONTENT')
			console.log(content)
			Transforms.wrapNodes(
				editor,
				{
					type: LIST_NODE,
					subtype: LIST_LEVEL_NODE,
					content
				},
				{
					at: path
				}
			)
		}
	})
}

export default wrapLevel
