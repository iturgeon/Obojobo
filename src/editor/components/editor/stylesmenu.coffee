React = require 'react'


MARGIN = 10
WIDTH = 30
HEIGHT = 30

StylesMenu = React.createClass
	getInitialState: ->
		styles: {}
		styleBrush: {}

	componentWillReceiveProps: (nextProps) ->
		@setState {
			styles: nextProps.selection.styles
			styleBrush: nextProps.styleBrush
		}

	render: ->
		React.createElement 'div', {
			style: {
				position: 'fixed'
				left: '0'
				top: '0'
				background: 'white'
				border: '1px solid black'
			}
		}, Object.keys(@state.styles) + '|' + Object.keys(@state.styleBrush)


module.exports = StylesMenu