###
  @author Thomas Burleson

  {@link Ext.Ajax} and {@link Ext.data.Connection} are the fundamental Ext.js classes for same-domain, asynchronous XHR
  calls. These classes uses the class success/failure/callback notification mechanisms to provide future responses to pending XHR calls.

  Out-of-the-box these classes do not, however, provide any support for Promises (futures). This `monkey-patch` hooks into the {@link Ext.data.Connection} methods to inject transparent support for Deft Deferreds/Promises.

  Consider the scenario where we get a promise for user details (loaded from server):

	function loadPage() {
		var promise = Ext.Ajax.request({
			url: 'userDetails.php',
			params: {
				id: "21323"
			}
		}).promise();

		return promise.then(
					// intercept response and extract data
					function (response) {
						return (response.success) ?
							   response.data      :
							   throw new Error("Call failed!");
					},
					function (fault){
						return fault.message;
					}
				);
	}

###
Ext.define( 'Deft.overrides.data.Connection',
	override: 'Ext.data.Connection'

	###
		Tail hook the method to inject Promise functionality
		Only build promise and intercept callbacks IF a promise
		instance has been requested.

		@param {Object} options An object which may contain expected options
		for the overriden {@link Ext.Ajax#request} call
		@return {Object} The request object. This may be used to cancel the request.
		The request object also contains an instance of the {@link Deft.Promise}
	###
	request : (options) ->
		# call super::request()
		token = @callOverridden( [options] )

		Ext.applyIf( token,
			me      : @,
			promise : ->

				me      = token.me
				options = token.options

				# Construct and configure instance of Deferred
				#
				dfd     = Ext.create( 'Deft.promise.Deferred' )
				promise = dfd.promise;

				if ( !me.isLoading(token) or !token.async )
					dfd.resolve( token.response )
				else
					if ( options.callback )
						promise = dfd.then(
							success : (response) -> options.callback( options, true, response )
							failure : (response) -> options.callback( options, false,response )
						)

					options.callback = (options, success, response) ->
						dfd.resolve( response ) if  success
						dfd.reject( response )  if !success

				# !! replace promise factory with promise accessor
				# then deliver promise instance
				token.promise = -> promise
				return promise
		)

		return token

	###
		Tail-hook intercept {@link #onComplete} in order to cache the response
		in the request token object. This `response` is later used in the promise
		functionality created in the {@link #request} override
		@param {Object} request An object which may contain expected options
		for the overriden {@link Ext.Ajax#request} call
	###
	onComplete : (request) ->
		# call super::onComplete()
		response = @callOverridden( [request] )

		Ext.apply( request,
			response : response
		)

		return response

	###
		Head-hook {@link #abort} to prevent incorrect promise rejection
		since the default {@link #abort} calls {@link #onComplete} which announces
		incorrectly announces a `failure` instead of cancel.
		With the head-hook, we cancel the promise before triggering the default {@link #abort}
		processes.
	###
	abort : (request) ->
		request ||= @getLatest()

		if ( request?.me?.isLoading(request) )
			promise = request.promise()
			promise.cancel( 'transaction aborted' )

			@callOverridden( [request] )

		return



)