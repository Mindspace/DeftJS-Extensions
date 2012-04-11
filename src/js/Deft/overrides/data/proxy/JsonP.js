
/*
  @author Thomas Burleson

  Consider the scenario where we get a promise for user details
  (loaded from cross-domain server):

		function loadPage() {
			var proxy = Ext.create('Ext.data.proxy.JsonP',
							{
								url : 'http://www.otherdomain.com/userDetails.php'
							}
						),
				operation = Ext.create('Ext.data.Operation',
					{
						action : 'read',
						params : { id : 21323 }
					}
				);

			// Issue the JsonP request, then return
			// a promise to allow extra response notifications

			return  proxy.doRequest( operation )
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
*/

(function() {

  Ext.define('Deft.overrides.data.proxy.JsonP', {
    override: 'Ext.data.proxy.JsonP',
    /*
    		This override uses a special callback to resolve/reject a Deferred promise
    		The promise is published as part of the returned {Object} request
    		If the callback argument is defined, then that callback is also fired when the promise is resolved/rejected.
    */
    doRequest: function(operation, callback, scope) {
      var params, request, _ref,
        _this = this;
      callback || (callback = function() {});
      request = this.buildRequest(operation);
      params = request.params;
      if (operation.allowWrite()) {
        request = (_ref = this.getWriter()) != null ? _ref.write(request) : void 0;
      }
      Deft.defer(function(dfd) {
        return Ext.apply(request, {
          callbackKey: _this.callbackKey,
          timeout: _this.timeout,
          scope: _this,
          disableCaching: false,
          callback: Ext.Function.createSequence(_this.createRequestCallback(request, operation), Deft.ajax.createCallback(operation, dfd, callback, scope), _this),
          promise: function() {
            return dfd.promise;
          }
        });
      });
      try {
        if (me.autoAppendParams) request.params = {};
        request.jsonp = Ext.data.JsonP.request(request);
        operation.setStarted();
      } finally {
        request.params = params;
        me.lastRequest = request;
      }
      return request;
    }
  });

}).call(this);
