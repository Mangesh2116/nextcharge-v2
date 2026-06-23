const Feedback = require('../models/Feedback');
const { asyncHandler, sendSuccess, sendPaginated } = require('../utils/errors');

exports.createFeedback = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ success: false, message: 'Rating and comment are required' });
  }

  const feedback = await Feedback.create({
    user: req.user._id,
    rating: parseInt(rating),
    comment
  });

  await feedback.populate('user', 'name');

  sendSuccess(res, { feedback }, 'Feedback submitted. Thank you for your review!', 201);
});

exports.getAllFeedbacks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const [feedbacks, total] = await Promise.all([
    Feedback.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit)),
    Feedback.countDocuments()
  ]);

  sendPaginated(res, feedbacks, total, page, limit, 'Feedbacks fetched successfully');
});
