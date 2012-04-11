
/*
  @author Thomas Burleson
*/

(function() {

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

}).call(this);
