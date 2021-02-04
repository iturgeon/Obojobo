const dayjs = require('dayjs')
const advancedFormat = require('dayjs/plugin/advancedFormat')
dayjs.extend(advancedFormat)

describe('Dashboard Actions', () => {
	let DashboardActions
	let mockFileReader

	const originalFetch = global.fetch
	const originalCreateElement = document.createElement
	const originalFileReader = global.FileReader
	const originalWindowLocationReload = window.location.reload

	// this is lifted straight out of dashboard-actions, for ease of comparison
	//  barring any better ways of using it
	const defaultFetchOptions = {
		method: 'GET',
		credentials: 'include',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	}

	let standardFetchResponse
	let createElementCopy

	beforeAll(() => {
		global.fetch = jest.fn()
	})

	beforeEach(() => {
		jest.resetModules()
		jest.resetAllMocks()
		jest.useFakeTimers()

		delete window.location
		window.location = {
			reload: jest.fn()
		}

		standardFetchResponse = {
			ok: true,
			json: jest.fn(() => ({ value: 'mockVal' }))
		}

		document.createElement = jest.fn(() => {
			createElementCopy = {
				setAttribute: jest.fn(),
				onchange: jest.fn(),
				click: jest.fn()
			}
			return createElementCopy
		})

		global.FileReader = jest.fn(() => {
			mockFileReader = {
				readAsText: jest.fn()
			}
			return mockFileReader
		})

		DashboardActions = require('./dashboard-actions')
	})

	afterAll(() => {
		global.fetch = originalFetch
		document.createElement = originalCreateElement
		global.FileReader = originalFileReader
		window.location.reload = originalWindowLocationReload
	})

	test('showModulePermissions returns the expected output', () => {
		const mockModule = { draftId: 'mockDraftId' }
		const actionReply = DashboardActions.showModulePermissions(mockModule)

		expect(global.fetch).not.toHaveBeenCalled()
		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_MODULE_PERMISSIONS,
			module: mockModule
		})
	})

	test('closeModal returns the expected output', () => {
		const actionReply = DashboardActions.closeModal()

		expect(global.fetch).not.toHaveBeenCalled()
		expect(actionReply).toEqual({
			type: DashboardActions.CLOSE_MODAL
		})
	})

	test('clearPeopleSearchResults returns the expected output', () => {
		const actionReply = DashboardActions.clearPeopleSearchResults()

		expect(global.fetch).not.toHaveBeenCalled()
		expect(actionReply).toEqual({
			type: DashboardActions.CLEAR_PEOPLE_SEARCH_RESULTS
		})
	})

	test('searchForUser returns the expected output and calls other functions correctly - server ok', () => {
		global.fetch.mockResolvedValueOnce({ ...standardFetchResponse, ok: true })

		const actionReply = DashboardActions.searchForUser('mockSearchString')
		jest.runAllTimers()

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/users/search?q=mockSearchString',
			defaultFetchOptions
		)

		expect(actionReply).toEqual({
			type: DashboardActions.LOAD_USER_SEARCH,
			meta: {
				searchString: 'mockSearchString'
			},
			promise: expect.any(Object)
		})

		return actionReply.promise.then(() => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
		})
	})
	test('searchForUser returns the expected output and calls other functions correctly - server error', () => {
		const mockFetchUrl = '/api/users/search?q=mockSearchString'
		global.fetch.mockResolvedValueOnce({
			ok: false,
			url: mockFetchUrl,
			status: 500
		})

		const actionReply = DashboardActions.searchForUser('mockSearchString')

		expect(actionReply).toEqual({
			type: DashboardActions.LOAD_USER_SEARCH,
			meta: {
				searchString: 'mockSearchString'
			},
			promise: expect.any(Object)
		})

		jest.runAllTimers()
		return actionReply.promise.catch(error => {
			expect(error).toBeInstanceOf(Error)
			expect(error.message).toBe(
				'Error requesting /api/users/search?q=mockSearchString, status code: 500'
			)

			expect(global.fetch).toHaveBeenCalledWith(
				'/api/users/search?q=mockSearchString',
				defaultFetchOptions
			)
		})
	})

	test('addUserToModule returns the expected output and calls other functions correctly', () => {
		global.fetch.mockResolvedValueOnce(standardFetchResponse)

		const actionReply = DashboardActions.addUserToModule('mockDraftId', 99)

		expect(global.fetch).toHaveBeenCalledWith('/api/drafts/mockDraftId/permission', {
			...defaultFetchOptions,
			method: 'POST',
			body: '{"userId":99}'
		})
		global.fetch.mockReset()
		global.fetch.mockResolvedValueOnce({
			json: () => ({ value: 'mockSecondaryPermissionsVal' })
		})

		expect(actionReply).toEqual({
			type: DashboardActions.ADD_USER_TO_MODULE,
			promise: expect.any(Object)
		})

		// should get draft permissions after changing them
		return actionReply.promise.then(finalResponse => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/drafts/mockDraftId/permission',
				defaultFetchOptions
			)
			expect(finalResponse).toEqual({ value: 'mockSecondaryPermissionsVal' })
		})
	})

	// three (plus one default) ways of calling deleteModulePermissions
	const assertDeleteModulePermissionsRunsWithOptions = (secondaryLookupUrl, options) => {
		global.fetch.mockResolvedValueOnce(standardFetchResponse)
		const actionReply = DashboardActions.deleteModulePermissions('mockDraftId', 99, options)

		expect(global.fetch).toHaveBeenCalledWith('/api/drafts/mockDraftId/permission/99', {
			...defaultFetchOptions,
			method: 'DELETE'
		})
		global.fetch.mockReset()
		// two additional API calls are made following the first
		global.fetch
			.mockResolvedValueOnce({
				json: () => ({ value: 'mockSecondVal1' })
			})
			.mockResolvedValueOnce({
				json: () => ({ value: 'mockSecondVal2' })
			})

		expect(actionReply).toEqual({
			type: DashboardActions.DELETE_MODULE_PERMISSIONS,
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalResponse => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledWith(secondaryLookupUrl, defaultFetchOptions)
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/drafts/mockDraftId/permission',
				defaultFetchOptions
			)

			expect(finalResponse).toEqual({
				value: 'mockSecondVal2',
				modules: 'mockSecondVal1'
			})
		})
	}
	// no options, default should be equivalent to MODE_ALL
	test('deleteModulePermissions returns expected output and calls other functions, default', () => {
		return assertDeleteModulePermissionsRunsWithOptions('/api/drafts')
	})

	test('loadUsersForModule returns the expected output', () => {
		global.fetch.mockResolvedValueOnce(standardFetchResponse)
		const actionReply = DashboardActions.loadUsersForModule('mockDraftId')

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/drafts/mockDraftId/permission',
			defaultFetchOptions
		)
		expect(actionReply).toEqual({
			type: DashboardActions.LOAD_USERS_FOR_MODULE,
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalResponse => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
			expect(finalResponse).toEqual({ value: 'mockVal' })
		})
	})

	// three (plus one default) ways of calling deleteModule
	const assertDeleteModuleRunsWithOptions = (secondaryLookupUrl, fetchBody, options) => {
		global.fetch.mockResolvedValueOnce(standardFetchResponse)
		const actionReply = DashboardActions.deleteModule('mockDraftId', options)

		expect(global.fetch).toHaveBeenCalledWith('/api/drafts/mockDraftId', {
			...defaultFetchOptions,
			method: 'DELETE',
			body: fetchBody
		})
		global.fetch.mockReset()
		global.fetch.mockResolvedValueOnce({
			json: () => ({ value: 'mockSecondaryResponse' })
		})

		expect(actionReply).toEqual({
			type: DashboardActions.DELETE_MODULE,
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalResponse => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledWith(secondaryLookupUrl, defaultFetchOptions)

			expect(finalResponse).toEqual({
				value: 'mockSecondaryResponse'
			})
		})
	}
	test('deleteModule returns expected output and calls other functions, default', () => {
		return assertDeleteModuleRunsWithOptions('/api/drafts')
	})

	// three (plus one default) ways of calling createNewModule plus tutorial/normal module
	const assertCreateNewModuleRunsWithOptions = (
		createUrl,
		fetchBody,
		secondaryLookupUrl,
		isTutorial,
		options
	) => {
		global.fetch.mockResolvedValueOnce(standardFetchResponse)
		const actionReply = DashboardActions.createNewModule(isTutorial, options)

		expect(global.fetch).toHaveBeenCalledWith(createUrl, {
			...defaultFetchOptions,
			method: 'POST',
			body: fetchBody
		})
		global.fetch.mockReset()
		global.fetch.mockResolvedValueOnce({
			json: () => ({ value: 'mockSecondaryResponse' })
		})

		expect(actionReply).toEqual({
			type: DashboardActions.CREATE_NEW_MODULE,
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalResponse => {
			expect(standardFetchResponse.json).toHaveBeenCalled()
			expect(global.fetch).toHaveBeenCalledWith(secondaryLookupUrl, defaultFetchOptions)

			expect(finalResponse).toEqual({
				value: 'mockSecondaryResponse'
			})
		})
	}
	// no options, default should be equivalent to MODE_ALL
	test('createNewModule returns expected output and calls other functions', () => {
		return assertCreateNewModuleRunsWithOptions(
			'/api/drafts/new',
			'{}',
			'/api/drafts'
			//no argument indicating tutorial - should default to false
		)
	})
	// same as above, but making a tutorial
	test('createNewModule returns expected output and calls other functions, tutorial', () => {
		return assertCreateNewModuleRunsWithOptions('/api/drafts/tutorial', '{}', '/api/drafts', true)
	})

	test('filterModules returns the expected output', () => {
		const actionReply = DashboardActions.filterModules('mockSearchString')

		expect(global.fetch).not.toHaveBeenCalled()
		expect(actionReply).toEqual({
			type: DashboardActions.FILTER_MODULES,
			searchString: 'mockSearchString'
		})
	})

	test('showModuleMore returns the expected output', () => {
		const mockModule = {
			draftId: 'mockDraftId',
			title: 'Mock Draft Title'
		}
		const actionReply = DashboardActions.showModuleMore(mockModule)

		expect(global.fetch).not.toHaveBeenCalled()
		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_MODULE_MORE,
			module: mockModule
		})
	})

	test('importModuleFile returns the expected output and calls other functions correctly - no file', () => {
		const actionReply = DashboardActions.importModuleFile()
		expect(actionReply).toEqual({
			type: DashboardActions.IMPORT_MODULE_FILE,
			promise: expect.any(Object)
		})

		expect(document.createElement).toHaveBeenCalledTimes(1)
		expect(document.createElement).toHaveBeenCalledWith('input')
		expect(createElementCopy.setAttribute).toHaveBeenCalledTimes(2)
		expect(createElementCopy.setAttribute.mock.calls).toEqual([
			['type', 'file'],
			['accept', 'application/json, application/xml']
		])
		expect(createElementCopy.click).toHaveBeenCalledTimes(1)

		const mockEvent = {
			target: {
				files: []
			}
		}
		createElementCopy.onchange(mockEvent)

		return actionReply.promise.then(() => {
			expect(global.fetch).not.toHaveBeenCalled()
			expect(global.FileReader).not.toHaveBeenCalled()
			expect(window.location.reload).not.toHaveBeenCalled()
		})
	})

	test('importModuleFile returns the expected output and calls other functions correctly - valid file, json', () => {
		global.fetch.mockResolvedValueOnce({ ...standardFetchResponse, ok: true })

		const actionReply = DashboardActions.importModuleFile()
		expect(actionReply).toEqual({
			type: DashboardActions.IMPORT_MODULE_FILE,
			promise: expect.any(Object)
		})

		expect(document.createElement).toHaveBeenCalledTimes(1)
		expect(document.createElement).toHaveBeenCalledWith('input')
		expect(createElementCopy.setAttribute).toHaveBeenCalledTimes(2)
		expect(createElementCopy.setAttribute.mock.calls).toEqual([
			['type', 'file'],
			['accept', 'application/json, application/xml']
		])
		expect(createElementCopy.click).toHaveBeenCalledTimes(1)

		const mockChangeEvent = {
			target: {
				files: [{ type: 'application/json' }]
			}
		}
		createElementCopy.onchange(mockChangeEvent)
		expect(global.FileReader).toHaveBeenCalledTimes(1)

		const mockLoadEvent = {
			target: {
				result: 'fileContent'
			}
		}
		mockFileReader.onload(mockLoadEvent)

		return actionReply.promise.then(() => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledWith('/api/drafts/new', {
				...defaultFetchOptions,
				method: 'POST',
				body: JSON.stringify({
					content: 'fileContent',
					format: 'application/json'
				})
			})
			expect(window.location.reload).toHaveBeenCalledTimes(1)
		})
	})

	test('importModuleFile returns the expected output and calls other functions correctly - valid file, non-json', () => {
		global.fetch.mockResolvedValueOnce({ ...standardFetchResponse, ok: true })

		const actionReply = DashboardActions.importModuleFile()
		expect(actionReply).toEqual({
			type: DashboardActions.IMPORT_MODULE_FILE,
			promise: expect.any(Object)
		})

		expect(document.createElement).toHaveBeenCalledTimes(1)
		expect(document.createElement).toHaveBeenCalledWith('input')
		expect(createElementCopy.setAttribute).toHaveBeenCalledTimes(2)
		expect(createElementCopy.setAttribute.mock.calls).toEqual([
			['type', 'file'],
			['accept', 'application/json, application/xml']
		])
		expect(createElementCopy.click).toHaveBeenCalledTimes(1)

		const mockChangeEvent = {
			target: {
				files: [{ type: 'fileType' }]
			}
		}
		createElementCopy.onchange(mockChangeEvent)
		expect(global.FileReader).toHaveBeenCalledTimes(1)

		const mockLoadEvent = {
			target: {
				result: 'fileContent'
			}
		}
		mockFileReader.onload(mockLoadEvent)

		return actionReply.promise.then(() => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledWith('/api/drafts/new', {
				...defaultFetchOptions,
				method: 'POST',
				body: JSON.stringify({
					content: 'fileContent',
					format: 'application/xml' //defaults to this unless file type is 'application/json'
				})
			})
			expect(window.location.reload).toHaveBeenCalledTimes(1)
		})
	})

	test('importModuleFile returns the expected output and calls other functions correctly - api failure', () => {
		global.fetch.mockRejectedValueOnce(null)

		const actionReply = DashboardActions.importModuleFile()
		expect(actionReply).toEqual({
			type: DashboardActions.IMPORT_MODULE_FILE,
			promise: expect.any(Object)
		})

		expect(document.createElement).toHaveBeenCalledTimes(1)
		expect(document.createElement).toHaveBeenCalledWith('input')
		expect(createElementCopy.setAttribute).toHaveBeenCalledTimes(2)
		expect(createElementCopy.setAttribute.mock.calls).toEqual([
			['type', 'file'],
			['accept', 'application/json, application/xml']
		])
		expect(createElementCopy.click).toHaveBeenCalledTimes(1)

		const mockChangeEvent = {
			target: {
				files: [{ type: 'fileType' }]
			}
		}
		createElementCopy.onchange(mockChangeEvent)
		expect(global.FileReader).toHaveBeenCalledTimes(1)

		const mockLoadEvent = {
			target: {
				result: 'fileContent'
			}
		}
		mockFileReader.onload(mockLoadEvent)

		return actionReply.promise.catch(() => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledWith('/api/drafts/new', {
				...defaultFetchOptions,
				method: 'POST',
				body: JSON.stringify({
					content: 'fileContent',
					format: 'application/xml' //defaults to this unless file type is 'application/json'
				})
			})
			expect(window.location.reload).not.toHaveBeenCalled()
		})
	})

	test('showVersionHistory gets recent history - single call', () => {
		const mockModule = { draftId: 'mockDraftId' }
		const mockFetchUrl = `/api/drafts/${mockModule.draftId}/revisions`

		const mockHeadersGet = jest.fn()

		const mockRevisionHistoryList = [
			{
				createdAt: new Date(10000000000).toISOString(),
				revisionId: 'mockDraftId1',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(20000000000).toISOString(),
				revisionId: 'mockDraftId2',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(30000000000).toISOString(),
				revisionId: 'mockDraftId3',
				userFullName: 'Mock User1'
			}
		]

		const mockFetchJSON = jest.fn(() => ({
			value: mockRevisionHistoryList
		}))

		const mockFetchResponse = {
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		}

		global.fetch.mockResolvedValueOnce(mockFetchResponse)

		const actionReply = DashboardActions.showVersionHistory(mockModule)
		jest.runAllTimers()

		expect(global.fetch).toHaveBeenCalledWith(mockFetchUrl, defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_VERSION_HISTORY,
			meta: { module: mockModule },
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalHistory => {
			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(global.fetch).toHaveBeenCalledWith(mockFetchUrl, {
				...defaultFetchOptions
			})
			expect(mockHeadersGet).toHaveBeenCalledTimes(1)
			expect(mockHeadersGet).toHaveBeenCalledWith('link')
			expect(mockFetchJSON).toHaveBeenCalledTimes(1)
			expect(finalHistory.length).toBe(3)
			for (let i = 0; i < 3; i++) {
				expect(finalHistory[i]).toEqual({
					createdAt: new Date(mockRevisionHistoryList[i].createdAt),
					createdAtDisplay: dayjs(mockRevisionHistoryList[i].createdAt).format('MMMM Do - h:mm A'),
					id: mockRevisionHistoryList[i].revisionId,
					username: mockRevisionHistoryList[i].userFullName,
					selected: i === 0,
					versionNumber: finalHistory.length - i
				})
			}
		})
	})

	test('showVersionHistory gets recent history - valid link header, multiple calls', () => {
		const mockModule = { draftId: 'mockDraftId' }
		const mockFetchUrl = `/api/drafts/${mockModule.draftId}/revisions`

		const mockHeadersGet = jest
			.fn()
			.mockReturnValueOnce(
				`<${mockFetchUrl}?after=mockDraftId3>;
			rel="next"`
			)
			.mockReturnValueOnce(null)

		const mockRevisionHistoryList1 = [
			{
				createdAt: new Date(10000000000).toISOString(),
				revisionId: 'mockDraftId1',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(20000000000).toISOString(),
				revisionId: 'mockDraftId2',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(30000000000).toISOString(),
				revisionId: 'mockDraftId3',
				userFullName: 'Mock User1'
			}
		]
		const mockRevisionHistoryList2 = [
			{
				createdAt: new Date(40000000000).toISOString(),
				revisionId: 'mockDraftId4',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(50000000000).toISOString(),
				revisionId: 'mockDraftId5',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(60000000000).toISOString(),
				revisionId: 'mockDraftId6',
				userFullName: 'Mock User1'
			}
		]

		const mockFetchJSON = jest
			.fn()
			.mockResolvedValueOnce({ value: mockRevisionHistoryList1 })
			.mockResolvedValueOnce({ value: mockRevisionHistoryList2 })

		const mockFetchResponse = {
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		}

		global.fetch.mockResolvedValue(mockFetchResponse)

		const actionReply = DashboardActions.showVersionHistory(mockModule)
		jest.runAllTimers()

		expect(global.fetch).toHaveBeenCalledWith(mockFetchUrl, defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_VERSION_HISTORY,
			meta: { module: mockModule },
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalHistory => {
			expect(global.fetch).toHaveBeenCalledTimes(2)
			expect(global.fetch.mock.calls[0]).toEqual([
				mockFetchUrl,
				{
					...defaultFetchOptions
				}
			])
			expect(global.fetch.mock.calls[1]).toEqual([
				mockFetchUrl + '?after=mockDraftId3',
				{
					...defaultFetchOptions
				}
			])
			expect(mockHeadersGet).toHaveBeenCalledTimes(2)
			expect(mockFetchJSON).toHaveBeenCalledTimes(2)
			expect(finalHistory.length).toBe(6)
			let j = 0
			for (let i = 0; i < 3; i++) {
				expect(finalHistory[j]).toEqual({
					createdAt: new Date(mockRevisionHistoryList1[i].createdAt),
					createdAtDisplay: dayjs(mockRevisionHistoryList1[i].createdAt).format('MMMM Do - h:mm A'),
					id: mockRevisionHistoryList1[i].revisionId,
					username: mockRevisionHistoryList1[i].userFullName,
					selected: j === 0,
					versionNumber: finalHistory.length - j
				})
				j++
			}
			for (let i = 0; i < 3; i++) {
				expect(finalHistory[j]).toEqual({
					createdAt: new Date(mockRevisionHistoryList2[i].createdAt),
					createdAtDisplay: dayjs(mockRevisionHistoryList2[i].createdAt).format('MMMM Do - h:mm A'),
					id: mockRevisionHistoryList2[i].revisionId,
					username: mockRevisionHistoryList2[i].userFullName,
					selected: j === 0,
					versionNumber: finalHistory.length - j
				})
				j++
			}
		})
	})

	test('showVersionHistory gets recent history - no "next" link header', () => {
		const mockModule = { draftId: 'mockDraftId' }
		const mockFetchUrl = `/api/drafts/${mockModule.draftId}/revisions`

		const mockHeadersGet = jest
			.fn()
			.mockReturnValueOnce(
				`<${mockFetchUrl}?after=mockDraftId3>;
			rel="unrecognized"`
			)
			.mockReturnValueOnce(null)

		const mockRevisionHistoryList1 = [
			{
				createdAt: new Date(10000000000).toISOString(),
				revisionId: 'mockDraftId1',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(20000000000).toISOString(),
				revisionId: 'mockDraftId2',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(30000000000).toISOString(),
				revisionId: 'mockDraftId3',
				userFullName: 'Mock User1'
			}
		]
		const mockRevisionHistoryList2 = [
			{
				createdAt: new Date(40000000000).toISOString(),
				revisionId: 'mockDraftId4',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(50000000000).toISOString(),
				revisionId: 'mockDraftId5',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(60000000000).toISOString(),
				revisionId: 'mockDraftId6',
				userFullName: 'Mock User1'
			}
		]

		const mockFetchJSON = jest
			.fn()
			.mockResolvedValueOnce({ value: mockRevisionHistoryList1 })
			.mockResolvedValueOnce({ value: mockRevisionHistoryList2 })

		const mockFetchResponse = {
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		}

		global.fetch.mockResolvedValue(mockFetchResponse)

		const actionReply = DashboardActions.showVersionHistory(mockModule)
		jest.runAllTimers()

		expect(global.fetch).toHaveBeenCalledWith(mockFetchUrl, defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_VERSION_HISTORY,
			meta: { module: mockModule },
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalHistory => {
			expect(mockHeadersGet).toHaveBeenCalledTimes(1)
			expect(mockFetchJSON).toHaveBeenCalledTimes(1)
			expect(finalHistory.length).toBe(3)
			for (let i = 0; i < 3; i++) {
				expect(finalHistory[i]).toEqual({
					createdAt: new Date(mockRevisionHistoryList1[i].createdAt),
					createdAtDisplay: dayjs(mockRevisionHistoryList1[i].createdAt).format('MMMM Do - h:mm A'),
					id: mockRevisionHistoryList1[i].revisionId,
					username: mockRevisionHistoryList1[i].userFullName,
					selected: i === 0,
					versionNumber: finalHistory.length - i
				})
			}
		})
	})

	test('showVersionHistory prevents itself from running forever', () => {
		const mockModule = { draftId: 'mockDraftId' }
		const mockFetchUrl = `/api/drafts/${mockModule.draftId}/revisions`

		const mockHeadersGet = jest.fn().mockReturnValue(`<${mockFetchUrl}?after=mockDraftId>;
			rel="next"`)

		const mockFetchJSON = jest.fn(() => ({
			value: []
		}))

		const mockFetchResponse = {
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		}

		global.fetch.mockResolvedValue(mockFetchResponse)

		const actionReply = DashboardActions.showVersionHistory(mockModule)
		jest.runAllTimers()

		expect(global.fetch).toHaveBeenCalledWith(mockFetchUrl, defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.SHOW_VERSION_HISTORY,
			meta: { module: mockModule },
			promise: expect.any(Object)
		})

		return actionReply.promise.then(() => {
			expect(mockFetchJSON).toHaveBeenCalledTimes(101)
		})
	})

	test('restoreVersion makes all other sub-calls - draft json as string, no restoration errors', () => {
		const mockRevisionHistoryList = [
			{
				createdAt: new Date(10000000000).toISOString(),
				revisionId: 'mockDraftId1',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(20000000000).toISOString(),
				revisionId: 'mockDraftId2',
				userFullName: 'Mock User1'
			},
			{
				createdAt: new Date(30000000000).toISOString(),
				revisionId: 'mockDraftId3',
				userFullName: 'Mock User1'
			}
		]

		// numerous API calls are made in sequence
		const mockFetchJSON = jest
			.fn()
			// first call: get full json of target revision
			.mockResolvedValueOnce({
				value: {
					json: 'mockDraftJSONString'
				}
			})
			//second call: save the full json as a new draft
			.mockResolvedValueOnce({
				value: {
					id: 'mockDraftId3'
				},
				status: 'ok'
			})
			//third call: get the revision history of the given draft
			.mockResolvedValueOnce({
				value: mockRevisionHistoryList
			})
		const mockHeadersGet = jest.fn()

		global.fetch.mockResolvedValue({
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		})

		const actionReply = DashboardActions.restoreVersion('mockDraftId', 'mockDraftId2')

		expect(actionReply).toEqual({
			type: DashboardActions.RESTORE_VERSION,
			meta: {
				draftId: 'mockDraftId',
				versionId: 'mockDraftId2'
			},
			promise: expect.any(Object)
		})

		return actionReply.promise.then(finalHistory => {
			expect(mockFetchJSON).toHaveBeenCalledTimes(3)
			expect(global.fetch).toHaveBeenCalledTimes(3)
			// first call: get full json of target revision
			expect(global.fetch.mock.calls[0]).toEqual([
				'/api/drafts/mockDraftId/revisions/mockDraftId2',
				{
					...defaultFetchOptions
				}
			])
			//second call: save the full json as a new draft
			expect(global.fetch.mock.calls[1]).toEqual([
				'/api/drafts/mockDraftId',
				{
					...defaultFetchOptions,
					method: 'POST',
					body: 'mockDraftJSONString'
				}
			])
			//third call: get the revision history of the given draft
			expect(global.fetch.mock.calls[2]).toEqual([
				'/api/drafts/mockDraftId/revisions',
				{
					...defaultFetchOptions
				}
			])
			expect(mockHeadersGet).toHaveBeenCalledTimes(1)

			for (let i = 0; i < 3; i++) {
				expect(finalHistory[i]).toEqual({
					createdAt: new Date(mockRevisionHistoryList[i].createdAt),
					createdAtDisplay: dayjs(mockRevisionHistoryList[i].createdAt).format('MMMM Do - h:mm A'),
					id: mockRevisionHistoryList[i].revisionId,
					username: mockRevisionHistoryList[i].userFullName,
					selected: i === 0,
					versionNumber: finalHistory.length - i,
					//only the last revision should have 'isRestored' after a restoration
					isRestored: i === finalHistory.length - 1 ? true : undefined // eslint-disable-line no-undefined
				})
			}
		})
	})

	test('restoreVersion makes all other sub-calls - draft json as object, restoration errors', () => {
		// numerous API calls are made in sequence
		const mockFetchJSON = jest
			.fn()
			// first call: get full json of target revision
			.mockResolvedValueOnce({
				value: {
					json: { id: 'mockDraftJSONString' }
				}
			})
			//second call: save the full json as a new draft
			.mockResolvedValueOnce({
				value: {
					id: 'mockDraftId3'
				},
				status: 'not ok'
			})

		const mockHeadersGet = jest.fn()

		global.fetch.mockResolvedValue({
			...standardFetchResponse,
			headers: {
				get: mockHeadersGet
			},
			json: mockFetchJSON
		})

		const actionReply = DashboardActions.restoreVersion('mockDraftId', 'mockDraftId2')

		expect(actionReply).toEqual({
			type: DashboardActions.RESTORE_VERSION,
			meta: {
				draftId: 'mockDraftId',
				versionId: 'mockDraftId2'
			},
			promise: expect.any(Object)
		})

		return actionReply.promise.catch(error => {
			expect(mockFetchJSON).toHaveBeenCalledTimes(2)
			expect(global.fetch).toHaveBeenCalledTimes(2)
			// first call: get full json of target revision
			expect(global.fetch.mock.calls[0]).toEqual([
				'/api/drafts/mockDraftId/revisions/mockDraftId2',
				{
					...defaultFetchOptions
				}
			])
			//second call: save the full json as a new draft
			expect(global.fetch.mock.calls[1]).toEqual([
				'/api/drafts/mockDraftId',
				{
					...defaultFetchOptions,
					method: 'POST',
					body: '{"id":"mockDraftJSONString"}'
				}
			])
			expect(error).toBeInstanceOf(Error)
			expect(error.message).toBe('Failed restoring draft.')
		})
	})

	test('checkModuleLock returns the expected output', () => {
		const mockLock = {
			id: 'mockId',
			userId: 'mockUserId',
			draftId: 'mockDraftId',
			createdAt: 'mockDate'
		}
		const mockFetchResponse = {
			...standardFetchResponse,
			json: jest.fn(() => ({
				status: 'ok',
				value: { ...mockLock }
			}))
		}

		global.fetch.mockResolvedValueOnce(mockFetchResponse)

		const actionReply = DashboardActions.checkModuleLock('mockDraftId')

		expect(global.fetch).toHaveBeenCalledWith('/api/locks/mockDraftId', defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.CHECK_MODULE_LOCK,
			promise: expect.any(Object)
		})

		return actionReply.promise.then(res => {
			expect(mockFetchResponse.json).toHaveBeenCalled()
			expect(res).toEqual({ ...mockLock })
		})
	})

	test('getModuleLock handles errors', () => {
		const mockFetchResponse = {
			ok: false,
			json: jest.fn(() => ({ status: 'not ok' }))
		}

		global.fetch.mockResolvedValueOnce(mockFetchResponse)

		const actionReply = DashboardActions.checkModuleLock('mockDraftId')

		expect(global.fetch).toHaveBeenCalledWith('/api/locks/mockDraftId', defaultFetchOptions)

		expect(actionReply).toEqual({
			type: DashboardActions.CHECK_MODULE_LOCK,
			promise: expect.any(Object)
		})

		return actionReply.promise.catch(error => {
			expect(mockFetchResponse.json).toHaveBeenCalled()
			expect(error).toBeInstanceOf(Error)
			expect(error.message).toBe('Failed to check lock for module with id mockDraftId.')
		})
	})
})
