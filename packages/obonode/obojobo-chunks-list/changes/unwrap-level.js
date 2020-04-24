import { Editor, Transforms, Range } from 'slate'

const LIST_LINE_NODE = 'ObojoboDraft.Chunks.List.Line'
const LIST_NODE = 'ObojoboDraft.Chunks.List'

const unwrapLevel = (entry, editor, event) => {
	console.log("UN WRAP LEVEL")
	event.preventDefault()
	const [, nodePath] = entry
	const nodeRange = Editor.range(editor, nodePath)




	// // find the top level list node
	// const listNodes = Array.from(Editor.nodes(editor, {
	// 	mode: 'lowest',
	// 	match: node => node.type === LIST_NODE && !node.subtype
	// }))

	// const [listNode, listPath] = listNodes[0]
	// const indentDepth = nodePath.length - listPath.length - 3 // (minus 2 to account for zero index, the LIST and LEVEL wrapping the text)

	// console.log(listPath.join(','), nodePath.join(','))
	// console.log(Range.intersection(editor.selection, nodeRange))

	// if(indentDepth <= 1) return

	// @TODO: dont lift nodes out of the list!!!
	Transforms.liftNodes(editor, {
		at: Range.intersection(editor.selection, nodeRange),
		mode: 'lowest',
		match: child => child.subtype === LIST_LINE_NODE
	})
}

export default unwrapLevel
