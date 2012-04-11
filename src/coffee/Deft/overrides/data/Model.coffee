###
  @author Thomas Burleson

###
Ext.define( 'Deft.overrides.data.Model',
	override: 'Ext.data.Model'

	###
		Override {@link #load} to store a flyweight accessor to the current promise (as published by the request)

		@return {Ext.data.Model} The Model instance
	###
	load : (id, config) ->

		config = Ext.apply({}, config);

		Ext.applyIf( config,
			action	: 'read'
			id		: id
		)

		operation  = new Ext.data.Operation(config)
		scope      = config.scope || @
		callback   = (operation) ->
			if (operation.wasSuccessful())
				record = operation.getRecords()[0];
				Ext.callback( config.success, scope, [record, operation] )
			else
				Ext.callback( config.failure, scope, [record, operation] )

			Ext.callback( config.callback, scope, [record, operation] )
			return

		# Monkey-patch here >>

		# Cache a flyweight/temporary accessor to the promise
		request = @getProxy().read(operation, callback, @)
		@promise = =>
			token = request.promise()
			delete @promise
			return token

		return @

	###
		Override {@link #save} to store a flyweight accessor to the current promise (as published by the save action/request)

		@return {Ext.data.Model} The Model instance
	###
	save: (options) ->
		options = Ext.apply({}, options)
		action  = @phantom ? 'create' : 'update'
		scope   = options.scope || @
		stores  = @stores

		Ext.apply( options,
			records: [@]
			action : action
		)

		operation = new Ext.data.Operation(options);
		callback  = (operation) =>
			args = [@, operation]

			if operation.wasSuccessful()
				for store, i in stores
					# Not firing refresh here, since it's a single record
					store.fireEvent('write', store, operation)
					store.fireEvent('datachanged', store)

				Ext.callback(options.success, scope, args)
			else
				Ext.callback(options.failure, scope, args)

			Ext.callback(options.callback, scope, args)

		# Monkey-patch here >>

		# Cache a flyweight/temporary accessor to the promise
		request = @getProxy()[action](operation, callback, @)
		@promise = =>
			token = request.promise()
			delete @promise
			return token

		return @
)

