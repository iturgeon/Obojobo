Backbone = require 'backbone'

ComponentClassMap = require '../util/componentclassmap'

class Chunk extends Backbone.Model
	defaults: ->
		type: 'none'
		data: {}

	addBefore: (sibling) ->
		@collection.add sibling, { at:@getIndex() }

	addAfter: (sibling) ->
		@collection.add sibling, { at:@getIndex() + 1 }

	getIndex: ->
		@collection.indexOf @

	prevSibling: ->
		@collection.at @getIndex() - 1

	nextSibling: ->
		@collection.at @getIndex() + 1

	remove: ->
		@collection.remove @

	replaceWith: (newChunk) ->
		index = @getIndex()
		collection = @collection

		collection.remove @
		collection.add newChunk, { at:index }

	getComponent: ->
		ComponentClassMap.getClassForType @get('type')

	callComponentFn: (fn, sel, data) ->
		# console.log 'callComponentFn', @, arguments, @get('type'), ComponentClassMap.getClassForType(@get('type')), ComponentClassMap.getClassForType(@get('type'))[fn]
		componentClass = @getComponent()
		if not componentClass[fn] then return null
		componentClass[fn].apply componentClass, [sel, @].concat(data)

	getDomEl: ->
		document.body.querySelector ".component[data-oboid='#{@cid}']"

	clone: ->
		new @constructor {
			type: @get('type')
			data: @getComponent().cloneNodeData @get('data')
		}

	markChanged: ->
		@set 'changed', Date.now()

	toJSON: ->
		json = @getComponent().getDataDescriptor @

		# @set 'json', json

		type: @get 'type'
		data: json


Chunk.createFromDescriptor = (descriptor) ->
	new Chunk {
		type: descriptor.type,
		data: ComponentClassMap.getClassForType(descriptor.type).createNodeDataFromDescriptor descriptor
	}

Chunk.create = (typeOrClass = null, data = null) ->
	if not typeOrClass?
		componentClass = ComponentClassMap.getDefaultComponentClass()
		type = ComponentClassMap.getTypeOfClass componentClass
	else if typeof typeOrClass is 'string'
		componentClass = ComponentClassMap.getClassForType typeOrClass
		type = typeOrClass
	else
		componentClass = typeOrClass
		type = ComponentClassMap.getTypeOfClass typeOrClass

	data ?= componentClass.createNewNodeData()

	new Chunk {
		type: type
		data: data
	}

module.exports = Chunk