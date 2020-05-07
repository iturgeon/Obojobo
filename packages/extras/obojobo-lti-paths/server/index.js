const path = require('path')
const express = require('express')
const app = express()

app.on('mount', app => {
	//  add our static directory
	app.use(express.static(path.join(__dirname, 'public')))

	// append our view path to the configured view paths
	let viewPaths = app.get('views')
	if (!Array.isArray(viewPaths)) viewPaths = [viewPaths]
	viewPaths.push(path.resolve(`${__dirname}/views`)) // add the components dir so babel can transpile the jsx
	app.set('views', viewPaths)

	// =========== ROUTING & CONTROLLERS ===========
	app.use('/', require('./routes/index'))

	// register the event listeners
	// require('./events')
})

module.exports = app
