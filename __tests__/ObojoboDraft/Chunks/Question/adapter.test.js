import QuestionAdapter from '../../../../ObojoboDraft/Chunks/Question/adapter'

describe('Question adapter', () => {
	test('construct builds without attributes', () => {
		const model = { modelState: {} }
		QuestionAdapter.construct(model)
		expect(model).toMatchSnapshot()
	})

	test('construct builds with attributes', () => {
		const model = { modelState: {} }
		const attrs = {
			content: {
				mode: 'review',
				practice: false,
				solution: {
					id: '249138ca-be09-4ab5-b015-3a8107b4c79e',
					type: 'ObojoboDraft.Pages.Page',
					content: {},
					children: [
						{
							id: '7fa8ecca-cdd2-4cb8-ae55-5435db9fb05e',
							type: 'ObojoboDraft.Chunks.Text',
							content: {
								textGroup: [
									{
										text: {
											value: 'this is some example solution text',
											styleList: []
										},
										data: null
									}
								]
							},
							children: []
						}
					]
				}
			}
		}

		QuestionAdapter.construct(model, attrs)
		expect(model).toMatchSnapshot()
	})

	test('clone creates a copy', () => {
		const a = { modelState: {} }
		const b = { modelState: {} }
		const attrs = {
			content: {
				practice: false
			}
		}

		QuestionAdapter.construct(a, attrs)
		QuestionAdapter.clone(a, b)

		expect(a).not.toBe(b)
		expect(a).toEqual(b)
	})

	test('clone creates a copy with solution', () => {
		const a = { modelState: {} }
		const b = { modelState: {} }
		const attrs = {
			content: {
				practice: false,
				solution: {
					id: '249138ca-be09-4ab5-b015-3a8107b4c79e',
					type: 'ObojoboDraft.Pages.Page',
					content: {},
					children: [
						{
							id: '7fa8ecca-cdd2-4cb8-ae55-5435db9fb05e',
							type: 'ObojoboDraft.Chunks.Text',
							content: {
								textGroup: [
									{
										text: {
											value: 'this is some example solution text',
											styleList: []
										},
										data: null
									}
								]
							},
							children: []
						}
					]
				}
			}
		}

		QuestionAdapter.construct(a, attrs)
		QuestionAdapter.clone(a, b)

		expect(a).not.toBe(b)
		expect(a).toEqual(b)
	})

	test('toJSON builds a JSON representation', () => {
		const model = { modelState: {} }
		const json = { content: {} }
		const attrs = {
			content: {
				practice: false
			}
		}
		QuestionAdapter.construct(model, attrs)
		QuestionAdapter.toJSON(model, json)

		expect(json).toMatchSnapshot()
	})

	test('toJSON builds a JSON representation with solution', () => {
		const model = { modelState: {} }
		const json = { content: {} }
		const attrs = {
			content: {
				practice: false,
				solution: {
					id: '249138ca-be09-4ab5-b015-3a8107b4c79e',
					type: 'ObojoboDraft.Pages.Page',
					content: {},
					children: [
						{
							id: '7fa8ecca-cdd2-4cb8-ae55-5435db9fb05e',
							type: 'ObojoboDraft.Chunks.Text',
							content: {
								textGroup: [
									{
										text: {
											value: 'this is some example solution text',
											styleList: []
										},
										data: null
									}
								]
							},
							children: []
						}
					]
				}
			}
		}
		QuestionAdapter.construct(model, attrs)
		QuestionAdapter.toJSON(model, json)

		expect(json).toMatchSnapshot()
	})
})
