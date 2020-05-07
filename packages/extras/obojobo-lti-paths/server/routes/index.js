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
				type: 'connector',
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
				type: 'launch',
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
				type: 'launch',
				title: 'Module B',
				typeSettings: {
					ltiConfigId: '94e426f8-7ae2-4266-af25-ff47e88d03fb',
					launchUrl: 'https://127.0.0.1:8080/view/9d8d3f46-9063-45cc-9a05-c8ffc6b68dea',
				},
				next: [
					'7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a'
				]
			},
			{
				id: '7d4cb20d-4b33-46dd-b4f3-d1b0d5e1669a',
				type: 'connector',
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

const connectorAorB = (node, path, state) => {
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

	return nextId
}

const connectorFinish = (node, path, state) => {

}

const connectorFnMap = new Map()
connectorFnMap.set('a-or-b', connectorAorB)
connectorFnMap.set('finish', connectorFinish)

const obojoboUserProvider = (ltiBody, config) => {
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


const calculateNextNode = (path, state) => {
	let currentNode
	let nextNode

	if(state.currentNodeId){
		currentNode = fetchPathNodeById(path, state.currentNodeId)
	}
	else{
		currentNode = fetchPathNodeById(path, path.startNodeId)
	}

	// @TODO this may need to be recursive?
	if(currentNode.type === NODE_TYPE_CONNECTOR){
		const connectorFn = connectorFnMap.get(currentNode.typeSettings.fn)
		const nextId = connectorFn(currentNode, path, state)
		nextNode = path.pathNodes.find(node => node.id === nextId)

		// @TODO save state to db
		if(!state.nodeStates[currentNode.id]) state.nodeStates[currentNode.id] = {}
		state.nodeStates[currentNode.id].selectedId = nextNode.id
		state.currentNodeId = nextNode.id
	}

	return nextNode || currentNode
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
		<h2>LTIPath is launching to:</h2>
		<h1>${endpoint}</h1>
		<form id="form" method="${method}" action="${endpoint}" >${htmlInput}</form>
		<script>setTimeout(() => document.getElementById('form').submit(), 8000)</script>
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
		console.log('NEW?!', state)
		state = {
			pathId,
			userId,
			currentNodeId: null,
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
		if (!req.lti) {
			next('Not a valid LTI Launch.')
		}

		// @TODO: allow other providers here
		const user = await obojoboUserProvider(req.lti.body, config.lti)

		// @TODO: select from database
		const path = fetchPathById(req.params.pathId)

		const state = fetchOrCreateUserPathState(req.params.pathId, user.id)

		const node = calculateNextNode(path, state)

		const proxiedLaunchParams = proxyLaunchParams(req.lti.body)

		const thisAppsLaunchParams = {
			launch_presentation_document_target: 'frame',
			launch_presentation_locale: 'en-US',
			// launch_presentation_return_url: `${baseUrl(req)}/lti-paths/score-passback/${path.id}/${node.id}`,
			lis_course_offering_sourcedid: '@TODO',
			lis_course_section_sourcedid: '@TODO',
			lis_outcome_service_url: `${baseUrl(req)}/lti-paths/score-passback/${user.id}/${path.id}/${node.id}`,
			lis_result_sourcedid: `${user.id}}__${path.id}__${node.id}`,
			lti_message_type: 'basic-lti-launch-request',
			lti_version: 'LTI-1p0',
			resource_link_id: `${req.lti.body.resource_link_id}__${user.id}__${path.id}__${node.id}`,
			resource_link_title: '@TODO'
		}

		const ltiConfigForNode = getLtiConfigForNode(node)

		console.log(userPathStateTABLE)

		renderLtiLaunch(
			{ ...thisAppsLaunchParams, ...proxiedLaunchParams },
			ltiConfigForNode,
			node.typeSettings.launchUrl,
			res
		)
	})


// recieve LTI socre passbacks from anything we launch
router
	.route('/lti-paths/score-passback/:userId/:pathId/:nodeId/')
	.post(async (req, res, next) => {
		console.log(req.body)
		// @TODO validate lti signature

		const path = fetchPathById(req.params.pathId)
		const state = fetchOrCreateUserPathState(path.id, req.params.userId)
		const node = fetchPathNodeById(path, req.params.nodeId)


		// @TODO WRITE TO DB
		if(!state.nodeStates[node.id]) state.nodeStates[node.id] = {}
		state.nodeStates[node.id].score = 1
		console.log(state)

		const viewParams = {
			score: 1,
			messageId: '@TODO',
			id: '@TODO',
			messageRefId: '@TODO',

		}
		res.type('xml')
		res.render('success_response_xml', viewParams)
	})

module.exports = router
