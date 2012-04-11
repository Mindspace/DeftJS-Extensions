###
  @author John Yanarella
  @author Thomas Burleson

  Static utility methods used for {@link Deft.promise.Promise} and {@link Deft.promise Deferred} functionality. Note that the Deft.ajax.* aliases are intended for use within Ajax, Proxy, Models, and fx.Anim classes

###
Ext.define( 'Deft.util.DeferredUtils',
	requires: [ 'Deft.promise.Deferred', 'Deft.promise.Promise' ]
	statics:

		###*
			Build an instance of a Deferred wrapped around a callback or value
			If a callback is provided it is called with the deferred instance and any
			additional arguments, otherwise the deferred instance is returned in a ready
			state (unresolved, uncancelled, and unrejected).

			@param {Object} callback  used to initialize the Deferred.
			@return {Deft.promise.Promise} Promise, read-only instance
		###
		defer : ( callback,rest...) ->
			dfd = Ext.create( 'Deft.promise.Deferred' )

			if Ext.isFunction( callback )
				callback?.apply( null, [dfd].concat(rest) )

			return dfd

		###*
			Build an instance of a Deferred that is immediately cancelled.
			This is useful for activity that fails to build an desired promise but the
			activity watchers still expect a promise instance.

			@param {string} reason  Why has the promise been cancelled?
			@return {Deft.promise.Promise} Promise, read-only instance
		###
		cancelled : (reason) ->
			return @defer( (dfd) ->
				dfd.cancel( reason )
			).promise()

		###*
			Returns a new {@link Deft.promise.Promise} for the specified function/continuation/value, after the specified delay time. If the argument is
			a function, the response to the function invocation will be used to resolve the
			Deferred.

			@param {int} delay The number of milliseconds to delay before resolving the valueOrCallback
			@param {Object} valueOrCallback Callback or value used to resolve the Deferred.
			@return {Deft.promise.Promise} Promise, read-only instance
		###
		wait : ( valueOrCallback, delay, rest... ) ->
			dfd 	= @defer()
			Ext.defer( ->

				val = valueOrCallback
				try
					if Ext.isFunction( val )
						val = val.apply(null,rest || [ ])

					if val instanceof Ext.ClassManager.get( 'Deft.promise.Promise' )
						val.then(
							(result) -> dfd.resolve( result )
							(error)  -> dfd.reject( error )
						)
					else
						dfd.resolve( val )

				catch error
					dfd.reject ( error )
				return
			,delay)

			return dfd.promise


		###
			Many asynchronous calls with Ext (proxy, store, model, etc) utilize
			success and failure callbacks specified within an {Object} options structure.
			This method will redirect the success/failure callback mechanism to provide
			notifications to a pending promise.

			Note that any existing success/failure callbacks [in {Object} options] will be NOT be discarded and will also fire when the promise resolves or rejects.

			@param {Object} options The initial options;
			@param {Deft.promise.Deferred} dfd Optional reference to pending instance
			@return {Deft.promise.Deferred} Deferred instance
		###
		hookRequestCallbacks : ( options, dfd, scope=null ) ->
			dfd ||= @defer()

			successFn = options.success
			failureFn = options.failure

			callbacks =
				success: Ext.bind( ->
					# !! Existing success handler will be called
					successFn.apply(scope, arguments) if successFn?
					@resolve.apply(@, arguments)
					return
				,dfd )
				failure: Ext.bind( ->
					# !! Existing failure handler will be called
					failureFn.apply(scope, arguments) if failureFn?
					@reject.apply(@, arguments)
					return
				, dfd )
				promise : dfd.promise # useful if dfd is not passed as argument

			# Overwrite callbacks with our own redirects to dfd state changes
			return Ext.apply( options, callbacks )


		###
			{@link 	Ext.data.Operation} used in Proxy Ajax calls use a callback function
			to notiy listeners of request success/failure. This creates a callback function
			that also resolves or rejects a Deferred instance

			@param {Object} operation The operation instance to be used with a Ajax::doRequest()
			@param {Deft.promise.Deferred} dfd Deferred instance
			@return {Function} Callback function with the required signature for Ajax notifications
		###
		createOperationCallback : ( operation, dfd, callback, scope=null ) ->
			return (options, success, response) ->
				# 1st trigger optional callback
				callback.call(scope, operation)    if  Ext.isFunction( callback )

				dfd.resolve( operation.resultSet ) if  operation.wasSuccessful()
				dfd.reject( operation.error )      if !operation.wasSuccessful()


		###
			Intercept the callback method provided in the {@link Ext.fx.Anim} {Object} configuration to build a wrapper callback that also resolves the specified Deferred instance. The deferred will be resolved
			with either the callback response or the animation instance.

			@param {Deft.promise.Deferred} dfd Deferred instance
			@param {Function} callback The callback function specified in {@link Ext.fx.Anim} {Object} configuration
			@return {Function} Promise-aware, callback function with the required signature for {@link Ext.fx.Anim#end} notification.
		###
		createFxCallback : ( dfd, callback, scope=null ) ->

			# callback signature expected by Ext.fx.Anim::end()
			return ( anim, startTime ) ->
				if Ext.isFunction( callback )
					# 1st trigger optional callback
					val = callback.call( scope, anim, startTime)

				dfd.resolve( val or anim )
				# Animations do not appear to support abort/stop
				# dfd.reject( operation.error )
				return


,
	# Callback invoked after the Ext.define() completes
	->
		# Alias shorthands
		Deft.defer   = @defer
		Deft.wait    = @wait
		Deft.ajax  =		 # methods for Ext.Ajax, Ext.proxy.*, etc
			hookCallbacks  : @hookRequestCallbacks
			createCallback : @createOperationCallback
			fxCallback     : @createFxCallback

		return
)