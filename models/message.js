"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Message.belongsTo(models.User, {
        foreignKey: "user_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        as: "User",
      });

      Message.belongsTo(models.User, {
        foreignKey: "receiver_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        as: "Receiver",
      });
    }
  }
  Message.init(
    {
      content: DataTypes.TEXT,
      seen: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Message",
    }
  );
  return Message;
};
