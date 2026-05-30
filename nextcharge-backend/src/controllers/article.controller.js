const Article = require('../models/Article');
const { asyncHandler, sendSuccess, sendPaginated, AppError } = require('../utils/errors');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ─── Public: List Published Articles ──────────────────────────────────────────
exports.getPublishedArticles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, tag } = req.query;
  const query = { status: 'published' };
  if (tag) query.tags = tag;

  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('author', 'name avatar')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-body'), // Don't send full body in list
    Article.countDocuments(query)
  ]);

  sendPaginated(res, articles, total, page, limit, 'Published articles fetched');
});

// ─── Public: Get Single Article by Slug ───────────────────────────────────────
exports.getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOneAndUpdate(
    { slug: req.params.slug, status: 'published' },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('author', 'name avatar');

  if (!article) throw new AppError('Article not found.', 404);

  sendSuccess(res, { article }, 'Article fetched');
});

// ─── Admin: List All Articles (including drafts) ──────────────────────────────
exports.getAdminArticles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = {};
  if (status) query.status = status;

  const [articles, total] = await Promise.all([
    Article.find(query)
      .populate('author', 'name avatar')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit)),
    Article.countDocuments(query)
  ]);

  sendPaginated(res, articles, total, page, limit, 'Admin articles fetched');
});

// ─── Admin: Create Article ────────────────────────────────────────────────────
exports.createArticle = asyncHandler(async (req, res) => {
  const { title, excerpt, body, tags, status } = req.body;

  let coverImage = { url: null, publicId: null };

  // Handle image upload if file is attached
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'nextcharge/articles'
    });
    coverImage = { url: result.secure_url, publicId: result.public_id };
  }

  const article = await Article.create({
    title,
    excerpt,
    body,
    coverImage,
    author: req.user._id || req.user.id,
    tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
    status: status || 'draft'
  });

  const populated = await Article.findById(article._id).populate('author', 'name avatar');

  sendSuccess(res, { article: populated }, 'Article created', 201);
});

// ─── Admin: Update Article ────────────────────────────────────────────────────
exports.updateArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new AppError('Article not found.', 404);

  const { title, excerpt, body, tags, status } = req.body;

  if (title) article.title = title;
  if (excerpt !== undefined) article.excerpt = excerpt;
  if (body) article.body = body;
  if (tags) article.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
  if (status) article.status = status;

  // Handle new image upload
  if (req.file) {
    // Delete old image from Cloudinary if exists
    if (article.coverImage?.publicId) {
      await deleteFromCloudinary(article.coverImage.publicId);
    }
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'nextcharge/articles'
    });
    article.coverImage = { url: result.secure_url, publicId: result.public_id };
  }

  await article.save();
  const populated = await Article.findById(article._id).populate('author', 'name avatar');

  sendSuccess(res, { article: populated }, 'Article updated');
});

// ─── Admin: Delete Article ────────────────────────────────────────────────────
exports.deleteArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new AppError('Article not found.', 404);

  // Delete cover image from Cloudinary
  if (article.coverImage?.publicId) {
    await deleteFromCloudinary(article.coverImage.publicId);
  }

  await Article.findByIdAndDelete(req.params.id);

  sendSuccess(res, {}, 'Article deleted');
});

// ─── Admin: Upload Image (standalone endpoint) ───────────────────────────────
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No image file provided.', 400);

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'nextcharge/articles'
  });

  sendSuccess(res, {
    url: result.secure_url,
    publicId: result.public_id
  }, 'Image uploaded');
});
