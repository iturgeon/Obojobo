import { shallow, mount } from 'enzyme'
import React from 'react'

import FileMenu from '../../../../src/scripts/oboeditor/components/toolbars/file-menu'

import ModalUtil from '../../../../src/scripts/common/util/modal-util'
jest.mock('../../../../src/scripts/common/util/modal-util')
import APIUtil from 'src/scripts/viewer/util/api-util'
jest.mock('../../../../src/scripts/viewer/util/api-util')
import ClipboardUtil from '../../../../src/scripts/oboeditor/util/clipboard-util'
jest.mock('../../../../src/scripts/oboeditor/util/clipboard-util')
import EditorStore from '../../../../src/scripts/oboeditor/stores/editor-store'
jest.mock('../../../../src/scripts/oboeditor/stores/editor-store', () => ({
	state: { startingId: null, itemsById: { mockStartingId: { label: 'theLabel' } } }
}))
import { downloadDocument } from '../../../../src/scripts/common/util/download-document'
jest.mock('../../../../src/scripts/common/util/download-document')

const CONTENT_NODE = 'ObojoboDraft.Sections.Content'
const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'

describe('FileMenu', () => {
	beforeEach(() => {
		EditorStore.state.startingId = null
		jest.clearAllMocks()
		APIUtil.failOnError.mockImplementation(data => data)
	})

	test('renders as expected', () => {
		const component = shallow(<FileMenu draftId="mockDraft" />)
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('clicking save calls onSave prop', () => {
		const mockOnSave = jest.fn()
		const component = mount(<FileMenu draftId="mockDraft" onSave={mockOnSave} />)

		expect(mockOnSave).not.toHaveBeenCalledWith('mockDraft')

		component.find({ children: 'Save Module' }).simulate('click')

		expect(mockOnSave).toHaveBeenCalledWith('mockDraft')
	})

	test('clicking new calls APIUtil.createNewDraft', done => {
		const component = mount(<FileMenu draftId="mockDraft" />)

		jest.spyOn(window, 'open').mockReturnValueOnce()
		APIUtil.createNewDraft.mockResolvedValueOnce({
			status: 'ok',
			value: { id: 'mock-id' }
		})

		component.find({ children: 'New' }).simulate('click')

		setTimeout(() => {
			component.update()
			expect(APIUtil.createNewDraft).toHaveBeenCalledTimes(1)
			expect(window.open).toHaveBeenCalledWith(
				'http://localhost:3000/editor/visual/mock-id',
				'_blank'
			)
			expect(ModalUtil.show).not.toHaveBeenCalled()
			component.unmount()
			done()
		})
	})

	test('clicking new with api errors', done => {
		const component = mount(<FileMenu draftId="mockDraft" />)

		APIUtil.createNewDraft.mockResolvedValueOnce()
		APIUtil.failOnError.mockResolvedValueOnce()

		component.find({ children: 'New' }).simulate('click')

		setTimeout(() => {
			component.update()
			expect(APIUtil.createNewDraft).toHaveBeenCalledTimes(1)
			expect(APIUtil.failOnError).toHaveBeenCalledTimes(1)
			expect(ModalUtil.show.mock.calls[0][0]).toMatchInlineSnapshot(`
			<Dialog
			  buttons={
			    Array [
			      Object {
			        "altAction": true,
			        "onClick": [MockFunction],
			        "value": "Close",
			      },
			      Object {
			        "default": true,
			        "onClick": [Function],
			        "value": "Try Again",
			      },
			    ]
			  }
			  centered={true}
			  title="Error Creating Module"
			>
			  The request to create a new module failed.
			</Dialog>
		`)
			component.unmount()
			done()
		})
	})

	const expectComponentWithProps = (comp, props) => {
		// @TODO: can we test this is a react component?
		Object.entries(props).forEach(([key, value]) => {
			expect(comp.props).toHaveProperty(key, value)
		})
	}

	test.only('clicking copy shows copy prompt', () => {
		const copyModule = jest.spyOn(FileMenu.prototype, 'copyModule')
		const component = mount(<FileMenu draftId="mockDraft" title="Mock Title" />)
		APIUtil.copyDraft.mockResolvedValueOnce()
		copyModule.mockReturnValueOnce(3)
		component.find({ children: 'Make a copy...' }).simulate('click')

		const copyPrompt = ModalUtil.show.mock.calls[0][0]
		expectComponentWithProps(copyPrompt, { title: 'Copy Module', value: 'Mock Title - Copy' })
	})

	test.only('clicking copy confirm shows complete dialog', () => {
		expect.assertions(5)
		const component = mount(<FileMenu draftId="mockDraft" />)
		APIUtil.copyDraft.mockResolvedValueOnce({
			status: 'ok',
			value: {
				draftId: 'new-copy-draft-id'
			}
		})
		component.find({ children: 'Make a copy...' }).simulate('click')
		const copyPrompt = ModalUtil.show.mock.calls[0][0]
		expectComponentWithProps(copyPrompt, { title: 'Copy Module' })

		return copyPrompt.props.onConfirm('new title').then(() => {
			expect(APIUtil.copyDraft).toHaveBeenCalledTimes(1)
			expect(APIUtil.failOnError).toHaveBeenCalledTimes(1)
			expect(ModalUtil.show).toHaveBeenCalledTimes(3)
			const copyDoneDialog = ModalUtil.show.mock.calls[2][0]
			expectComponentWithProps(copyDoneDialog, {title: 'Copy Complete'})
		})
	})

	test('clicking download ', done => {
		// setup
		APIUtil.getFullDraft.mockResolvedValueOnce('')
		APIUtil.getFullDraft.mockResolvedValueOnce('{ "item": "value" }')

		// render
		const component = mount(<FileMenu draftId="mockDraft" />)

		// click each download
		component.find({ children: 'JSON Document (.json)' }).simulate('click')
		component.find({ children: 'XML Document (.xml)' }).simulate('click')

		setTimeout(() => {
			component.update()
			expect(downloadDocument).toHaveBeenCalledWith('mockDraft', 'json')
			expect(downloadDocument).toHaveBeenCalledWith('mockDraft', 'xml')
			component.unmount()
			done()
		})
	})

	test('FileMenu calls Delete', () => {
		const component = mount(<FileMenu draftId="mockDraft" />)

		component.find({ children: 'Delete Module...' }).simulate('click')

		expect(ModalUtil.show.mock.calls[0][0]).toMatchInlineSnapshot(`
		<Dialog
		  buttons={
		    Array [
		      Object {
		        "altAction": true,
		        "onClick": [MockFunction],
		        "value": "Cancel",
		      },
		      Object {
		        "default": true,
		        "isDangerous": true,
		        "onClick": [Function],
		        "value": "Delete Now",
		      },
		    ]
		  }
		  centered={true}
		  title="Delete Module"
		>
		  Deleting is permanent, continue?
		</Dialog>
	`)
	})

	test('FileMenu calls Copy LTI Link', () => {
		const component = mount(<FileMenu draftId="mockDraft" />)

		component.find({ children: 'Copy LTI Link' }).simulate('click')

		expect(ClipboardUtil.copyToClipboard).toHaveBeenCalled()
	})

	test('copyModule calls copyDraft api', () => {
		expect.hasAssertions()

		const exportToJSON = jest.fn()

		const component = mount(
			<FileMenu draftId="mockDraftId" exportToJSON={exportToJSON} onSave={jest.fn()} />
		)

		APIUtil.copyDraft.mockResolvedValueOnce({
			status: 'ok',
			value: {
				draftId: 'new-copy-draft-id'
			}
		})

		return component
			.instance()
			.copyModule('new title')
			.then(() => {
				expect(APIUtil.copyDraft).toHaveBeenCalledWith('mockDraftId', 'new title')
			})
	})

	test('deleteModule calls deleteDraft api', () => {
		expect.hasAssertions()
		// make sure window.close doesn't break further tests
		jest.spyOn(window, 'close').mockReturnValueOnce()
		const component = mount(<FileMenu draftId="mockDraft" />)

		APIUtil.deleteDraft.mockResolvedValueOnce({ status: 'ok' })
		component.instance().deleteModule('mockId', '      ')

		APIUtil.deleteDraft.mockResolvedValueOnce({ status: 'error' })
		return component
			.instance()
			.deleteModule('mockId', '      ')
			.then(() => {
				expect(APIUtil.deleteDraft).toHaveBeenCalled()
			})
	})

	test('FileMenu - processFileContent', () => {
		APIUtil.postDraft.mockResolvedValue({ status: 'ok', value: { id: 'mockId' } })

		const reload = jest.fn()
		const component = mount(<FileMenu draftId="mockDraft" reload={reload} />)

		component.find({ children: 'Import from file...' }).simulate('click')

		const mockId = 'mockId'
		const content = 'mockContent'

		component.instance().processFileContent(mockId, content, 'application/json')
		expect(APIUtil.postDraft).toHaveBeenCalledWith(mockId, content, 'application/json')

		component.instance().processFileContent(mockId, content, 'text')
		expect(APIUtil.postDraft).toHaveBeenCalledWith(mockId, content, 'text/plain')
	})

	test('FileMenu calls Import', () => {
		const component = mount(<FileMenu draftId="mockDraft" />)

		component.find({ children: 'Import from file...' }).simulate('click')
		expect(ModalUtil.show).toHaveBeenCalled()

		component.instance().buildFileSelector()
		expect(ModalUtil.hide).toHaveBeenCalled()
	})

	test('FileMenu calls onFileChange', () => {
		const fileReaderReadAsText = jest.spyOn(FileReader.prototype, 'readAsText')
		fileReaderReadAsText.mockReturnValueOnce()
		const file = new Blob(['fileContents'], { type: 'text/plain' })
		const component = mount(<FileMenu draftId="mockDraft" reload={jest.fn} />)
		const processFileContent = jest.spyOn(component.instance(), 'processFileContent')
		processFileContent.mockReturnValueOnce()

		const fileReader = component.instance().onFileChange({ target: { files: [file] } })

		expect(fileReaderReadAsText).toHaveBeenCalledWith(file, 'UTF-8')
		fileReader.onload({ target: { result: 'mock-content' } })
		expect(processFileContent).toHaveBeenCalledWith('mockDraft', 'mock-content', 'text/plain')
	})
})
