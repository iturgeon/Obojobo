// require('./page-module.scss')

import React, { useState, useEffect } from 'react'

const NODE_TYPE_CONNECTOR = 'connector'
const NODE_TYPE_LAUNCH = 'launch'
const NODE_TYPE_FINISH = 'finish'
const iframeUrlFromState = (currentNode, pathId, userId) => {
	switch(currentNode.type){
		case NODE_TYPE_FINISH:
			return `/lti-paths/${pathId}/${currentNode.id}/${userId}/finish`

		default:
			return `/lti-paths/${pathId}/${currentNode.id}/${userId}/provider-launch`
	}
}


const LtiPathViewerApp = props => {
	const [iframeUrl, setIframeUrl] = useState(null)
	useEffect(() => {
		const interval = setInterval(() => {
			fetch(`/lti-paths/${props.pathId}/${props.nodeId}/${props.userId}/status`)
				.then(res => res.json())
				.then(data => {
					console.log(data)
					setIframeUrl(iframeUrlFromState(data.node, props.pathId, props.userId))
				})
				.catch(e => {
					console.error(e)
				})
		}, 5000)
	}, [])

	return (
		<div>
			<div id="header">
				<h1>LTI Paths</h1>
				<button>Previous</button>
				<button>Next</button>
			</div>

			<div id="contents">
				<iframe src={iframeUrl}></iframe>
			</div>

			<div id="footer">
				<button>Previous</button>
				<button>Next</button>
			</div>
		</div>
	)
}

export default LtiPathViewerApp
