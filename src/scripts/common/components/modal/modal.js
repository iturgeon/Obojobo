import './modal.scss'

import React from 'react'

import DeleteButton from '../../../common/components/delete-button'

export default class Modal extends React.Component {
	constructor() {
		super()
		this.boundKeyUp = this.onKeyUp.bind(this)
	}

	componentDidMount() {
		if (this.props.onClose) {
			return document.addEventListener('keyup', this.boundKeyUp)
		}
	}

	componentWillUnmount() {
		if (this.props.onClose) {
			return document.removeEventListener('keyup', this.boundKeyUp)
		}
	}

	onKeyUp(event) {
		if (event.keyCode === 27) {
			//ESC
			return this.props.onClose()
		}
	}

	onTabTrapFocus() {
		if (this.props.onClose) {
			return this.closeButton.focus()
		} else if (this.props.focusOnFirstElement) {
			return this.props.focusOnFirstElement()
		}
	}

	render() {
		return (
			<div
				className={
					'obojobo-draft--components--modal--modal' +
					(this.props.className ? ' ' + this.props.className : '')
				}
			>
				<input
					className="first-tab"
					ref={node => (this.firstTab = node)}
					type="text"
					onFocus={this.onTabTrapFocus.bind(this)}
				/>
				{this.props.onClose ? (
					<DeleteButton
						ref={component => (this.closeButton = component)}
						onClick={this.props.onClose}
					/>
				) : null}
				<div className="content">{this.props.children}</div>
				<input
					className="last-tab"
					ref={node => (this.lastTab = node)}
					type="text"
					onFocus={this.onTabTrapFocus.bind(this)}
				/>
			</div>
		)
	}
}
