###
  @author Thomas Burleson

  Consider the scenario where we get a promise for user details (loaded from server):

		function loadPage() {

			// Build proxy and operation

			var proxy = Ext.create('Ext.data.proxy.Ajax',
							{
								url : 'userDetails.php'
							}
						),
				operation = Ext.create('Ext.data.Operation',
					{
						action : 'read',
						params : { id : 21323 }
					}
				);

			// Issue the Ajax/XHR request, then return
			// a promise to allow extra response notifications

			return proxy
				 .doRequest( operation )
				 .promise()
				 .then (
					// intercept response and extract data
					function (response) {
						return (response.success) ?
							   response.data      :
							   throw new Error("Call failed!");
					},
					// extract fault message
					function (fault){
						return fault.message;
					}
				 );

		}

###
Ext.define( 'Deft.overrides.data.proxy.Ajax',
	override: 'Ext.data.proxy.Ajax'

	###
		This override uses a special callback to resolve/reject a Deferred promise
		The promise is published as part of the returned {Object} request
		If the callback argument is defined, then that callback is also fired when the promise is resolved/rejected.
	###
	doRequest: (operation, callback, scope)  ->
		callback ||= ->  #emtpy function

		request = @buildRequest( operation );
		request = @getWriter()?.write( request ) if operation.allowWrite()

		Deft.defer( (dfd) =>

			Ext.apply( request,
				headers       : @headers
				timeout       : @timeout
				scope         : @
				method        : @getMethod(request)
				disableCaching: false

				# Override callback and inject promise reference
				#
				callback      : Ext.Function.createSequence(
					# Required to internally call {@link #processResponse}
					@createRequestCallback(request, operation ),
					# Now, redirect notifications to Deferred resolve/reject
					Deft.ajax.createCallback( operation, dfd, callback, scope ),
					@
				)
				promise       : -> dfd.promise
			)
		)

		Ext.Ajax.request( request )
		return request
)


