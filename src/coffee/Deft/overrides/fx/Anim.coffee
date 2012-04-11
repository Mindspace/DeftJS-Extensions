###
  @author Thomas Burleson

  Consider the scenario where we get a promise for user details (loaded from server):


###
Ext.define( 'Deft.overrides.fx.Anim',
	override: 'Ext.fx.Anim'

	###
		Override construction to intercept the animation complete {Function} callback
		which is replaced with a notification wrapper to a promise resolve and original
		callback trigger (if defined).

		Note that here we expose the promise instance as a flyweight accessor for 1x reference.
	###
	constructor : (config) ->
		Deft.defer( (dfd) =>
			# Intercept callback with Promise triggers
			config.callback = Deft.ajax.fxCallback( dfd, config.callback, config.scope )

			# Cache a flyweight/temporary accessor to the promise
			@promise = =>
				token = dfd.promise
				delete @promise
				return token
		)

		# required since an Ext.fx.Animator could possible be constructed instead
		# super weird... but that is Ext.fx.Anim for you!
		me = @callOverridden( [config] ) || @
		me.promise = @promise

		return me

)


