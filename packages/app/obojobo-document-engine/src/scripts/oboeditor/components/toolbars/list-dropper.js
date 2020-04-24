	import './list-dropper.scss'

import React from 'react'
import { Editor, Element, Transforms, Range } from 'slate'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'
import OrderedListIcon from '../../assets/ordered-list-icon'
import UnorderedListIcon from '../../assets/unordered-list-icon'

const LIST_NODE = 'ObojoboDraft.Chunks.List'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const LIST_LEVEL_NODE = 'ObojoboDraft.Chunks.List.Level'
const LIST_LINE_NODE = 'ObojoboDraft.Chunks.List.Line'

class ListDropper extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			isOpen: false,
			currentFocus: 0
		}

		this.timeOutId = null
		this.menu = []
		this.toggleDropDown = this.toggleDropDown.bind(this)
		this.onBlurHandler = this.onBlurHandler.bind(this)
		this.onFocusHandler = this.onFocusHandler.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.menuButton = React.createRef()
		this.toggleBullet = this.toggleBullet.bind(this)
	}

	componentDidUpdate() {
		// When the menu is open, focus on the current dropdown item
		if (this.state.isOpen) {
			this.menu = this.menu.filter(Boolean)
			this.menu[this.state.currentFocus].focus()
		}
	}

	// The timeout gives the blur time to check for child focus
	onBlurHandler() {
		this.timeOutId = setTimeout(() => {
			this.setState({
				isOpen: false
			})
		})
	}

	// If we focused on a child, don't close the sub-menu
	onFocusHandler() {
		clearTimeout(this.timeOutId)
	}

	onKeyDown(event) {
		this.menu = this.menu.filter(Boolean)
		if (this.state.isOpen) event.stopPropagation()

		switch (event.key) {
			// Open the menu and set the first item as the current focus
			case 'ArrowRight':
				this.setState({ isOpen: true, currentFocus: 0 })
				event.stopPropagation()
				break

			// Close the menu and return focus to the link item
			case 'ArrowLeft':
				this.setState({ isOpen: false })
				this.menuButton.current.focus()
				break

			// Move down through the submenu
			case 'ArrowDown':
				this.setState(currentState => ({
					currentFocus: (currentState.currentFocus + 1) % this.menu.length
				}))
				break

			// Move up through the submenu
			case 'ArrowUp':
				this.setState(currentState => ({
					currentFocus: (currentState.currentFocus + this.menu.length - 1) % this.menu.length
				}))
				break
		}
	}

	toggleDropDown() {
		this.setState(state => {
			return { isOpen: !state.isOpen }
		})
	}

	// turn all selected nodes into a list
	// set the type and bullet style at the same time
	changeBullet(bulletStyle) {
		this.props.editor.changeToType(LIST_NODE, { type: this.props.type, bulletStyle })
	}

	toggleBullet() {
		// collect all the chunks in the selection
		const nodes = Array.from(Editor.nodes(this.props.editor, {
			mode: 'lowest',
			match: node => Element.isElement(node) && !this.props.editor.isInline(node) && !node.subtype
		}))

		let areAllLists = true
		let areAllSameType = true

		nodes.forEach(([block]) => {
			areAllLists = areAllLists && block.type === LIST_NODE
			areAllSameType = areAllSameType && block.content.listStyles && block.content.listStyles.type === this.props.type
		})

		if (areAllLists && areAllSameType) {
			// everything is already a list - convert it back to text
			this.props.editor.changeToType(TEXT_NODE)
		} else {
			// if they are not all lists, do what changeBullet does
			this.changeBullet(this.props.defaultStyle)
		}

	}

	render() {
		return (
			<div
				className={'list-dropper'}
				contentEditable={false}
				onBlur={this.onBlurHandler}
				onFocus={this.onFocusHandler}
				onKeyDown={this.onKeyDown}>
				<button
					className="icon"
					onClick={this.toggleBullet}
					ref={this.menuButton}
					aria-label={this.props.type + ' list'}>
					{this.props.type === 'ordered' ? <OrderedListIcon /> : <UnorderedListIcon />}
				</button>
				<button
					className={'dropdown ' + isOrNot(this.state.isOpen, 'open')}
					onClick={this.toggleDropDown}
					ref={this.menuButton}
					aria-label={'Open ' + this.props.type + ' list type menu'}>
					{'⌃'}
				</button>
				<div className={'list-dropper-menu ' + isOrNot(this.state.isOpen, 'open')}>
					{this.props.bullets.map(bullet => (
						<button
							key={bullet.bulletStyle}
							onClick={this.changeBullet.bind(this, bullet.bulletStyle)}
							ref={item => {
								this.menu.push(item)
							}}>
							{bullet.display}
						</button>
					))}
				</div>
			</div>
		)
	}
}

export default ListDropper
