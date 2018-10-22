import { shallow, mount } from 'enzyme'
import React from 'react'
import { Value } from 'slate'

jest.mock('slate-react')
jest.mock('../../../src/scripts/viewer/util/api-util')
jest.mock('../../../ObojoboDraft/Sections/Assessment/editor', () => ({
	helpers: {
		slateToObo: () => ({
			children: [],
			content: {}
		}),
		oboToSlate: () => ({
			object: 'block',
			isVoid: true,
			type: 'mockNode'
		})
	},
	plugins: {}
}))

import PageEditor from '../../../src/scripts/oboeditor/components/page-editor'
import Break from '../../../ObojoboDraft/Chunks/Break/editor'
import APIUtil from '../../../src/scripts/viewer/util/api-util'

const CONTENT_NODE = 'ObojoboDraft.Sections.Content'
const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'

describe('PageEditor', () => {
	test('EditorNav component', () => {
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component with no page', () => {
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		component.setProps({ page: null })
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component with no page updating to a page', () => {
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		component.setProps({ page: null })
		component.setProps(props)
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component with no page updating to a page', () => {
		const props = {
			page: {
				id: 1,
				set: jest.fn(),
				attributes: {
					children: []
				},
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		component.setProps({
			page: {
				id: 2,
				set: jest.fn(),
				attributes: {
					children: []
				},
				get: jest.fn()
			}
		})
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component with content', () => {
		const props = {
			page: {
				id: 2,
				set: jest.fn(),
				attributes: {
					children: [
						{
							type: 'ObojoboDraft.Chunks.Break',
							content: {}
						},
						{
							type: 'NonsenseNode'
						}
					]
				},
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()
		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component with content exports to database', () => {
		jest.spyOn(window, 'alert')
		window.alert.mockReturnValueOnce(null)
		APIUtil.postDraft.mockResolvedValueOnce({ status: 'ok' })

		const props = {
			page: {
				id: 2,
				set: jest.fn(),
				attributes: {
					children: [
						{
							type: 'ObojoboDraft.Chunks.Break',
							content: {}
						},
						{
							type: 'NonsenseNode'
						}
					]
				},
				get: jest
					.fn()
					.mockReturnValueOnce(ASSESSMENT_NODE) // get('type') in import
					.mockReturnValueOnce(ASSESSMENT_NODE) // get('type') in export
			},
			model: {
				children: [
					{
						get: () => ASSESSMENT_NODE
					},
					{
						get: () => CONTENT_NODE,
						flatJSON: () => {
							return { children: [] }
						},
						children: {
							models: [
								{
									get: () => null
								}
							]
						}
					},
					{
						get: () => 'mockNode'
					}
				],
				flatJSON: () => {
					return { children: [] }
				}
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(14)
			.simulate('click')

		expect(tree).toMatchSnapshot()
		expect(APIUtil.postDraft).toHaveBeenCalle
	})

	test('EditorNav component with content fails to export to database', () => {
		jest.spyOn(window, 'alert')
		window.alert.mockReturnValueOnce(null)
		APIUtil.postDraft.mockResolvedValueOnce({ status: 'not ok' })

		const props = {
			page: {
				id: 2,
				set: jest.fn(),
				attributes: {
					children: [
						{
							type: 'ObojoboDraft.Chunks.Break',
							content: {}
						},
						{
							type: 'NonsenseNode'
						}
					]
				},
				get: jest.fn()
			},
			model: {
				children: [],
				flatJSON: () => {
					return { children: [] }
				}
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(14)
			.simulate('click')

		expect(tree).toMatchSnapshot()
		expect(APIUtil.postDraft).toHaveBeenCalle
	})

	test('EditorNav component toggles mark', () => {
		window.getSelection = jest.fn().mockReturnValueOnce({
			rangeCount: {
				nodeType: 'mockType'
			}
		})
		jest.spyOn(Break.helpers, 'insertNode')
		Break.helpers.insertNode.mockReturnValueOnce(null)
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = mount(<PageEditor {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(2)
			.simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component inserts item', () => {
		jest.spyOn(Break.helpers, 'insertNode')
		Break.helpers.insertNode.mockReturnValueOnce(null)
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()

		component
			.find('button')
			.at(2)
			.simulate('click')

		expect(tree).toMatchSnapshot()
	})

	test('EditorNav component changes value', () => {
		jest.spyOn(Break.helpers, 'insertNode')
		window.getSelection = jest.fn().mockReturnValueOnce({ rangeCount: 0 })

		Break.helpers.insertNode.mockReturnValueOnce(null)
		const props = {
			page: {
				attributes: { children: [] },
				get: jest.fn()
			}
		}
		const component = shallow(<PageEditor {...props} />)
		const tree = component.html()

		component.find('.obojobo-draft--pages--page').simulate('change', { value: Value.create({}) })

		expect(tree).toMatchSnapshot()
	})
})