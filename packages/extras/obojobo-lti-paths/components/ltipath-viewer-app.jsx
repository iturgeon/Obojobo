// require('./page-module.scss')
import React, { useState, useEffect } from 'react'
import PathContext from './context-path'
import Tree from './tree'

const NODE_TYPE_CONNECTOR = 'connector'
const NODE_TYPE_LAUNCH = 'launch'
const NODE_TYPE_FINISH = 'finish'
const iframeUrlFromState = (currentNode, pathId, userId) => {
	return `/lti-paths/${pathId}/${currentNode.id}/${userId}/tree`

	switch(currentNode.type){
		case NODE_TYPE_FINISH:
			return `/lti-paths/${pathId}/${currentNode.id}/${userId}/finish`

		default:
			return `/lti-paths/${pathId}/${currentNode.id}/${userId}/provider-launch`
	}
}

// const pathToStructure = path => {
// 	// create a id to object map of all the nodes
// 	const nodeMap = new Map()
// 	path.pathNodes.forEach(n => {nodeMap.set(n.id, n)})

// 	// create nextNodes on each object based on it's own next array
// 	path.pathNodes.forEach(n => {
// 		if(n.next){
// 			n.nextNodes = n.next.map(id => nodeMap.get(id))
// 		}
// 	})

// 	// return the startNode
// 	// with the now nested structure
// 	return nodeMap.get(path.startNodeId)
// }

const pathToStructure = path => {
	// create a id to object map of all the nodes
	const nodeTree = new Map()
	path.pathNodes.forEach(n => {
		nodeTree.set(n.id, {name: n.title, attribs: {type: n.type, settings: n.typeSettings}})
	})


	// create nextNodes on each object based on it's own next array
	path.pathNodes.forEach(n => {
		if(n.next){
			nodeTree.get(n.id).children = n.next.map(id => nodeTree.get(id))
		}
	})

	// return the startNode
	// with the now nested structure
	return nodeTree.get(path.startNodeId)
}

const LtiPathViewerApp = props => {
	const [status, setStatus] = useState({path: {pathNodes:[]}, state: {}, user: {}, node: {}, tree: {}})
	const [iframeUrl, setIframeUrl] = useState(null)
	const onClick = (data, event) => {
		console.log(data, event)
		if(data.attribs.type === NODE_TYPE_LAUNCH){
			setIframeUrl(`/lti-paths/${props.pathId}/${data.id}/${props.userId}/provider-launch`)
		}
	}
	useEffect(() => {


		// const interval = setTimeout(() => {
			fetch(`/lti-paths/${props.pathId}/${props.nodeId}/${props.userId}/status`)
				.then(res => res.json())
				.then(data => {
					const tree = pathToStructure(data.path)
					console.log(tree)
					data.tree = tree
					setStatus(data)
				})
				.catch(e => {
					console.error(e)
				})
		// }, 5000)
	}, [])


	return (
		<PathContext.Provider value={status} >
			<div id="header">
				<h1>LTI Paths</h1>
				<button>Previous</button>
				<button>Next</button>
			</div>

			<div id="contents">
				 <Tree onClick={onClick}/>
				 <iframe src={iframeUrl}></iframe>
			</div>

			<div id="footer">
				<button>Previous</button>
				<button>Next</button>
			</div>
		</PathContext.Provider>
	)
}

export default LtiPathViewerApp
