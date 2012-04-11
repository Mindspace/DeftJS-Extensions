
/*
  @author John Yanarella
  @author Thomas Burleson

  Static utility methods used for {@link Deft.promise.Promise} and {@link Deft.promise Deferred} functionality. Note that the Deft.ajax.* aliases are intended for use within Ajax, Proxy, Models, and fx.Anim classes
*/

(function() {
  var __slice = Array.prototype.slice;

  Ext.define('Deft.util.DeferredUtils', {
    requires: ['Deft.promise.Deferred', 'Deft.promise.Promise'],
    statics: {
      /**
      			Build an instance of a Deferred wrapped around a callback or value
      			If a callback is provided it is called with the deferred instance and any
      			additional arguments, otherwise the deferred instance is returned in a ready
      			state (unresolved, uncancelled, and unrejected).
      
      			@param {Object} callback  used to initialize the Deferred.
      			@return {Deft.promise.Promise} Promise, read-only instance
      */
      defer: function() {
        var callback, dfd, rest;
        callback = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        dfd = Ext.create('Deft.promise.Deferred');
        if (Ext.isFunction(callback)) {
          if (callback != null) callback.apply(null, [dfd].concat(rest));
        }
        return dfd;
      },
      /**
      			Build an instance of a Deferred that is immediately cancelled.
      			This is useful for activity that fails to build an desired promise but the
      			activity watchers still expect a promise instance.
      
      			@param {string} reason  Why has the promise been cancelled?
      			@return {Deft.promise.Promise} Promise, read-only instance
      */
      cancelled: function(reason) {
        return this.defer(function(dfd) {
          return dfd.cancel(reason);
        }).promise();
      },
      /**
      			Returns a new {@link Deft.promise.Promise} for the specified function/continuation/value, after the specified delay time. If the argument is
      			a function, the response to the function invocation will be used to resolve the
      			Deferred.
      
      			@param {int} delay The number of milliseconds to delay before resolving the valueOrCallback
      			@param {Object} valueOrCallback Callback or value used to resolve the Deferred.
      			@return {Deft.promise.Promise} Promise, read-only instance
      */
      wait: function() {
        var delay, dfd, rest, valueOrCallback;
        valueOrCallback = arguments[0], delay = arguments[1], rest = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        dfd = this.defer();
        Ext.defer(function() {
          var val;
          val = valueOrCallback;
          try {
            if (Ext.isFunction(val)) val = val.apply(null, rest || []);
            if (val instanceof Ext.ClassManager.get('Deft.promise.Promise')) {
              val.then(function(result) {
                return dfd.resolve(result);
              }, function(error) {
                return dfd.reject(error);
              });
            } else {
              dfd.resolve(val);
            }
          } catch (error) {
            dfd.reject(error);
          }
        }, delay);
        return dfd.promise;
      },
      /*
      			Many asynchronous calls with Ext (proxy, store, model, etc) utilize
      			success and failure callbacks specified within an {Object} options structure.
      			This method will redirect the success/failure callback mechanism to provide
      			notifications to a pending promise.
      
      			Note that any existing success/failure callbacks [in {Object} options] will be NOT be discarded and will also fire when the promise resolves or rejects.
      
      			@param {Object} options The initial options;
      			@param {Deft.promise.Deferred} dfd Optional reference to pending instance
      			@return {Deft.promise.Deferred} Deferred instance
      */
      hookRequestCallbacks: function(options, dfd, scope) {
        var callbacks, failureFn, successFn;
        if (scope == null) scope = null;
        dfd || (dfd = this.defer());
        successFn = options.success;
        failureFn = options.failure;
        callbacks = {
          success: Ext.bind(function() {
            if (successFn != null) successFn.apply(scope, arguments);
            this.resolve.apply(this, arguments);
          }, dfd),
          failure: Ext.bind(function() {
            if (failureFn != null) failureFn.apply(scope, arguments);
            this.reject.apply(this, arguments);
          }, dfd),
          promise: dfd.promise
        };
        return Ext.apply(options, callbacks);
      },
      /*
      			{@link 	Ext.data.Operation} used in Proxy Ajax calls use a callback function
      			to notiy listeners of request success/failure. This creates a callback function
      			that also resolves or rejects a Deferred instance
      
      			@param {Object} operation The operation instance to be used with a Ajax::doRequest()
      			@param {Deft.promise.Deferred} dfd Deferred instance
      			@return {Function} Callback function with the required signature for Ajax notifications
      */
      createOperationCallback: function(operation, dfd, callback, scope) {
        if (scope == null) scope = null;
        return function(options, success, response) {
          if (Ext.isFunction(callback)) callback.call(scope, operation);
          if (operation.wasSuccessful()) dfd.resolve(operation.resultSet);
          if (!operation.wasSuccessful()) return dfd.reject(operation.error);
        };
      },
      /*
      			Intercept the callback method provided in the {@link Ext.fx.Anim} {Object} configuration to build a wrapper callback that also resolves the specified Deferred instance. The deferred will be resolved
      			with either the callback response or the animation instance.
      
      			@param {Deft.promise.Deferred} dfd Deferred instance
      			@param {Function} callback The callback function specified in {@link Ext.fx.Anim} {Object} configuration
      			@return {Function} Promise-aware, callback function with the required signature for {@link Ext.fx.Anim#end} notification.
      */
      createFxCallback: function(dfd, callback, scope) {
        if (scope == null) scope = null;
        return function(anim, startTime) {
          var val;
          if (Ext.isFunction(callback)) {
            val = callback.call(scope, anim, startTime);
          }
          dfd.resolve(val || anim);
        };
      }
    }
  }, function() {
    Deft.defer = this.defer;
    Deft.wait = this.wait;
    Deft.ajax = {
      hookCallbacks: this.hookRequestCallbacks,
      createCallback: this.createOperationCallback,
      fxCallback: this.createFxCallback
    };
  });

  /*
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
  */

  Ext.define('Deft.overrides.data.Connection', {
    override: 'Ext.data.Connection',
    /*
    		Tail hook the method to inject Promise functionality
    		Only build promise and intercept callbacks IF a promise
    		instance has been requested.
    
    		@param {Object} options An object which may contain expected options
    		for the overriden {@link Ext.Ajax#request} call
    		@return {Object} The request object. This may be used to cancel the request.
    		The request object also contains an instance of the {@link Deft.Promise}
    */
    request: function(options) {
      var token;
      token = this.callOverridden([options]);
      Ext.applyIf(token, {
        me: this,
        promise: function() {
          var dfd, me, promise;
          me = token.me;
          options = token.options;
          dfd = Ext.create('Deft.promise.Deferred');
          promise = dfd.promise;
          if (!me.isLoading(token) || !token.async) {
            dfd.resolve(token.response);
          } else {
            if (options.callback) {
              promise = dfd.then({
                success: function(response) {
                  return options.callback(options, true, response);
                },
                failure: function(response) {
                  return options.callback(options, false, response);
                }
              });
            }
            options.callback = function(options, success, response) {
              if (success) dfd.resolve(response);
              if (!success) return dfd.reject(response);
            };
          }
          token.promise = function() {
            return promise;
          };
          return promise;
        }
      });
      return token;
    },
    /*
    		Tail-hook intercept {@link #onComplete} in order to cache the response
    		in the request token object. This `response` is later used in the promise
    		functionality created in the {@link #request} override
    		@param {Object} request An object which may contain expected options
    		for the overriden {@link Ext.Ajax#request} call
    */
    onComplete: function(request) {
      var response;
      response = this.callOverridden([request]);
      Ext.apply(request, {
        response: response
      });
      return response;
    },
    /*
    		Head-hook {@link #abort} to prevent incorrect promise rejection
    		since the default {@link #abort} calls {@link #onComplete} which announces
    		incorrectly announces a `failure` instead of cancel.
    		With the head-hook, we cancel the promise before triggering the default {@link #abort}
    		processes.
    */
    abort: function(request) {
      var promise, _ref;
      request || (request = this.getLatest());
      if (request != null ? (_ref = request.me) != null ? _ref.isLoading(request) : void 0 : void 0) {
        promise = request.promise();
        promise.cancel('transaction aborted');
        this.callOverridden([request]);
      }
    }
  });

  /*
    @author Thomas Burleson
  */

  Ext.define('Deft.overrides.data.Model', {
    override: 'Ext.data.Model',
    /*
    		Override {@link #load} to store a flyweight accessor to the current promise (as published by the request)
    
    		@return {Ext.data.Model} The Model instance
    */
    load: function(id, config) {
      var callback, operation, request, scope,
        _this = this;
      config = Ext.apply({}, config);
      Ext.applyIf(config, {
        action: 'read',
        id: id
      });
      operation = new Ext.data.Operation(config);
      scope = config.scope || this;
      callback = function(operation) {
        var record;
        if (operation.wasSuccessful()) {
          record = operation.getRecords()[0];
          Ext.callback(config.success, scope, [record, operation]);
        } else {
          Ext.callback(config.failure, scope, [record, operation]);
        }
        Ext.callback(config.callback, scope, [record, operation]);
      };
      request = this.getProxy().read(operation, callback, this);
      this.promise = function() {
        var token;
        token = request.promise();
        delete _this.promise;
        return token;
      };
      return this;
    },
    /*
    		Override {@link #save} to store a flyweight accessor to the current promise (as published by the save action/request)
    
    		@return {Ext.data.Model} The Model instance
    */
    save: function(options) {
      var action, callback, operation, request, scope, stores, _ref,
        _this = this;
      options = Ext.apply({}, options);
      action = (_ref = this.phantom) != null ? _ref : {
        'create': 'update'
      };
      scope = options.scope || this;
      stores = this.stores;
      Ext.apply(options, {
        records: [this],
        action: action
      });
      operation = new Ext.data.Operation(options);
      callback = function(operation) {
        var args, i, store, _len;
        args = [_this, operation];
        if (operation.wasSuccessful()) {
          for (i = 0, _len = stores.length; i < _len; i++) {
            store = stores[i];
            store.fireEvent('write', store, operation);
            store.fireEvent('datachanged', store);
          }
          Ext.callback(options.success, scope, args);
        } else {
          Ext.callback(options.failure, scope, args);
        }
        return Ext.callback(options.callback, scope, args);
      };
      request = this.getProxy()[action](operation, callback, this);
      this.promise = function() {
        var token;
        token = request.promise();
        delete _this.promise;
        return token;
      };
      return this;
    }
  });

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

  /*
    @author Thomas Burleson
  
    Consider the scenario where we get a promise for user details (loaded from server):
  */

  Ext.define('Deft.overrides.fx.Anim', {
    override: 'Ext.fx.Anim',
    /*
    		Override construction to intercept the animation complete {Function} callback
    		which is replaced with a notification wrapper to a promise resolve and original
    		callback trigger (if defined).
    
    		Note that here we expose the promise instance as a flyweight accessor for 1x reference.
    */
    constructor: function(config) {
      var me,
        _this = this;
      Deft.defer(function(dfd) {
        config.callback = Deft.ajax.fxCallback(dfd, config.callback, config.scope);
        return _this.promise = function() {
          var token;
          token = dfd.promise;
          delete _this.promise;
          return token;
        };
      });
      me = this.callOverridden([config]) || this;
      me.promise = this.promise;
      return me;
    }
  });

}).call(this);
