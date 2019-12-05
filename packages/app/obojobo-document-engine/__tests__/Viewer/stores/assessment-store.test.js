/* eslint no-undefined: 0 */
/* eslint no-console: 0 */

import OboModel from '../../../__mocks__/_obo-model-with-chunks'
import { Registry } from '../../../src/scripts/common/registry'
import AssessmentStore from '../../../src/scripts/viewer/stores/assessment-store'
import AssessmentUtil from '../../../src/scripts/viewer/util/assessment-util'
import QuestionStore from '../../../src/scripts/viewer/stores/question-store'
import NavStore from '../../../src/scripts/viewer/stores/nav-store'
import FocusUtil from '../../../src/scripts/viewer/util/focus-util'
import NavUtil from '../../../src/scripts/viewer/util/nav-util'
import APIUtil from '../../../src/scripts/viewer/util/api-util'
import AssessmentAPI from  '../../../src/scripts/viewer/util/assessment-api'
import Dispatcher from '../../../src/scripts/common/flux/dispatcher'
import ModalUtil from '../../../src/scripts/common/util/modal-util'
import ErrorUtil from '../../../src/scripts/common/util/error-util'
import QuestionUtil from '../../../src/scripts/viewer/util/question-util'
import LTINetworkStates from '../../../src/scripts/viewer/stores/assessment-store/lti-network-states'
import LTIResyncStates from '../../../src/scripts/viewer/stores/assessment-store/lti-resync-states'
import mockConsole from 'jest-mock-console'

jest.mock('../../../src/scripts/common/util/modal-util', () => ({
	show: jest.fn(),
	hide: jest.fn()
}))

jest.mock('../../../src/scripts/common/util/error-util', () => ({
	show: jest.fn(),
	errorResponse: jest.fn()
}))

jest.mock('../../../src/scripts/viewer/util/question-util')
jest.mock('../../../src/scripts/viewer/util/nav-util')
jest.mock('../../../src/scripts/viewer/util/api-util')
jest.mock('../../../src/scripts/viewer/util/assessment-api')
jest.mock('../../../src/scripts/viewer/util/assessment-util.js')
jest.mock('../../../src/scripts/viewer/assessment/assessment-score-reporter')
jest.mock('../../../src/scripts/viewer/util/focus-util')

describe('AssessmentStore', () => {
	let restoreConsole
	const getExampleAssessment = () => ({
		id: 'rootId',
		type: 'ObojoboDraft.Modules.Module',
		children: [
			{
				id: 'assessmentId',
				type: 'ObojoboDraft.Sections.Assessment',
				content: {},
				children: [
					{
						id: 'pageId',
						type: 'ObojoboDraft.Pages.Page'
					},
					{
						id: 'questionBankId',
						type: 'ObojoboDraft.Chunks.QuestionBank'
					}
				]
			}
		]
	})

	const mockValidStartAttempt = () => {
		AssessmentAPI.startAttempt.mockResolvedValue({
			status: 'ok',
			value: {
				attemptId: 'attemptId',
				assessmentId: 'assessmentId',
				state: {
					chosen: [
						{
							id: 'q1',
							type: 'ObojoboDraft.Chunks.Question'
						},
						{
							id: 'q2',
							type: 'ObojoboDraft.Chunks.Question'
						},
						{
							id: 'qb',
							type: 'ObojoboDraft.Chunks.QuestionBank'
						}
					]
				},
				questions: [
					{
						id: 'q1',
						type: 'ObojoboDraft.Chunks.Question',
						children: [
							{
								id: 'r1',
								type: 'ObojoboDraft.Chunks.MCAssessment'
							}
						]
					},
					{
						id: 'q2',
						type: 'ObojoboDraft.Chunks.Question',
						children: [
							{
								id: 'r2',
								type: 'ObojoboDraft.Chunks.MCAssessment'
							}
						]
					}
				]
			}
		})
	}

	beforeEach(done => {
		jest.resetAllMocks()
		restoreConsole = mockConsole('error')
		APIUtil.getVisitSessionStatus.mockResolvedValue({ status: 'ok' })
		AssessmentStore.init([])
		AssessmentStore.triggerChange = jest.fn()
		QuestionStore.init()
		QuestionStore.triggerChange = jest.fn()
		NavStore.init()

		// Need to make sure all the Obo components are loaded
		Registry.getItems(() => {
			done()
		})
	})

	afterEach(() => {
		restoreConsole()
	})

	test('init builds default state', () => {
		AssessmentStore.init([])

		expect(AssessmentStore.getState()).toMatchInlineSnapshot(`
		Object {
		  "assessmentSummary": Array [],
		  "assessments": Object {},
		  "attemptHistoryLoadState": "none",
		  "importHasBeenUsed": false,
		  "importableScore": null,
		  "isResumingAttempt": true,
		}
	`)
	})

	test('init builds with history (populates models and state, shows dialog for unfinished attempt', () => {
		OboModel.create({
			id: 'question1',
			type: 'ObojoboDraft.Chunks.Question'
		})
		OboModel.create({
			id: 'question2',
			type: 'ObojoboDraft.Chunks.Question'
		})
		const history = [
			{
				name: 'ObojoboDraft.Sections.Assessment',
				importableScore: 33.3333333
			},
			{
				name: 'ObojoboDraft.Sections.Assessment',
				assessmentSummary: [
					{
						assessmentId: 'assessmentId',
						startTime: '1/1/2017 00:05:00',
						endTime: '1/1/2017 0:05:20',
						state: {
							questions: [
								{ id: 'question1', type: 'ObojoboDraft.Chunks.Question' },
								{ id: 'question2', type: 'ObojoboDraft.Chunks.Question' }
							]
						},
						result: {
							assessmentScore: 100
						},
						questionScores: [{ id: 'question1' }, { id: 'question2' }],
						isFinished: true
					},
					{
						assessmentId: 'assessmentId',
						startTime: '1/2/2017 00:05:00',
						endTime: '1/2/2017 0:05:20',
						state: {
							questions: [
								{ id: 'question1', type: 'ObojoboDraft.Chunks.Question' },
								{ id: 'question2', type: 'ObojoboDraft.Chunks.Question' }
							]
						},
						result: {
							assessmentScore: 100
						},
						questionScores: [{ id: 'question1' }, { id: 'question2' }],
						isFinished: false
					}
				]
			}
		]

		AssessmentStore.init(history)

		expect(AssessmentStore.getState()).toMatchObject({
			assessmentSummary: history[1].assessmentSummary,
			assessments: {},
			attemptHistoryLoadState: "none",
			importHasBeenUsed: false,
			importableScore: 33.3333333,
			isResumingAttempt: true,
		})

		expect(Object.keys(OboModel.models).length).toEqual(2)
		expect(ModalUtil.show).toHaveBeenCalledTimes(1)
	})

	test('resuming an unfinished attempt hides the modal, starts the attempt and triggers a change', () => {
		const mockResumeAttemptResponse = {
			status: 'ok',
			value: { mockValue: true }
		}

		AssessmentAPI.resumeAttempt.mockResolvedValueOnce(mockResumeAttemptResponse)
		jest.spyOn(AssessmentStore, 'updateStateAfterStartAttempt')
		AssessmentStore.updateStateAfterStartAttempt.mockReturnValueOnce()

		return AssessmentStore.resumeAttemptWithAPICall('resume-attempt-id').then(() => {
			expect(ModalUtil.hide).toHaveBeenCalledTimes(1)
			expect(AssessmentStore.updateStateAfterStartAttempt).toHaveBeenCalledTimes(1)
			expect(AssessmentStore.updateStateAfterStartAttempt).toHaveBeenCalledWith(mockResumeAttemptResponse.value)
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)

			AssessmentStore.updateStateAfterStartAttempt.mockRestore()
		})
	})

	test('startAttemptWithAPICall shows an error if no attempts are left and triggers a change', () => {
		OboModel.create(getExampleAssessment())

		AssessmentAPI.startAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Attempt limit reached'
			}
		})

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
		.then(() => {
			expect(ErrorUtil.show).toHaveBeenCalledTimes(1)
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
		})
	})

	test('startAttemptWithAPICall shows a generic error if an unrecognized error is thrown and triggers a change', () => {
		OboModel.create(getExampleAssessment())

		AssessmentAPI.startAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Some unexpected error that was not accounted for'
			}
		})

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
		.then(() => {
			expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(1)
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
		})
	})

	test('startAttemptWithAPICall rejects with unexpected errors', () => {
		OboModel.create(getExampleAssessment())

		// cause ErrorUtil.show to be called
		AssessmentAPI.startAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'attempt limit reached'
			}
		})

		// use this to throw an unexpected error
		ErrorUtil.show.mockImplementationOnce(() => {
			throw new Error('Unexpected Error')
		})

		return expect(AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId'))
		.rejects.toThrow('Unexpected Error')
	})

	test('startAttemptWithAPICall injects question models, creates state, updates the nav and processes the onStartAttempt trigger', () => {
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		NavUtil.rebuildMenu = jest.fn()
		NavUtil.goto = jest.fn()

		const assessmentModel = OboModel.models.rootId.children.at(0)
		const qBank = assessmentModel.children.at(1)

		assessmentModel.processTrigger = jest.fn()

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
		.then(() => {
			expect(assessmentModel.children.length).toBe(2)
			expect(qBank.children.length).toBe(2)
			expect(qBank.children.at(0).id).toBe('q1')
			expect(qBank.children.at(1).id).toBe('q2')
			expect(NavUtil.rebuildMenu).toHaveBeenCalledTimes(1)
			expect(NavUtil.goto).toHaveBeenCalledTimes(1)
			expect(NavUtil.goto).toHaveBeenCalledWith('assessmentId')
			expect(OboModel.models.assessmentId.processTrigger).toHaveBeenCalledWith('onStartAttempt')
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
		})
	})

	test('startAttemptWithAPICall builds an attempt if it doesnt exist', () => {
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentStore.setState({ assessments: { assessmentId: {} } })

		NavUtil.rebuildMenu = jest.fn()
		NavUtil.goto = jest.fn()

		const assessmentModel = OboModel.models.rootId.children.at(0)
		const qBank = assessmentModel.children.at(1)

		assessmentModel.processTrigger = jest.fn()

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId').then(() => {
			expect(assessmentModel.children.length).toBe(2)
			expect(qBank.children.length).toBe(2)
			expect(qBank.children.at(0).id).toBe('q1')
			expect(qBank.children.at(1).id).toBe('q2')
			expect(NavUtil.rebuildMenu).toHaveBeenCalledTimes(1)
			expect(NavUtil.goto).toHaveBeenCalledTimes(1)
			expect(NavUtil.goto).toHaveBeenCalledWith('assessmentId')
			expect(OboModel.models.assessmentId.processTrigger).toHaveBeenCalledWith('onStartAttempt')
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
		})
	})

	test('tryResendLTIScore catches unexpected errors', () => {
		OboModel.create(getExampleAssessment())

		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({})
		AssessmentStore.setState({ assessments: { assessmentId: {} } })

		AssessmentAPI.resendLTIAssessmentScore.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'attempt limit reached'
			}
		})
		ErrorUtil.errorResponse.mockImplementationOnce(() => {
			throw new Error('Mock Error')
		})

		return AssessmentStore.tryResendLTIScore('assessmentId').then(() => {
			expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(1)
			expect(console.error).toHaveBeenCalledWith(expect.any(Error))
		})
	})

	test('tryResendLTIScore returns with error', () => {
		expect.assertions(2)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentStore.setState({
			assessments: {
				assessmentId: {}
			}
		})

		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce(
			AssessmentStore.getState().assessments.assessmentId
		)
		AssessmentAPI.resendLTIAssessmentScore.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Some unexpected error that was not accounted for'
			}
		})

		return AssessmentStore.tryResendLTIScore('assessmentId').then(() => {
			expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(1)
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
		})
	})

	test('tryResendLTIScore updates and triggersChange', () => {
		expect.assertions(2)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentStore.setState({
			assessments: {
				assessmentId: {}
			}
		})

		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce(
			AssessmentStore.getState().assessments.assessmentId
		)
		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce(
			AssessmentStore.getState().assessments.assessmentId
		)

		AssessmentAPI.resendLTIAssessmentScore.mockResolvedValueOnce({
			status: 'success',
			value: {}
		})

		return AssessmentStore.tryResendLTIScore('assessmentId').then(() => {
			expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(0)
			expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(3)
		})
	})

	test('updateLTIScore updates resyncState to failed if resync fails, updates lti object, calls triggerChange', () => {
		AssessmentUtil.isLTIScoreNeedingToBeResynced.mockReturnValueOnce(true)
		const assessment = {}

		AssessmentStore.updateLTIScore(assessment, 'mock-lti-response')

		expect(assessment).toEqual({
			ltiResyncState: LTIResyncStates.RESYNC_FAILED,
			lti: 'mock-lti-response'
		})
		expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
	})

	test('updateLTIScore updates resyncState to success if resync works, updates lti object, calls triggerChange', () => {
		AssessmentUtil.isLTIScoreNeedingToBeResynced.mockReturnValueOnce(false)
		const assessment = {}

		AssessmentStore.updateLTIScore(assessment, 'mock-lti-response')

		expect(assessment).toEqual({
			ltiResyncState: LTIResyncStates.RESYNC_SUCCEEDED,
			lti: 'mock-lti-response'
		})
		expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(1)
	})

	test('endAttemptWithAPICall catches unexpected errors', () => {
		OboModel.create(getExampleAssessment())

		AssessmentStore.setState({
			assessments: { assessmentId: { current: { attemptId: 'mockAttemptId' } } }
		})

		AssessmentAPI.endAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'attempt limit reached'
			}
		})
		ErrorUtil.errorResponse.mockImplementationOnce(() => {
			throw new Error('Mock Error')
		})

		return AssessmentStore.endAttemptWithAPICall('assessmentId', 'mock-context').then(() => {
			expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(1)
			expect(console.error).toHaveBeenCalledWith(expect.any(Error))
		})
	})

	test('endAttempt shows an error if the endAttempt request fails and triggers a change', () => {
		expect.assertions(2)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentAPI.endAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Some unexpected error that was not accounted for'
			}
		})

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
			.then(() => AssessmentStore.endAttemptWithAPICall('assessmentId'))
			.then(() => {
				expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(1)
				expect(AssessmentStore.triggerChange).toHaveBeenCalledTimes(2)
			})
	})

	test('endAttempt hides questions, resets responses, updates state, processes onEndAttempt trigger and triggers a change', () => {
		expect.assertions(4)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentStore.setState({
			assessments: {
				assessmentId: {
					currentResponses: ['question1', 'question2'],
					attempts: []
				}
			}
		})

		AssessmentAPI.endAttempt = jest.fn()
		AssessmentAPI.endAttempt.mockResolvedValueOnce({
			status: 'mockStatus',
			value: {
				status: 1
			}
		})

		AssessmentAPI.getAttemptHistory = jest.fn()
		AssessmentAPI.getAttemptHistory.mockResolvedValueOnce({
			status: 'ok',
			value: [
				{
					assessmentId: 'assessmentId',
					endTime: '1/1/2017 0:05:20',
					isFinished: true,
					scoreDetails:{
						status: 1
					},
					questionScores: [{ id: 'question1' }, { id: 'question2' }],
					result: { assessmentScore: 100 },
					startTime: '1/1/2017 00:05:00',
					state: {
						questions: [
							{ id: 'question1', type: 'ObojoboDraft.Chunks.Question' },
							{ id: 'question2', type: 'ObojoboDraft.Chunks.Question' }
						]
					}
				}
			]
		})

		AssessmentUtil.getLastAttemptForModel.mockReturnValueOnce({
			attemptNumber: 1
		})



		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
			.then(() => AssessmentStore.trySetResponse('q1', { responseForR1: 'someValue' }))
			.then(() => AssessmentStore.endAttemptWithAPICall('assessmentId', 'mockContext'))
			.then(() => {
				expect(ErrorUtil.errorResponse).toHaveBeenCalledTimes(0)
				expect(QuestionUtil.hideQuestion).toHaveBeenCalledTimes(2)
				expect(QuestionUtil.hideQuestion).toHaveBeenCalledWith('q1', 'mockContext')
				expect(QuestionUtil.hideQuestion).toHaveBeenCalledWith('q2', 'mockContext')
			})
	})

	test('trySetResponse will not update with no Assessment', () => {
		expect.assertions(1)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
			.then(() => AssessmentStore.trySetResponse('q1', ['some response']))
			.then(() => {
				expect(AssessmentUtil.getAssessmentForModel).toHaveBeenCalled()
			})
	})

	test('trySetResponse will update state', () => {
		expect.assertions(2)
		mockValidStartAttempt()
		OboModel.create(getExampleAssessment())

		AssessmentUtil.getAssessmentForModel.mockReturnValueOnce({
			currentResponses: ['q2']
		})

		return AssessmentStore.startAttemptWithAPICall('draftId', 'visitId', 'assessmentId')
			.then(() => AssessmentStore.trySetResponse('q1', ['some response']))
			.then(() => {
				expect(AssessmentUtil.getAssessmentForModel).toHaveBeenCalled()
				expect(AssessmentStore.triggerChange).toHaveBeenCalled()
			})
	})

	test('setState will update state', () => {
		expect.assertions(1)

		AssessmentStore.setState('mockState')

		expect(AssessmentStore.getState()).toEqual('mockState')
	})

	test('assessment:startAttempt calls tryStartAttempt', () => {
		jest.spyOn(AssessmentStore, 'tryStartAttempt')
		AssessmentStore.tryStartAttempt.mockReturnValueOnce('mock')

		Dispatcher.trigger('assessment:startAttempt', { value: {} })

		expect(AssessmentStore.tryStartAttempt).toHaveBeenCalled()
	})

	test('assessment:endAttempt calls endAttemptWithAPICall', () => {
		jest.spyOn(AssessmentStore, 'endAttemptWithAPICall')
		AssessmentStore.endAttemptWithAPICall.mockReturnValueOnce('mock')

		AssessmentStore.setState({
			assessments: {
				assessmentId: {}
			}
		})
		AssessmentAPI.endAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Some unexpected error that was not accounted for'
			}
		})

		Dispatcher.trigger('assessment:endAttempt', {
			value: { id: 'assessmentId' }
		})

		expect(AssessmentStore.endAttemptWithAPICall).toHaveBeenCalled()
	})

	test('assessment:resendLTIScore calls tryResendLTIScore', () => {
		jest.spyOn(AssessmentStore, 'tryResendLTIScore')
		AssessmentStore.tryResendLTIScore.mockReturnValueOnce('mock')

		AssessmentStore.setState({
			assessments: {
				assessmentId: {}
			}
		})
		AssessmentAPI.endAttempt.mockResolvedValueOnce({
			status: 'error',
			value: {
				message: 'Some unexpected error that was not accounted for'
			}
		})

		Dispatcher.trigger('assessment:resendLTIScore', {
			value: { id: 'assessmentId' }
		})

		expect(AssessmentStore.tryResendLTIScore).toHaveBeenCalled()
	})

	test('question:setResponse calls trySetResponse', () => {
		jest.spyOn(AssessmentStore, 'trySetResponse')
		AssessmentStore.trySetResponse.mockReturnValueOnce('mock')

		Dispatcher.trigger('question:setResponse', { value: { id: 'q1' } })

		expect(AssessmentStore.trySetResponse).toHaveBeenCalled()
	})

	test('viewer:closeAttempted calls AssessmentUtil', () => {
		Dispatcher.trigger('viewer:closeAttempted')

		expect(AssessmentUtil.isInAssessment).toHaveBeenCalled()
	})

	test('viewer:closeAttempted calls AssessmentUtil', () => {
		AssessmentUtil.isInAssessment.mockReturnValueOnce(true)
		const mockFunction = jest.fn()

		Dispatcher.trigger('viewer:closeAttempted', mockFunction)

		expect(AssessmentUtil.isInAssessment).toHaveBeenCalled()
		expect(mockFunction).toHaveBeenCalled()
	})

	test('updateAttempts sets highestAttemptScoreAttempts and highestAssessmentScoreAttempts correctly', () => {
		AssessmentUtil.findHighestAttempts.mockImplementation((attempts, prop) => {
			return 'Called with ' + prop
		})

		AssessmentStore.updateAttempts([
			{
				assessmentId: 'assessmentId',
				attempts: [
					{
						attemptId: 'attempt-1',
						attemptScore: 0,
						assessmentScore: null,
						state: {
							questions: []
						}
					}
				]
			}
		])

		const state = AssessmentStore.getState()
		const assessState = state.assessments.assessmentId
		expect(assessState.highestAttemptScoreAttempts).toEqual('Called with attemptScore')
		expect(assessState.highestAssessmentScoreAttempts).toEqual('Called with assessmentScore')
	})

	test('onCloseResultsDialog hides modal and focuses on nav target content', () => {
		AssessmentStore.onCloseResultsDialog()

		expect(ModalUtil.hide).toHaveBeenCalledTimes(1)
		expect(FocusUtil.focusOnNavTarget).toHaveBeenCalledTimes(1)
	})
})
