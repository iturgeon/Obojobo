var express = require('express')
var router = express.Router()
let logger = oboRequire('logger')
const Visit = oboRequire('models/visit')

// Start a preview - redirects to visit route
// mounts at /preview/:draftId
router.get('/:draftId', (req, res, next) => {
	let user = null
	let draft = null
	return req
		.requireCurrentUser()
		.then(currentUser => {
			user = currentUser
			return req.requireCurrentDraft()
		})
		.then(currentDraft => {
			draft = currentDraft
			if (!user.canViewEditor) throw new Error('Not authorized to preview')

			return Visit.createPreviewVisit(user.id, draft.draftId)
		})
		.then(
			visit =>
				new Promise((resolve, reject) => {
					// Saving session here solves #128
					req.session.save(err => {
						if (err) return reject(err)
						resolve(visit)
					})
				})
		)
		.then(visit => {
			res.redirect(`/view/${draft.draftId}/visit/${visit.id}`)
		})
		.catch(error => {
			logger.error(error)
			next(error)
		})
})

module.exports = router
