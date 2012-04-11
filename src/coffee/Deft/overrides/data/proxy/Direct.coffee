###
  @author Thomas Burleson

	This class is used to send requests to the server using {@link Ext.direct.Manager Ext.Direct}.When a request is made, the transport mechanism is handed off to the appropriate {@link Ext.direct.RemotingProvider Provider} to complete the call.


  	# Consider the scenario where we get a promise for user details (loaded from cross-domain server):

		Ext.define('User', {
			extend: 'Ext.data.Model',
			fields: ['firstName', 'lastName'],
			proxy: {
			    type: 'direct',
			    directFn: MyApp.getUsers,
			    paramOrder: 'id' // Tells the proxy to pass the id as the first parameter to the remoting method.
			}
		});

		User.load(1)
			.promise()
			.then( function (user){
				Ext.Msg.alert( "#{user.lastName} info has been loaded!" );
			});

###
Ext.define( 'Deft.overrides.data.proxy.Direct',
	override: 'Ext.data.proxy.Direct'

	###
		This override uses a special callback to resolve/reject a Deferred promise
		The promise is published as part of the returned {Object} request
		If the callback argument is defined, then that callback is also fired when the promise is resolved/rejected.
	###
	doRequest: (operation, callback, scope)  ->
		callback ||= ->  #emtpy function

		request = @buildRequest( operation );
		params  = request.params
		request = @getWriter()?.write( request ) if operation.allowWrite()
		args    = [ request.jsonData ]
		fn      = @api[ request.action ]  || @directFn

		Ext.Error.raise('No direct function specified for this proxy') if !fn

		if (operation.action is 'read')
			method = fn.directCfg.method # We need to pass params
			args   = method.getArgs( params, @paramOrder, @paramsAsHash )


		Deft.defer( (dfd) =>

			# Override callback with sequence
			callback = Ext.Function.createSequence(
				# Required to internally call {@link #processResponse}
				@createRequestCallback( request, operation )
				# Now, redirect notifications to Deferred resolve/reject
				Deft.ajax.createCallback( operation, dfd, callback, scope )
				@
			)

			Ext.apply( request,
				args          : args,
				directFn      : fn
				# Inject reference to promise
				promise       : -> dfd.promise
			)
		)

		args.push( callback )
		fn.apply( window, args )

		# !! return request so access to promise is available
		return request
)

