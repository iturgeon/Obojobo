jest.mock('../../../../src/scripts/common/index', () => ({
	Store: {
		registerModel: jest.fn()
	}
}))

jest.mock('../../../../ObojoboDraft/Sections/Content/viewer-component', () => ({}))

const Common = require('../../../../src/scripts/common/index')

// include the script we're testing, it registers the model
import ViewerComponent from '../../../../ObojoboDraft/Sections/Content/viewer-component'

describe('ObojoboDraft.Sections.Content registration', () => {
	test('registerModel registers expected vars', () => {
		const register = Common.Store.registerModel.mock.calls[0]
		expect(register[0]).toBe('ObojoboDraft.Sections.Content')
		expect(register[1]).toHaveProperty('getNavItem')
		expect(register[1]).toHaveProperty('type', 'section')
		expect(register[1]).toHaveProperty('default', true)
		expect(register[1]).toHaveProperty('adapter', null)
		expect(register[1]).toHaveProperty('componentClass', ViewerComponent)
		expect(register[1]).toHaveProperty('selectionHandler', null)
	})

	test('getNavItem returns expected object', () => {
		const register = Common.Store.registerModel.mock.calls[0]
		const model = {
			children: {
				models: []
			}
		}
		const navItem = register[1].getNavItem(model)
		expect(navItem).toEqual({
			type: 'hidden',
			showChildren: true
		})
	})
})
