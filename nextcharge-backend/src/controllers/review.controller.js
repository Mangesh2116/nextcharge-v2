const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { AppError, asyncHandler, sendSuccess, sendPaginated } = require('../utils/errors');

// ─── Create Review ────────────────────────────────────────────────────────────
exports.createReview = asyncHandler(async (req, res) => {
  const { bookingId, stationId, googlePlaceId, stationName, stationAddress, rating, title, body, tags } = req.body;

  let reviewData = {
    user: req.user._id,
    rating: parseInt(rating),
    title: title || '',
    body: body || '',
    tags: tags || []
  };

  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('Booking not found.', 404);
    if (booking.user.toString() !== req.user._id.toString()) throw new AppError('Access denied.', 403);
    if (booking.status !== 'completed') throw new AppError('You can only review completed sessions.', 400);
    if (booking.review) throw new AppError('You have already reviewed this session.', 409);

    reviewData.booking = bookingId;
    reviewData.station = booking.station;
    reviewData.isVerified = true;

    const review = await Review.create(reviewData);

    booking.review = review._id;
    booking.rating = rating;
    await booking.save();

    return sendSuccess(res, { review }, 'Review submitted. Thank you!', 201);
  }

  if (stationId) {
    reviewData.station = stationId;
    reviewData.isVerified = false;
  } else if (googlePlaceId) {
    reviewData.googlePlaceId = googlePlaceId;
    reviewData.stationName = stationName || 'Google Maps Station';
    reviewData.stationAddress = stationAddress || '';
    reviewData.isVerified = false;
  } else {
    throw new AppError('Either bookingId, stationId, or googlePlaceId is required to write a review.', 400);
  }

  const review = await Review.create(reviewData);
  sendSuccess(res, { review }, 'Review submitted. Thank you!', 201);
});

// ─── Get Station Reviews ──────────────────────────────────────────────────────
exports.getStationReviews = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const isObjectId = require('mongoose').Types.ObjectId.isValid(stationId);
  const query = isObjectId ? { station: stationId } : { googlePlaceId: stationId };

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit)),
    Review.countDocuments(query)
  ]);

  // Rating breakdown
  let breakdown = [];
  if (isObjectId) {
    breakdown = await Review.aggregate([
      { $match: { station: require('mongoose').Types.ObjectId.createFromHexString(stationId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);
  } else {
    breakdown = await Review.aggregate([
      { $match: { googlePlaceId: stationId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);
  }

  const ratingMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdown.forEach(b => { ratingMap[b._id] = b.count; });

  sendPaginated(res, reviews, total, page, limit, 'Reviews fetched');
});

// ─── Operator Reply ───────────────────────────────────────────────────────────
exports.replyToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId).populate('station');
  if (!review) throw new AppError('Review not found.', 404);

  if (review.station.operator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Only the station operator can reply.', 403);
  }
  if (review.operatorReply?.body) throw new AppError('You have already replied to this review.', 400);

  review.operatorReply = { body: req.body.body, repliedAt: new Date() };
  await review.save();
  sendSuccess(res, { review }, 'Reply added');
});

// ─── Delete Review (admin) ────────────────────────────────────────────────────
exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new AppError('Review not found.', 404);
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Access denied.', 403);
  }
  await review.deleteOne();
  sendSuccess(res, {}, 'Review deleted');
});
