
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

}).call(this);
