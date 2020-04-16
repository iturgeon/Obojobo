import React from 'react'
import Common from 'obojobo-document-engine/src/scripts/common'

import ClipboardUtil from '../../util/clipboard-util'
import APIUtil from '../../../viewer/util/api-util'
import { downloadDocument } from '../../../common/util/download-document'

import DropDownMenu from './drop-down-menu'

const { Prompt } = Common.components.modal
const { Dialog } = Common.components.modal
const { ModalUtil } = Common.util

class FileMenu extends React.PureComponent {

	openDraftInTab(draftId) {
		window.open(`${window.location.origin}/editor/visual/${draftId}`, '_blank')
	}

	closeWindow(){
		window.close()
	}

	displayNewDraftErrorDialog(){
		const dialogProps = {
			title: 'Error Creating Module',
			children: 'The request to create a new module failed.',
			buttons: [
				{
					value: 'Close',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Try Again',
					default: true,
					onClick: this.createNewDraft.bind(this),
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayDeleteCompleteDialog(){
		const dialogProps = {
			title: 'Deletion Complete',
			children: 'This module has succesfully been deleted.',
			buttons: [
				{
					value: 'Close',
					default: true,
					onClick: this.closeWindow
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayDeleteErrorDialog(draftId){
		const dialogProps = {
			title: 'Error Deleting',
			children: 'The delete request failed.',
			buttons: [
				{
					value: 'Close',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Open in New Tab',
					default: true,
					onClick: () => {this.openDraftInTab(draftId)},
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayCopyInProgressDialog(newTitle){
		console.log('prog')
		const dialogProps = {
			title: 'Copy Module',
			preventEsc: true,
			children: `Copying module to "${newTitle}"`,
			buttons: []
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayCopyCompleteDialog(draftId){
		const dialogProps = {
			title: 'Copy Complete',
			children: 'Would you like to edit the copy now?',
			buttons: [
				{
					value: 'Close',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Open in New Tab',
					default: true,
					onClick: () => {this.openDraftInTab(draftId)},
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayCopyErrorDialog(newTitle){
		const dialogProps = {
			title: 'Error',
			children: 'The copy request failed.',
			buttons: [
				{
					value: 'Cancel',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Try Again',
					default: true,
					onClick: () => {this.copyModule(newTitle)},
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayFileImportDialog(){
		const dialogProps = {
			title: 'Import From File',
			preventEsc: true,
			children: `Importing replaces the contents of this module. Continue?`,
			buttons: [
				{
					value: 'Cancel',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Yes - Choose file...',
					default: true,
					onClick: this.buildFileSelector.bind(this),
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayDeleteDialog(){
		const dialogProps = {
			title: 'Delete Module',
			children: 'Deleting is permanent, continue?',
			buttons: [
				{
					value: 'Cancel',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Delete Now',
					isDangerous: true,
					default: true,
					onClick: this.deleteModule.bind(this),
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	displayCopyPrompt(title){
		ModalUtil.show(
			<Prompt
				title="Copy Module"
				message="Enter the title for the copied module:"
				value={title + ' - Copy'}
				onConfirm={newTitle => this.copyModule(newTitle)}
			/>
		)
	}

	displayUploadError(id, content, type){
		const dialogProps = {
			title: 'Error Uploading Module',
			children: 'The upload request failed.',
			buttons: [
				{
					value: 'Cancel',
					altAction: true,
					onClick: ModalUtil.hide
				},
				{
					value: 'Try Again',
					default: true,
					onClick: this.processFileContent.bind(this, id, content, type),
				}
			]
		}

		ModalUtil.show(<Dialog {...dialogProps} />)
	}

	createNewDraft(){
		return APIUtil.createNewDraft()
			.then(APIUtil.failOnError)
			.then(result => {this.openDraftInTab(result.value.id)})
			.catch(() => {this.displayNewDraftErrorDialog()})
	}

	deleteModule() {
		ModalUtil.hide()
		return APIUtil.deleteDraft(this.props.draftId)
			.then(APIUtil.failOnError)
			.then(this.displayDeleteCompleteDialog.bind(this))
			.catch(() => {this.displayDeleteErrorDialog(this.props.draftId)})
	}

	copyModule(newTitle) {
		console.log('COPY')
		ModalUtil.hide()
		this.displayCopyInProgressDialog(newTitle)

		return APIUtil.copyDraft(this.props.draftId, newTitle)
			.then(APIUtil.failOnError)
			.then(result => {
				ModalUtil.hide()
				this.displayCopyCompleteDialog(result.value.draftId)
			})
			.catch(() => {
				ModalUtil.hide()
				this.displayCopyErrorDialog(newTitle)
			})
	}

	processFileContent(id, content, type) {
		return APIUtil.postDraft(
			id,
			content,
			type === 'application/json' ? 'application/json' : 'text/plain'
		).then(APIUtil.failOnError)
		.then(this.props.reload)
		.catch(() => {
			this.displayUploadError(id, content, type)
		})
	}

	onFileChange(event) {
		const file = event.target.files[0]

		const reader = new FileReader()
		reader.readAsText(file, 'UTF-8')
		reader.onload = e => {
			this.processFileContent(this.props.draftId, e.target.result, file.type)
		}

		return reader // return for test access
	}

	buildFileSelector() {
		ModalUtil.hide()

		const fileSelector = document.createElement('input')
		fileSelector.setAttribute('type', 'file')
		fileSelector.setAttribute('accept', 'application/JSON, application/XML')

		fileSelector.onchange = this.onFileChange.bind(this)

		fileSelector.click()
	}

	render() {
		const menu = [
			{
				name: 'Save Module',
				type: 'action',
				action: () => this.props.onSave(this.props.draftId)
			},
			{
				name: 'New',
				type: 'action',
				action: this.createNewDraft.bind(this)
			},
			{
				name: 'Make a copy...',
				type: 'action',
				action: () => {this.displayCopyPrompt(this.props.title)}
			},
			{
				name: 'Download',
				type: 'sub-menu',
				menu: [
					{
						name: 'XML Document (.xml)',
						type: 'action',
						action: () => downloadDocument(this.props.draftId, 'xml')
					},
					{
						name: 'JSON Document (.json)',
						type: 'action',
						action: () => downloadDocument(this.props.draftId, 'json')
					}
				]
			},
			{
				name: 'Import from file...',
				type: 'action',
				action: this.displayFileImportDialog.bind(this)
			},
			{
				name: 'Delete Module...',
				type: 'action',
				action: this.displayDeleteDialog.bind(this)
			},
			{
				name: 'Copy LTI Link',
				type: 'action',
				action: () => {
					ClipboardUtil.copyToClipboard(`${window.location.origin}/view/${this.props.draftId}`)
				}
			}
		]

		return (
			<div className="visual-editor--drop-down-menu">
				<DropDownMenu name="File" menu={menu} />
			</div>
		)
	}
}

export default FileMenu
