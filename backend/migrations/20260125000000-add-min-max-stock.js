'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add min_stock and max_stock columns to items table
        await queryInterface.addColumn('items', 'min_stock', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Minimum stock level - triggers reorder when stock <= min_stock'
        });

        await queryInterface.addColumn('items', 'max_stock', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Maximum stock level - reorder quantity = max_stock - current_stock'
        });

        // Populate with sensible defaults based on existing fields
        // min_stock = reorder_point
        // max_stock = reorder_point + safety_stock + 100 (buffer)
        await queryInterface.sequelize.query(`
      UPDATE items 
      SET min_stock = reorder_point,
          max_stock = GREATEST(reorder_point + safety_stock + 100, reorder_point * 2)
      WHERE min_stock = 0 AND max_stock = 0
    `);
    },

    down: async (queryInterface, Sequelize) => {
        // Remove columns if migration is rolled back
        await queryInterface.removeColumn('items', 'min_stock');
        await queryInterface.removeColumn('items', 'max_stock');
    }
};
