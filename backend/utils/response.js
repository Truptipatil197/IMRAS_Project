/**
 * Response Utility
 * Standardizes API responses
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const sendError = (res, message = 'Error', statusCode = 500) => {
  res.status(statusCode).json({
    status: 'error',
    message
  });
};

module.exports = {
  sendSuccess,
  sendError
};

