const SearchService = require('./search.service');
const ResponseHandler = require('../shared/response.handler');

class SearchController {
  /**
   * GET /api/v1/search?q=foo&page=1&limit=10
   */
  static async search(req, res, next) {
    try {
      const query = req.query.q ? req.query.q.trim() : '';
      if (query.length > 0 && (query.length < 2 || query.length > 100)) {
        return res.status(400).json({ success: false, message: 'Search query must be between 2 and 100 characters' });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const results = await SearchService.globalSearch(
        query,
        { _id: req.user._id, role: req.user.role },
        page,
        limit
      );
      
      return ResponseHandler.success(res, results, 'Search results retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SearchController;
