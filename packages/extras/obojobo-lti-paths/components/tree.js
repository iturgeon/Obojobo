import React, { useState, useEffect } from 'react'
import PathContext from './context-path'

import {Tree as Treee} from 'react-d3-tree';

const NODE_TYPE_CONNECTOR = 'connector'
const NODE_TYPE_LAUNCH = 'launch'
const NODE_TYPE_FINISH = 'finish'


const Node = ({tree}) => {
	if(!tree.id) return <div>No Tree found</div>
	return <div data-id={tree.id}>
		<div>{tree.title}</div>
		<div>{tree.type}</div>
		<div>{tree.typeSettings.fn}</div>
	</div>
}

const Tree = props =>
	<PathContext.Consumer>
		{({node, path, state, user, tree}) => (
			<div style={{width: '100vw', height: '80vh'}}>
				<Treee orientation='vertical' translate={{x: 500, y: 30}} onClick={props.onClick} data={tree}/>
			</div>
		)}
	</PathContext.Consumer>

export default Tree
