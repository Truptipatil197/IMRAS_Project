const { Op, fn, col, literal } = require('sequelize');
const { StockLedger, Item, Supplier, Category } = require('../models');
const logger = require('../utils/logger');

/**
 * Demand Analysis Service
 * Analyzes historical consumption patterns for intelligent reordering
 */
class DemandAnalysisService {
  /**
   * Calculate average daily consumption for an item
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<number>} Average daily consumption
   */
  async calculateAverageDailyConsumption(itemId, warehouseId = null, days = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sinceDate = since.toISOString().split('T')[0];
      
      const whereClause = {
        item_id: itemId,
        transaction_type: 'Issue',
        transaction_date: { [Op.gte]: sinceDate }
      };
      
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      // Sum all issue quantities (they are negative)
      const result = await StockLedger.findOne({
        where: whereClause,
        attributes: [
          [fn('SUM', fn('ABS', col('quantity'))), 'totalIssued']
        ],
        raw: true
      });
      
      const totalIssued = parseFloat(result?.totalIssued || 0);
      
      if (totalIssued === 0) {
        // No history - check if item is new
        const item = await Item.findByPk(itemId);
        if (!item) {
          logger.warn(`Item ${itemId} not found for consumption calculation`);
          return 0;
        }
        
        // Estimate based on similar items in category
        const avgCategoryConsumption = await this.getCategoryAverageConsumption(
          item.category_id, 
          warehouseId,
          days
        );
        return avgCategoryConsumption || 0;
      }
      
      // Calculate actual days (may be less than requested if item is newer)
      const firstIssue = await StockLedger.findOne({
        where: whereClause,
        order: [['transaction_date', 'ASC']],
        attributes: ['transaction_date']
      });
      
      if (!firstIssue) {
        return 0;
      }
      
      const firstDate = new Date(firstIssue.transaction_date);
      const actualDays = Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / (24 * 60 * 60 * 1000)));
      const adjustedDays = Math.min(actualDays, days);
      
      const avgDaily = totalIssued / adjustedDays;
      logger.debug(`Average daily consumption for item ${itemId}: ${avgDaily.toFixed(2)} (over ${adjustedDays} days)`);
      
      return parseFloat(avgDaily.toFixed(2));
    } catch (error) {
      logger.error(`Error calculating average daily consumption for item ${itemId}:`, error);
      return 0;
    }
  }

  /**
   * Get daily consumption grouped by date
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {number} days 
   * @returns {Promise<Array<number>>} Array of daily consumption values
   */
  async getDailyConsumption(itemId, warehouseId = null, days = 90) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sinceDate = since.toISOString().split('T')[0];
      
      const whereClause = {
        item_id: itemId,
        transaction_type: 'Issue',
        transaction_date: { [Op.gte]: sinceDate }
      };
      
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      const issues = await StockLedger.findAll({
        where: whereClause,
        attributes: ['quantity', 'transaction_date'],
        order: [['transaction_date', 'ASC']],
        raw: true
      });
      
      // Group by date and sum quantities (issues are negative)
      const dailyMap = {};
      issues.forEach(issue => {
        const date = issue.transaction_date.toISOString().split('T')[0];
        const qty = Math.abs(parseInt(issue.quantity) || 0);
        dailyMap[date] = (dailyMap[date] || 0) + qty;
      });
      
      return Object.values(dailyMap);
    } catch (error) {
      logger.error(`Error getting daily consumption for item ${itemId}:`, error);
      return [];
    }
  }

  /**
   * Calculate demand variability (standard deviation and coefficient of variation)
   * Higher variability = need more safety stock
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {number} days - Number of days to analyze (default: 90)
   * @returns {Promise<Object>} { standardDeviation, coefficientOfVariation, mean }
   */
  async calculateDemandVariability(itemId, warehouseId = null, days = 90) {
    try {
      // Group issues by day
      const dailyConsumption = await this.getDailyConsumption(itemId, warehouseId, days);
      
      if (dailyConsumption.length < 7) {
        logger.debug(`Insufficient data for variability calculation (${dailyConsumption.length} days)`);
        return { standardDeviation: 0, coefficientOfVariation: 0, mean: 0 };
      }
      
      const mean = dailyConsumption.reduce((a, b) => a + b, 0) / dailyConsumption.length;
      
      if (mean === 0) {
        return { standardDeviation: 0, coefficientOfVariation: 0, mean: 0 };
      }
      
      const variance = dailyConsumption.reduce((sum, val) => 
        sum + Math.pow(val - mean, 2), 0
      ) / dailyConsumption.length;
      
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 0;
      
      logger.debug(`Demand variability for item ${itemId}: CV=${coefficientOfVariation.toFixed(2)}, stdDev=${stdDev.toFixed(2)}`);
      
      return {
        standardDeviation: parseFloat(stdDev.toFixed(2)),
        coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(2)),
        mean: parseFloat(mean.toFixed(2))
      };
    } catch (error) {
      logger.error(`Error calculating demand variability for item ${itemId}:`, error);
      return { standardDeviation: 0, coefficientOfVariation: 0, mean: 0 };
    }
  }

  /**
   * Forecast future demand using simple moving average
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {number} forecastDays - Days to forecast (default: 30)
   * @returns {Promise<Object>} Forecast data
   */
  async forecastDemand(itemId, warehouseId = null, forecastDays = 30) {
    try {
      const avgDailyConsumption = await this.calculateAverageDailyConsumption(
        itemId, 
        warehouseId, 
        90 // Use 90 days for more stable forecast
      );
      
      // Simple forecast: assume same average continues
      // TODO: Implement more sophisticated forecasting (linear regression, exponential smoothing)
      const totalForecast = avgDailyConsumption * forecastDays;
      
      // Determine confidence based on data quality
      const variability = await this.calculateDemandVariability(itemId, warehouseId, 90);
      let confidenceLevel = 'medium';
      if (variability.coefficientOfVariation < 0.3) {
        confidenceLevel = 'high';
      } else if (variability.coefficientOfVariation > 0.7) {
        confidenceLevel = 'low';
      }
      
      return {
        forecastDays,
        dailyForecast: parseFloat(avgDailyConsumption.toFixed(2)),
        totalForecast: parseFloat(totalForecast.toFixed(2)),
        confidenceLevel,
        variability: variability.coefficientOfVariation
      };
    } catch (error) {
      logger.error(`Error forecasting demand for item ${itemId}:`, error);
      return {
        forecastDays,
        dailyForecast: 0,
        totalForecast: 0,
        confidenceLevel: 'low',
        variability: 0
      };
    }
  }

  /**
   * Calculate expected consumption during supplier lead time
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {Object} supplier - Supplier model instance
   * @returns {Promise<Object>} Lead time demand calculation
   */
  async calculateLeadTimeDemand(itemId, warehouseId = null, supplier = null) {
    try {
      const avgDailyConsumption = await this.calculateAverageDailyConsumption(
        itemId,
        warehouseId,
        60 // Use 60 days for lead time calculation
      );
      
      const item = await Item.findByPk(itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }
      
      const leadTime = supplier?.avg_lead_time_days || item.lead_time_days || 7;
      const leadTimeDemand = avgDailyConsumption * leadTime;
      
      const variability = await this.calculateDemandVariability(itemId, warehouseId, 60);
      
      // Safety stock: Z-score * std dev * sqrt(lead time)
      // Z = 1.65 for 95% service level (one-tailed)
      const safetyStock = 1.65 * variability.standardDeviation * Math.sqrt(leadTime);
      const recommendedSafetyStock = Math.max(safetyStock, item.safety_stock || 0);
      
      return {
        leadTimeDemand: parseFloat(leadTimeDemand.toFixed(2)),
        safetyStock: parseFloat(recommendedSafetyStock.toFixed(2)),
        totalRequired: parseFloat((leadTimeDemand + recommendedSafetyStock).toFixed(2)),
        avgDailyConsumption: parseFloat(avgDailyConsumption.toFixed(2)),
        leadTime,
        variability: variability.coefficientOfVariation
      };
    } catch (error) {
      logger.error(`Error calculating lead time demand for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get average consumption for items in same category
   * Used when item has no history
   * @param {number} categoryId 
   * @param {number|null} warehouseId 
   * @param {number} days 
   * @returns {Promise<number>} Average daily consumption for category
   */
  async getCategoryAverageConsumption(categoryId, warehouseId = null, days = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sinceDate = since.toISOString().split('T')[0];
      
      const whereClause = {
        transaction_type: 'Issue',
        transaction_date: { [Op.gte]: sinceDate },
        '$item.category_id$': categoryId,
        '$item.is_active$': true
      };
      
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      // Get total issued for category
      const result = await StockLedger.findOne({
        where: whereClause,
        include: [{
          model: Item,
          as: 'item',
          attributes: [],
          required: true
        }],
        attributes: [
          [fn('SUM', fn('ABS', col('quantity'))), 'totalIssued'],
          [fn('COUNT', fn('DISTINCT', col('item_id'))), 'itemCount']
        ],
        raw: true
      });
      
      const totalIssued = parseFloat(result?.totalIssued || 0);
      const itemCount = parseInt(result?.itemCount || 0);
      
      if (itemCount === 0 || totalIssued === 0) {
        return 0;
      }
      
      // Average per item per day
      const avgPerItem = totalIssued / itemCount / days;
      return parseFloat(avgPerItem.toFixed(2));
    } catch (error) {
      logger.error(`Error getting category average consumption for category ${categoryId}:`, error);
      return 0;
    }
  }

  /**
   * Detect seasonal patterns in consumption
   * Analyzes consumption over 12 months
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @returns {Promise<Object>} Seasonal multipliers by month
   */
  async detectSeasonalPattern(itemId, warehouseId = null) {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const sinceDate = since.toISOString().split('T')[0];
      
      const whereClause = {
        item_id: itemId,
        transaction_type: 'Issue',
        transaction_date: { [Op.gte]: sinceDate }
      };
      
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      const issues = await StockLedger.findAll({
        where: whereClause,
        attributes: [
          [fn('MONTH', col('transaction_date')), 'month'],
          [fn('SUM', fn('ABS', col('quantity'))), 'totalIssued']
        ],
        group: [fn('MONTH', col('transaction_date'))],
        raw: true
      });
      
      if (issues.length < 6) {
        // Not enough data for seasonal analysis
        return { hasPattern: false, multipliers: {} };
      }
      
      // Calculate average monthly consumption
      const monthlyTotals = {};
      issues.forEach(issue => {
        monthlyTotals[issue.month] = parseFloat(issue.totalIssued || 0);
      });
      
      const overallAverage = Object.values(monthlyTotals).reduce((a, b) => a + b, 0) / 12;
      
      if (overallAverage === 0) {
        return { hasPattern: false, multipliers: {} };
      }
      
      // Calculate multipliers (1.0 = average, >1.0 = above average, <1.0 = below average)
      const multipliers = {};
      for (let month = 1; month <= 12; month++) {
        const monthTotal = monthlyTotals[month] || overallAverage;
        multipliers[month] = parseFloat((monthTotal / overallAverage).toFixed(2));
      }
      
      // Check if there's a significant pattern (some months > 20% different from average)
      const hasPattern = Object.values(multipliers).some(m => m > 1.2 || m < 0.8);
      
      logger.debug(`Seasonal pattern detected for item ${itemId}: ${hasPattern ? 'Yes' : 'No'}`);
      
      return {
        hasPattern,
        multipliers,
        overallAverage: parseFloat(overallAverage.toFixed(2))
      };
    } catch (error) {
      logger.error(`Error detecting seasonal pattern for item ${itemId}:`, error);
      return { hasPattern: false, multipliers: {} };
    }
  }

  /**
   * Calculate consumption trend (increasing/decreasing/stable)
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @param {number} months - Number of months to analyze (default: 6)
   * @returns {Promise<Object>} Trend direction and percentage change
   */
  async getConsumptionTrend(itemId, warehouseId = null, months = 6) {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      const sinceDate = since.toISOString().split('T')[0];
      
      const whereClause = {
        item_id: itemId,
        transaction_type: 'Issue',
        transaction_date: { [Op.gte]: sinceDate }
      };
      
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      // Get monthly consumption
      const monthlyData = await StockLedger.findAll({
        where: whereClause,
        attributes: [
          [fn('YEAR', col('transaction_date')), 'year'],
          [fn('MONTH', col('transaction_date')), 'month'],
          [fn('SUM', fn('ABS', col('quantity'))), 'totalIssued']
        ],
        group: [fn('YEAR', col('transaction_date')), fn('MONTH', col('transaction_date'))],
        order: [
          [fn('YEAR', col('transaction_date')), 'ASC'],
          [fn('MONTH', col('transaction_date')), 'ASC']
        ],
        raw: true
      });
      
      if (monthlyData.length < 3) {
        return {
          direction: 'stable',
          percentageChange: 0,
          description: 'Insufficient data for trend analysis'
        };
      }
      
      // Split into first half and second half
      const midpoint = Math.floor(monthlyData.length / 2);
      const firstHalf = monthlyData.slice(0, midpoint);
      const secondHalf = monthlyData.slice(midpoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + parseFloat(m.totalIssued || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + parseFloat(m.totalIssued || 0), 0) / secondHalf.length;
      
      if (firstHalfAvg === 0) {
        return {
          direction: secondHalfAvg > 0 ? 'increasing' : 'stable',
          percentageChange: 0,
          description: 'No baseline data'
        };
      }
      
      const percentageChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      const absChange = Math.abs(percentageChange);
      
      let direction = 'stable';
      if (absChange > 10) {
        direction = percentageChange > 0 ? 'increasing' : 'decreasing';
      }
      
      return {
        direction,
        percentageChange: parseFloat(percentageChange.toFixed(2)),
        firstHalfAverage: parseFloat(firstHalfAvg.toFixed(2)),
        secondHalfAverage: parseFloat(secondHalfAvg.toFixed(2)),
        description: `${direction} trend (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`
      };
    } catch (error) {
      logger.error(`Error getting consumption trend for item ${itemId}:`, error);
      return {
        direction: 'stable',
        percentageChange: 0,
        description: 'Error analyzing trend'
      };
    }
  }
}

module.exports = new DemandAnalysisService();
