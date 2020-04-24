import '../../viewer-component.scss'

import React from 'react'

const Level = ({element, children}) => {
	const List = element.content.type === 'unordered' ? 'ul' : 'ol'
	const listStyle = {
		listStyleType: element.content.bulletStyle
	}

	return (
		<List style={listStyle} data-type="Level">
			{children}
		</List>
	)

	// return (
	// 	<li style={{'list-style': 'none'}}>
	// 		<List style={listStyle}>
	// 			{children}
	// 		</List>
	// 	</li>
	// )
}

export default Level
