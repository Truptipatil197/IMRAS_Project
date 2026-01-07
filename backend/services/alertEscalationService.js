const { Alert, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Alert Escalation Service
 * Handles alert escalation and notifications
 */
class AlertEscalationService {
  constructor() {
    this.config = {
      escalationThresholdHours: 24,
      criticalThresholdHours: 6,
      enableEmail: process.env.ALERT_EMAIL_ENABLED === 'true'
    };
  }

  /**
   * Process escalations for unread alerts
   * @returns {Promise<Object>} Escalation statistics
   */
  async processEscalations() {
    try {
      const stats = { checked: 0, escalated: 0 };
      
      // Find unread alerts past threshold
      const thresholdDate = new Date(
        Date.now() - this.config.escalationThresholdHours * 60 * 60 * 1000
      );
      
      const criticalThresholdDate = new Date(
        Date.now() - this.config.criticalThresholdHours * 60 * 60 * 1000
      );

      const alerts = await Alert.findAll({
        where: {
          is_read: false,
          created_at: { [Op.lt]: thresholdDate }
        },
        include: [
          {
            model: User,
            as: 'assignedUser',
            required: false
          }
        ]
      });

      stats.checked = alerts.length;

      for (const alert of alerts) {
        const hoursSinceCreation = (Date.now() - alert.created_at.getTime()) / (60 * 60 * 1000);
        
        // Escalate if past threshold
        if ((alert.severity === 'Critical' && hoursSinceCreation >= this.config.criticalThresholdHours) ||
            hoursSinceCreation >= this.config.escalationThresholdHours) {
          await this.escalateAlert(alert);
          stats.escalated++;
        }
      }

      logger.info(`Alert escalation: ${stats.escalated} of ${stats.checked} alerts escalated`);
      return stats;
    } catch (error) {
      logger.error('Error processing alert escalations:', error);
      throw error;
    }
  }

  /**
   * Escalate a single alert
   * @param {Object} alert - Alert model instance
   * @returns {Promise<void>}
   */
  async escalateAlert(alert) {
    try {
      // Increase severity if not already critical
      let newSeverity = alert.severity;
      if (alert.severity === 'Low') {
        newSeverity = 'Medium';
      } else if (alert.severity === 'Medium') {
        newSeverity = 'High';
      } else if (alert.severity === 'High') {
        newSeverity = 'Critical';
      }
      // If already Critical, keep it as Critical

      // Update alert
      await alert.update({
        severity: newSeverity
      });

      // Notify management
      const managers = await User.findAll({
        where: { 
          role: { [Op.in]: ['Admin', 'Manager'] },
          is_active: true
        }
      });

      for (const manager of managers) {
        await this.sendNotification(alert, manager);
      }

      logger.info(`Alert ${alert.alert_id} escalated to ${newSeverity}`);
    } catch (error) {
      logger.error(`Error escalating alert ${alert.alert_id}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to user
   * @param {Object} alert - Alert model instance
   * @param {Object} user - User model instance
   * @returns {Promise<void>}
   */
  async sendNotification(alert, user) {
    try {
      // Log notification (can be extended to email/SMS)
      logger.info(`Notification sent to ${user.username} (${user.email}) for alert ${alert.alert_id}: ${alert.message}`);
      
      // TODO: Integrate with email service if configured
      if (this.config.enableEmail && user.email) {
        // await sendEmail(user.email, 'Alert Escalation', alert.message);
      }
      
      // TODO: Integrate with SMS service for critical alerts
      if (alert.severity === 'Critical' && user.phone) {
        // await sendSMS(user.phone, `CRITICAL ALERT: ${alert.message}`);
      }
    } catch (error) {
      logger.error(`Error sending notification to user ${user.user_id}:`, error);
    }
  }
}

module.exports = new AlertEscalationService();
