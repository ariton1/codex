"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      twofactor_enabled: {
        type: Sequelize.BOOLEAN,
        default: false,
      },
      twofactor_secret: {
        type: Sequelize.STRING,
      },
      phrase: {
        type: Sequelize.STRING,
      },
      mnemonic: {
        type: Sequelize.STRING,
      },
      is_banned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      banned_reason: {
        type: Sequelize.STRING,
      },
      banned_until: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  },
};
