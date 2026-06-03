const reportService = require('../services/reportService');

/**
 * Get admin summary reports
 * GET /api/v1/reports/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await reportService.getAdminReportSummary();
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
