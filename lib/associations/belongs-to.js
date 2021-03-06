var Utils     = require("./../utils")
  , DataTypes = require('./../data-types')
  , Helpers   = require('./helpers')

module.exports = (function() {
  var BelongsTo = function(source, target, options) {
    this.associationType      = 'BelongsTo'
    this.source               = source
    this.target               = target
    this.options              = options
    this.isSingleAssociation  = true
    this.isSelfAssociation    = (this.source.tableName == this.target.tableName)
    this.as                   = this.options.as

    if (this.isSelfAssociation && !this.options.foreignKey && !!this.as) {
      this.options.foreignKey = Utils._.underscoredIf(Utils.singularize(this.source.tableName, this.source.options.language) + "Id", this.source.options.underscored)
    }

    if (!this.as) {
      this.as = this.options.as = Utils.singularize(this.target.tableName, this.target.options.language)
    }

    this.associationAccessor = this.isSelfAssociation
      ? Utils.combineTableNames(this.target.tableName, this.as)
      : this.as

    this.options.useHooks = options.useHooks

    this.accessors = {
      get: Utils._.camelize('get_' + this.as),
      set: Utils._.camelize('set_' + this.as)
    }
  }

  // the id is in the source table
  BelongsTo.prototype.injectAttributes = function() {
    var newAttributes  = {}
      , targetKeys     = Object.keys(this.target.primaryKeys)
      , keyType        = ((this.target.hasPrimaryKeys && targetKeys.length === 1) ? this.target.rawAttributes[targetKeys[0]].type : DataTypes.INTEGER)

    this.identifier = this.options.foreignKey || Utils._.underscoredIf(Utils.singularize(this.target.tableName, this.target.options.language) + "Id", this.source.options.underscored)

    newAttributes[this.identifier] = { type: this.options.keyType || keyType }
    Helpers.addForeignKeyConstraints(newAttributes[this.identifier], this.target, this.source, this.options)
    Utils._.defaults(this.source.rawAttributes, newAttributes)

    // Sync attributes and setters/getters to DAO prototype
    this.source.refreshAttributes()

    return this
  }

  BelongsTo.prototype.injectGetter = function(obj) {
    var self     = this
      , primaryKeys = Object.keys(self.target.primaryKeys)
      , primaryKey = primaryKeys.length === 1 ? primaryKeys[0] : 'id'

    obj[this.accessors.get] = function(params) {
      var id      = this[self.identifier]
        , where   = {}
        , options = Utils._.pick(params || {}, 'transaction')

      where[primaryKey] = id

      if (!Utils._.isUndefined(params)) {
        if (!Utils._.isUndefined(params.where)) {
          params.where = Utils._.extend(where, params.where)
        } else {
          params.where = where
        }
      } else {
        params = id
      }

      return self.target.find(params, options)
    }

    return this
  }

  BelongsTo.prototype.injectSetter = function(obj) {
    var self     = this

    obj[this.accessors.set] = function(associatedObject, options) {
      var primaryKeys = !!associatedObject && !!associatedObject.daoFactory ? Object.keys(associatedObject.daoFactory.primaryKeys) : []
        , primaryKey = primaryKeys.length === 1 ? primaryKeys[0] : 'id'

      this[self.identifier] = associatedObject ? associatedObject[primaryKey] : null
      options               = Utils._.extend({ fields: [ self.identifier ], allowNull: [self.identifier] }, options)

      // passes the changed field to save, so only that field get updated.
      return this.save(options)
    }

    return this
  }

  return BelongsTo
})()
