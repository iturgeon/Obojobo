import '../../viewer-component.scss'

import React from 'react'

const Line = ({ element, children }) => {
	const attr = {}
	if (element.content && element.content.hangingIndent) {
		attr['data-hanging-indent'] = element.content.hangingIndent
	}

	return <li {...attr}>{children}</li>
}

export default Line
