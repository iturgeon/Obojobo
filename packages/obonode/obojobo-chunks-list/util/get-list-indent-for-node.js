import { Editor } from 'slate'
import ListStyles from '../list-styles'

const LIST_NODE = 'ObojoboDraft.Chunks.List'

const bulletToUse = type => {
	const bulletList =
		type === ListStyles.TYPE_UNORDERED
			? ListStyles.UNORDERED_LIST_BULLETS
			: ListStyles.ORDERED_LIST_BULLETS

	// @TODO look up tree to determine which bullet to use
	// const indexOfNextStyle = (bulletList.indexOf(parent.content.bulletStyle) + 1) % bulletList.length
	const bulletStyle = bulletList[0]
}

const getListIndentForNode = (node, path) => {

	// find the top level list node
	const listNodes = Array.from(Editor.nodes(editor, {
		mode: 'lowest',
		match: node => node.type === LIST_NODE && !node.subtype
	}))

	const [listNode, listPath] = listNodes[0]
	const indentDepth = path.length - listPath.length - 3 // (minus 2 to account for zero index, the LIST and LEVEL wrapping the text)
	const listIndent = listNode.content.listStyles.indents[indentDepth]

	if (node.content.type !== listIndent.type || node.content.bulletStyle !== listIndent.bulletStyle){
		if(!listIndent.bulletStyle){
			listIndent.bulletStyle = bulletToUse(listIndent.type)
		}
		return listIndent
	}

	const bulletStyle = bulletToUse(listIndent.type)

	return {
		type: ListStyles.TYPE_UNORDERED,
		bulletStyle: bulletStyle
	}
}

export default getListIndentForNode
