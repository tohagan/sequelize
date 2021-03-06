/* jshint camelcase: false, expr: true */
var chai      = require('chai')
  , expect    = chai.expect
  , Support   = require(__dirname + '/../support')
  , DataTypes = require(__dirname + "/../../lib/data-types")

chai.Assertion.includeStack = true

describe(Support.getTestDialectTeaser("BelongsTo"), function() {
  describe("Model.associations", function () {
    it("should store all assocations when associting to the same table multiple times", function () {
      var User  = this.sequelize.define('User', {})
        , Group = this.sequelize.define('Group', {})

      Group.belongsTo(User)
      Group.belongsTo(User, { foreignKey: 'primaryGroupId', as: 'primaryUsers' })
      Group.belongsTo(User, { foreignKey: 'secondaryGroupId', as: 'secondaryUsers' })

      expect(Object.keys(Group.associations)).to.deep.equal(['User', 'primaryUsers', 'secondaryUsers'])
    })
  })

  describe('getAssociation', function() {
    it('supports transactions', function(done) {
      Support.prepareTransactionTest(this.sequelize, function(sequelize) {
        var User  = sequelize.define('User', { username: Support.Sequelize.STRING })
          , Group = sequelize.define('Group', { name: Support.Sequelize.STRING })

        Group.belongsTo(User)

        sequelize.sync({ force: true }).success(function() {
          User.create({ username: 'foo' }).success(function(user) {
            Group.create({ name: 'bar' }).success(function(group) {
              sequelize.transaction(function(t) {
                group.setUser(user, { transaction: t }).success(function() {
                  Group.all().success(function(groups) {
                    groups[0].getUser().success(function(associatedUser) {
                      expect(associatedUser).to.be.null
                      Group.all({ transaction: t }).success(function(groups) {
                        groups[0].getUser({ transaction: t }).success(function(associatedUser) {
                          expect(associatedUser).to.be.not.null
                          t.rollback().success(function() { done() })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  describe('setAssociation', function() {
    it('supports transactions', function(done) {
      Support.prepareTransactionTest(this.sequelize, function(sequelize) {
        var User  = sequelize.define('User', { username: Support.Sequelize.STRING })
          , Group = sequelize.define('Group', { name: Support.Sequelize.STRING })

        Group.belongsTo(User)

        sequelize.sync({ force: true }).success(function() {
          User.create({ username: 'foo' }).success(function(user) {
            Group.create({ name: 'bar' }).success(function(group) {
              sequelize.transaction(function(t) {
                group.setUser(user, { transaction: t }).success(function() {
                  Group.all().success(function(groups) {
                    groups[0].getUser().success(function(associatedUser) {
                      expect(associatedUser).to.be.null
                      t.rollback().success(function() { done() })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })

    it('can set the association with declared primary keys...', function(done) {
      var User = this.sequelize.define('UserXYZ', { user_id: {type: DataTypes.INTEGER, primaryKey: true }, username: DataTypes.STRING })
        , Task = this.sequelize.define('TaskXYZ', { task_id: {type: DataTypes.INTEGER, primaryKey: true }, title: DataTypes.STRING })

      Task.belongsTo(User, { foreignKey: 'user_id' })

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ user_id: 1, username: 'foo' }).success(function(user) {
          Task.create({ task_id: 1, title: 'task' }).success(function(task) {
            task.setUserXYZ(user).success(function() {
              task.getUserXYZ().success(function(user) {
                expect(user).not.to.be.null

                task.setUserXYZ(null).success(function() {
                  task.getUserXYZ().success(function(user) {
                    expect(user).to.be.null
                    done()
                  })
                })

              })
            })
          })
        })
      })
    })

    it('clears the association if null is passed', function(done) {
      var User = this.sequelize.define('UserXYZ', { username: DataTypes.STRING })
        , Task = this.sequelize.define('TaskXYZ', { title: DataTypes.STRING })

      Task.belongsTo(User)

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUserXYZ(user).success(function() {
              task.getUserXYZ().success(function(user) {
                expect(user).not.to.be.null

                task.setUserXYZ(null).success(function() {
                  task.getUserXYZ().success(function(user) {
                    expect(user).to.be.null
                    done()
                  })
                })

              })
            })
          })
        })
      })
    })
  })

  describe("Foreign key constraints", function() {
    it("are not enabled by default", function(done) {
      var Task = this.sequelize.define('Task', { title: DataTypes.STRING })
        , User = this.sequelize.define('User', { username: DataTypes.STRING })

      Task.belongsTo(User)

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUser(user).success(function() {
              user.destroy().success(function() {
                Task.findAll().success(function(tasks) {
                  expect(tasks).to.have.length(1)
                  done()
                })
              })
            })
          })
        })
      })
    })

    it("can cascade deletes", function(done) {
      var Task = this.sequelize.define('Task', { title: DataTypes.STRING })
        , User = this.sequelize.define('User', { username: DataTypes.STRING })

      Task.belongsTo(User, {onDelete: 'cascade'})

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUser(user).success(function() {
              user.destroy().success(function() {
                Task.findAll().success(function(tasks) {
                  expect(tasks).to.have.length(0)
                  done()
                })
              })
            })
          })
        })
      })
    })

    it("can restrict deletes", function(done) {
      var Task = this.sequelize.define('Task', { title: DataTypes.STRING })
        , User = this.sequelize.define('User', { username: DataTypes.STRING })

      Task.belongsTo(User, {onDelete: 'restrict'})

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUser(user).success(function() {
              user.destroy().error(function() {
                // Should fail due to FK restriction
                Task.findAll().success(function(tasks) {
                  expect(tasks).to.have.length(1)
                  done()
                })
              })
            })
          })
        })
      })
    })

    it("can cascade updates", function(done) {
      var Task = this.sequelize.define('Task', { title: DataTypes.STRING })
        , User = this.sequelize.define('User', { username: DataTypes.STRING })

      Task.belongsTo(User, {onUpdate: 'cascade'})

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUser(user).success(function() {

              // Changing the id of a DAO requires a little dance since
              // the `UPDATE` query generated by `save()` uses `id` in the
              // `WHERE` clause

              var tableName = user.QueryInterface.QueryGenerator.addSchema(user.__factory)
              user.QueryInterface.update(user, tableName, {id: 999}, user.id)
              .success(function() {
                Task.findAll().success(function(tasks) {
                  expect(tasks).to.have.length(1)
                  expect(tasks[0].UserId).to.equal(999)
                  done()
                })
              })
            })
          })
        })
      })
    })

    it("can restrict updates", function(done) {
      var Task = this.sequelize.define('Task', { title: DataTypes.STRING })
        , User = this.sequelize.define('User', { username: DataTypes.STRING })

      Task.belongsTo(User, {onUpdate: 'restrict'})

      this.sequelize.sync({ force: true }).success(function() {
        User.create({ username: 'foo' }).success(function(user) {
          Task.create({ title: 'task' }).success(function(task) {
            task.setUser(user).success(function() {

              // Changing the id of a DAO requires a little dance since
              // the `UPDATE` query generated by `save()` uses `id` in the
              // `WHERE` clause

              var tableName = user.QueryInterface.QueryGenerator.addSchema(user.__factory)
              user.QueryInterface.update(user, tableName, {id: 999}, user.id)
              .error(function() {
                // Should fail due to FK restriction
                Task.findAll().success(function(tasks) {
                  expect(tasks).to.have.length(1)
                  done()
                })
              })
            })
          })
        })
      })
    })
  })

  describe("Association column", function() {
    it('has correct type for non-id primary keys with non-integer type', function(done) {
      var User = this.sequelize.define('UserPKBT', {
        username: {
          type: DataTypes.STRING
        }
      })
        , self = this

      var Group = this.sequelize.define('GroupPKBT', {
        name: {
          type: DataTypes.STRING,
          primaryKey: true
        }
      })

      User.belongsTo(Group)

      self.sequelize.sync({ force: true }).success(function() {
        expect(User.rawAttributes.GroupPKBTId.type.toString()).to.equal(DataTypes.STRING.toString())
        done()
      })
    })
  })

  describe("Association options", function() {
    it('can specify data type for autogenerated relational keys', function(done) {
      var User = this.sequelize.define('UserXYZ', { username: DataTypes.STRING })
        , dataTypes = [DataTypes.INTEGER, DataTypes.BIGINT, DataTypes.STRING]
        , self = this
        , Tasks = {}

      dataTypes.forEach(function(dataType) {
        var tableName = 'TaskXYZ_' + dataType.toString()
        Tasks[dataType] = self.sequelize.define(tableName, { title: DataTypes.STRING })

        Tasks[dataType].belongsTo(User, { foreignKey: 'userId', keyType: dataType })
      })

      self.sequelize.sync({ force: true })
      .success(function() {
        dataTypes.forEach(function(dataType, i) {
          expect(Tasks[dataType].rawAttributes.userId.type.toString())
            .to.equal(dataType.toString())

          if ((i+1) === dataTypes.length) {
            done()
          }
        })
      })
    })
  })
})
