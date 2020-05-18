const express = require('express')
const sig = require('oauth-signature')
const router = express.Router()
// const { requireCanViewEditor, requireCurrentDocument } = oboRequire('server/express_validators')
// const { assetForEnv, webpackAssetPath } = oboRequire('server/asset_resolver')
const ltiLaunch = require('obojobo-express/server/express_lti_launch')
const config = require('obojobo-express/server/config')
const oauthKey = Object.keys(config.lti.keys)[0]
const oauthSecret = config.lti.keys[oauthKey]
const User = require('obojobo-express/server/models/user')

const NODE_TYPE_CONNECTOR = 'connector'
const NODE_TYPE_LAUNCH = 'launch'
const NODE_TYPE_FINISH = 'finish'

// MOCK DATABASE DATA
const ltiPathsTABLE = [
	{
		id: '7e74b56a-c253-45c7-bd14-e36a303c6fcb',
		title: 'Test A/B Path',
		userId: '140780',
		startNodeId: '76d1cf0a-c0a7-4b03-b1b6-24e54dec60c0',
		displayMode: 'none',
		pathNodes: [
			{
				id: '76d1cf0a-c0a7-4b03-b1b6-24e54dec60c0',
				type: NODE_TYPE_CONNECTOR,
				title: 'Begin',
				typeSettings:{
					fn: 'a-or-b',
					random: true,
					sticky: true,
				},
				next: [
					'b3f41605-6000-43d9-b239-fb40758dfcbf',
					'cc6d6e59-e4c3-41c5-b5cf-0524417e0578'

				]
			},
			{
				id: 'b3f41605-6000-43d9-b239-fb40758dfcbf',
				type: NODE_TYPE_LAUNCH,
				title: 'Module A',
				typeSettings: {
					ltiConfigId: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
					launchUrl: 'https://127.0.0.1:8080/view/00000000-0000-0000-0000-000000000000',
				},
				next: [
					'7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a'
				]
			},
			{
				id: 'cc6d6e59-e4c3-41c5-b5cf-0524417e0578',
				type: NODE_TYPE_LAUNCH,
				title: 'Module B',
				typeSettings: {
					ltiConfigId: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
					launchUrl: 'https://127.0.0.1:8080/view/9d8d3f46-9063-45cc-9a05-c8ffc6b68dea',
				},
				next: [
					'76d1cf0a-c0a7-4b03-b1b6-24e54dec60gg'
				]
			},
			{
				id: '76d1cf0a-c0a7-4b03-b1b6-24e54dec60gg',
				type: NODE_TYPE_CONNECTOR,
				title: 'ChooseAgain',
				typeSettings:{
					fn: 'a-or-b',
					random: true,
					sticky: true,
				},
				next: [
					'cc6d6e59-e4c3-41c5-b5cf-0524417e05aa',
					'cc6d6e59-e4c3-41c5-b5cf-0524417e0eee'

				]
			},
			{
				id: 'cc6d6e59-e4c3-41c5-b5cf-0524417e05aa',
				type: NODE_TYPE_LAUNCH,
				title: 'Module E',
				typeSettings: {
					ltiConfigId: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
					launchUrl: 'https://127.0.0.1:8080/view/9d8d3f46-9063-45cc-9a05-c8ffc6b68dea',
				},
				next: [
					'7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a1'
				]
			},
			{
				id: 'cc6d6e59-e4c3-41c5-b5cf-0524417e0eee',
				type: NODE_TYPE_LAUNCH,
				title: 'Module F',
				typeSettings: {
					ltiConfigId: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
					launchUrl: 'https://127.0.0.1:8080/view/9d8d3f46-9063-45cc-9a05-c8ffc6b68dea',
				},
				next: [
					'7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a2'
				]
			},
			{
				id: '7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a1',
				type: NODE_TYPE_FINISH,
				title: 'Finish',
				typeSettings: {
					fn: 'finish',
					ltiScorePassback: true,
					scoreMode: 'highetst', // average, latest
				}
			},
			{
				id: '7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a2',
				type: NODE_TYPE_FINISH,
				title: 'Finish',
				typeSettings: {
					fn: 'finish',
					ltiScorePassback: true,
					scoreMode: 'highetst', // average, latest
				}
			},
			{
				id: '7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a',
				type: NODE_TYPE_FINISH,
				title: 'Finish',
				typeSettings: {
					fn: 'finish',
					ltiScorePassback: true,
					scoreMode: 'highetst', // average, latest
				}
			},
			{
				id: '7d4cb20d-4b33-46dd-b4f3-d1b0d5e16692',
				type: NODE_TYPE_FINISH,
				title: 'Finish',
				typeSettings: {
					fn: 'finish',
					ltiScorePassback: true,
					scoreMode: 'highetst', // average, latest
				}
			}
		]
	}
]

const ltiConfigsTABLE = [
	{
		id: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
		name: 'Obojobo Next',
		selectionUrl: 'https://127.0.0.1:8080/lti/canvas/assignment_selection',
		navigationUrl: 'https://127.0.0.1:8080/lti/canvas/course_navigation',
		oauthKey,
		oauthSecret
	}
]


const userPathStateTABLE = [
	// {
	// 	pathId: '7e74b56a-c253-45c7-bd14-e36a303c6fcb',
	// 	userId: '140780',
	// 	currentNodeId: null,
	// 	nodeStates: {}
	// },
]

// util to get a baseUrl for inernal requests
const baseUrl = req => `${req.protocol}://${req.get('host')}`

// returns ints from 0 to max (including max)
const getRandomInt = max => {
	return Math.floor(Math.random() * Math.floor(max+1));
}

const connectorFnAorB = (node, path, state) => {
	const settings = node.typeSettings
	let nextId
	if(settings.sticky === true){
		// if already selected, return that one
		const nodeState = state.nodeStates[node.id]
		if(nodeState && nodeState.selectedId){
			nextId = nodeState.selectedId
		}
	}

	if(!nextId){
		if(settings.random === true){
			const nextIndex = getRandomInt(node.next.length -1)
			nextId = node.next[nextIndex]
		}
		// @TODO: other options
		// * round robin
		// * provided list (fall back onto what method if missing from list?)
		// * ask an api?
	}

	// @TODO save state to db
	if(!state.nodeStates[node.id]) state.nodeStates[node.id] = {}
	state.nodeStates[node.id].selectedId = nextId
	state.currentNodeId = nextId

	return nextId
}

const connectorFnFinish = (node, path, state) => {
	return node.id
}

const connectorFnLaunch = (node, path, state) => {
	return node.id
}

const connectorFnMap = new Map()
connectorFnMap.set('a-or-b', connectorFnAorB)
connectorFnMap.set('launch', connectorFnLaunch)
connectorFnMap.set('finish', connectorFnFinish)

const obojoboUserProviderFromLaunch = (ltiBody, config) => {
	// Save/Create a user based on lti launch params
	const newUser = new User({
		username: ltiBody[config.usernameParam],
		email: ltiBody.lis_person_contact_email_primary,
		firstName: ltiBody.lis_person_name_given,
		lastName: ltiBody.lis_person_name_family,
		roles: ltiBody.roles
	})

	return newUser.saveOrCreate()
}

const obojoboUserProviderFromId = id => {
	// Save/Create a user based on lti launch params
	return User.fetchById(id)
}


const calculateCurrentNode = (path, state) => {
	let currentNode
	let selectedNode

	if(state.currentNodeId){
		currentNode = fetchPathNodeById(path, state.currentNodeId)
	}
	else{
		currentNode = fetchPathNodeById(path, path.startNodeId)
	}

	if(currentNode.type === NODE_TYPE_LAUNCH){
		if(state.nodeStates && state.nodeStates[currentNode.id] && state.nodeStates[currentNode.id].score >= 0 ){
			currentNode = fetchPathNodeById(path, currentNode.next[0])
		}
	}

	// @TODO this may need to be recursive?
	if(currentNode.type === NODE_TYPE_CONNECTOR){
		const connectorFn = connectorFnMap.get(currentNode.typeSettings.fn)
		const selectedNodeId = connectorFn(currentNode, path, state)
		selectedNode = path.pathNodes.find(node => node.id === selectedNodeId)
	}

	if(currentNode.type === NODE_TYPE_FINISH){
		const score = getHighestPathScore(state)
		state.score = score
	}

	return selectedNode || currentNode
}

const getHighestPathScore = state => {
	let highScore = -1
	for(const nodeId in state.nodeStates){
		if(state.nodeStates[nodeId].score && state.nodeStates[nodeId].score > highScore){
			highScore = state.nodeStates[nodeId].score
		}
	}

	return highScore
}

// constructs a signed lti request and sends it.
const renderLtiLaunch = (paramsIn, ltiConfig, endpoint, res) => {
	method = 'POST'
	// add the required oauth params to the given prams
	const oauthParams = {
		oauth_nonce: Math.round(new Date().getTime() / 1000.0),
		oauth_timestamp: Math.round(new Date().getTime() / 1000.0),
		oauth_callback: 'about:blank',
		oauth_consumer_key: ltiConfig.oauthKey,
		oauth_signature_method: 'HMAC-SHA1',
		oauth_version: '1.0'
	}

	// collect params to generate signature
	const params = { ...paramsIn, ...oauthParams }
	const hmac_sha1 = sig.generate(method, endpoint, params, ltiConfig.oauthSecret, '', {
		encodeSignature: false
	})

	// append signature to params AFTER calculating the signature
	params['oauth_signature'] = hmac_sha1

	// generate the html needed for the user's browser to submit the launch
	const keys = Object.keys(params)
	const htmlInput = keys
		.map(key => `<input type="hidden" name="${key}" value="${params[key]}"/><br/>`)
		.join('')

	res.set('Content-Type', 'text/html')
	res.send(`<html>
		<body>
		<form id="form" method="${method}" action="${endpoint}" >${htmlInput}</form>
		<script>document.getElementById('form').submit()</script>
		</body></html>`)
}

const proxyLaunchParams = sourceParams => {
	const paramsToCopy = [
		'lis_person_contact_email_primary',
		'lis_person_contact_email_primary',
		'lis_person_name_family',
		'lis_person_name_full',
		'lis_person_name_given',
		'lis_person_sourcedid',
		'roles',
		'user_id'
	]

	const copiedParams = {}

	paramsToCopy.forEach(param => {if(sourceParams[param]) copiedParams[param] = sourceParams[param]})
	return copiedParams
}

const getLtiConfigForNode = node => {
	return ltiConfigsTABLE.find(cfg => cfg.id === node.typeSettings.ltiConfigId) || {}
}

const fetchPathById = pathId => {
	return ltiPathsTABLE.find(path => path.id === pathId)
}

const fetchPathNodeById = (path, nodeId) => {
	return path.pathNodes.find(node => node.id === nodeId)
}

const fetchOrCreateUserPathState = (pathId, userId) => {

	// @TODO: select from database
	let state = userPathStateTABLE.find(state => state.pathId === pathId && state.userId === userId)

	// initialize Default State
	if(!state){
		state = {
			pathId,
			userId,
			score: null,
			currentNodeId: null,
			launch: {},
			nodeStates: {}
		}
		// @TODO: insert into database
		userPathStateTABLE.push(state)
	}

	return state
}


// LTI PATHS Launch URL
router
	.route('/lti-paths/launch/:pathId')
	// .get([requireCanViewEditor, requireCurrentDocument])
	.post(async (req, res) => {

		// @TODO: allow other providers here
		const user = await obojoboUserProviderFromLaunch(req.lti.body, config.lti)

		// @TODO: select from database
		const path = fetchPathById(req.params.pathId)

		const state = fetchOrCreateUserPathState(req.params.pathId, user.id)

		const node = calculateCurrentNode(path, state)

		// save lti params to the state
		state.launch = req.lti.body

		const props = {
			pathId: path.id,
			nodeId: node.id,
			userId: user.id
		}

		const proxiedLaunchParams = proxyLaunchParams(req.lti.body)
		props.iframeUrl = `/lti-paths/${path.id}/${node.id}/${user.id}/provider-launch`

		res.render('student-viewer', {props: JSON.stringify(props)})


		// return

		// const thisAppsLaunchParams = {
		// 	launch_presentation_document_target: 'frame',
		// 	launch_presentation_locale: 'en-US',
		// 	// launch_presentation_return_url: `${baseUrl(req)}/lti-paths/score-passback/${path.id}/${node.id}`,
		// 	lis_course_offering_sourcedid: '@TODO',
		// 	lis_course_section_sourcedid: '@TODO',
		// 	lis_outcome_service_url: `${baseUrl(req)}/lti-paths/score-passback/${user.id}/${path.id}/${node.id}`,
		// 	lis_result_sourcedid: `${user.id}}__${path.id}__${node.id}`,
		// 	lti_message_type: 'basic-lti-launch-request',
		// 	lti_version: 'LTI-1p0',
		// 	resource_link_id: `${req.lti.body.resource_link_id}__${user.id}__${path.id}__${node.id}`,
		// 	resource_link_title: '@TODO'
		// }

		// const ltiConfigForNode = getLtiConfigForNode(node)

		// renderLtiLaunch(
		// 	{ ...thisAppsLaunchParams, ...proxiedLaunchParams },
		// 	ltiConfigForNode,
		// 	node.typeSettings.launchUrl,
		// 	res
		// )
	})


router
	.route('/lti-paths/:pathId/:nodeId/:userId/finish')
	.get((req, res) => {
		res.render('finish', {})
	})


router
	.route('/lti-paths/:pathId/:nodeId/:userId/tree')
	.get((req, res) => {
		res.render('tree', {})
	})

router
	.route('/lti-paths/:pathId/:nodeId/:userId/status')
	.get(async (req, res) => {
		const user = await obojoboUserProviderFromId(req.params.userId)
		const path = fetchPathById(req.params.pathId)
		const node = fetchPathNodeById(path, req.params.nodeId)
		const state = fetchOrCreateUserPathState(req.params.pathId, user.id)
		res.json({
			user,
			path,
			node,
			state
		})
	})


// @TODO this is insecure - make sure it gets protected
router
	.route('/lti-paths/:pathId/:nodeId/:userId/provider-launch')
	// .get([requireCanViewEditor, requireCurrentDocument])
	.get(async (req, res) => {
		// @TODO: allow other providers here
		const user = await obojoboUserProviderFromId(req.params.userId)
		const path = fetchPathById(req.params.pathId)
		const node = fetchPathNodeById(path, req.params.nodeId)
		const state = fetchOrCreateUserPathState(req.params.pathId, user.id)
		const ltiConfigForNode = getLtiConfigForNode(node)
		const proxiedLaunchParams = proxyLaunchParams(state.launch)

		const thisAppsLaunchParams = {
			launch_presentation_document_target: 'frame',
			launch_presentation_locale: 'en-US',
			// launch_presentation_return_url: `${baseUrl(req)}/lti-paths/score-passback/${path.id}/${node.id}`,
			lis_course_offering_sourcedid: '@TODO',
			lis_course_section_sourcedid: '@TODO',
			lis_outcome_service_url: `${baseUrl(req)}/lti-paths/${path.id}/${node.id}/${user.id}/score-passback`,
			lis_result_sourcedid: `${path.id}__${node.id}__${user.id}`,
			lti_message_type: 'basic-lti-launch-request',
			lti_version: 'LTI-1p0',
			resource_link_id: `${state.launch.resource_link_id}__${path.id}__${node.id}__${user.id}`,
			resource_link_title: '@TODO'
		}

		renderLtiLaunch(
			{ ...thisAppsLaunchParams, ...proxiedLaunchParams },
			ltiConfigForNode,
			node.typeSettings.launchUrl,
			res
		)
	})

// recieve LTI score passbacks from anything we launch
router
	.route('/lti-paths/:pathId/:nodeId/:userId/score-passback')
	.post(async (req, res, next) => {

		const path = fetchPathById(req.params.pathId)
		const state = fetchOrCreateUserPathState(path.id, req.params.userId)
		const node = fetchPathNodeById(path, req.params.nodeId)

		// @TODO validate lti signature
		const score = parseInt(parseFloat(req.body.imsx_POXEnvelopeRequest.imsx_POXBody[0].replaceResultRequest[0].resultRecord[0].result[0].resultScore[0].textString[0]) * 100, 10)

		// @TODO WRITE TO DB
		if(!state.nodeStates[node.id]) state.nodeStates[node.id] = {}
		state.nodeStates[node.id].score = score

		const viewParams = {
			score: score,
			messageId: '@TODO',
			id: '@TODO',
			messageRefId: '@TODO',

		}
		res.type('xml')
		res.render('success_response_xml', viewParams)
	})

module.exports = router
