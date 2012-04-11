
/*
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
*/

(function() {

  Ext.define('Deft.overrides.data.proxy.Ajax', {
    override: 'Ext.data.proxy.Ajax',
    /*
    		This override uses a special callback to resolve/reject a Deferred promise
    		The promise is published as part of the returned {Object} request
    		If the callback argument is defined, then that callback is also fired when the promise is resolved/rejected.
    */
    doRequest: function(operation, callback, scope) {
      var request, _ref,
        _this = this;
      callback || (callback = function() {});
      request = this.buildRequest(operation);
      if (operation.allowWrite()) {
        request = (_ref = this.getWriter()) != null ? _ref.write(request) : void 0;
      }
      Deft.defer(function(dfd) {
        return Ext.apply(request, {
          headers: _this.headers,
          timeout: _this.timeout,
          scope: _this,
          method: _this.getMethod(request),
          disableCaching: false,
          callback: Ext.Function.createSequence(_this.createRequestCallback(request, operation), Deft.ajax.createCallback(operation, dfd, callback, scope), _this),
          promise: function() {
            return dfd.promise;
          }
        });
      });
      Ext.Ajax.request(request);
      return request;
    }
  });

}).call(this);
