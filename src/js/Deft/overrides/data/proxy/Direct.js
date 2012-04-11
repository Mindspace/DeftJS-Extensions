
/*
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
*/

(function() {

  Ext.define('Deft.overrides.data.proxy.Direct', {
    override: 'Ext.data.proxy.Direct',
    /*
    		This override uses a special callback to resolve/reject a Deferred promise
    		The promise is published as part of the returned {Object} request
    		If the callback argument is defined, then that callback is also fired when the promise is resolved/rejected.
    */
    doRequest: function(operation, callback, scope) {
      var args, fn, method, params, request, _ref,
        _this = this;
      callback || (callback = function() {});
      request = this.buildRequest(operation);
      params = request.params;
      if (operation.allowWrite()) {
        request = (_ref = this.getWriter()) != null ? _ref.write(request) : void 0;
      }
      args = [request.jsonData];
      fn = this.api[request.action] || this.directFn;
      if (!fn) Ext.Error.raise('No direct function specified for this proxy');
      if (operation.action === 'read') {
        method = fn.directCfg.method;
        args = method.getArgs(params, this.paramOrder, this.paramsAsHash);
      }
      Deft.defer(function(dfd) {
        callback = Ext.Function.createSequence(_this.createRequestCallback(request, operation), Deft.ajax.createCallback(operation, dfd, callback, scope), _this);
        return Ext.apply(request, {
          args: args,
          directFn: fn,
          promise: function() {
            return dfd.promise;
          }
        });
      });
      args.push(callback);
      fn.apply(window, args);
      return request;
    }
  });

}).call(this);
