const express = require('express');
const router = express.Router();
const articleCtrl = require('../controllers/article.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ─── Public Routes ────────────────────────────────────────────────────────────
router.get('/',          articleCtrl.getPublishedArticles);
router.get('/:slug',     articleCtrl.getArticleBySlug);

// ─── Admin-Only Routes ────────────────────────────────────────────────────────
router.post('/',         protect, authorize('admin'), upload.single('coverImage'), articleCtrl.createArticle);
router.put('/:id',       protect, authorize('admin'), upload.single('coverImage'), articleCtrl.updateArticle);
router.delete('/:id',    protect, authorize('admin'), articleCtrl.deleteArticle);

// Admin: list all articles (including drafts)
router.get('/admin/all', protect, authorize('admin'), articleCtrl.getAdminArticles);

// Admin: standalone image upload
router.post('/upload',   protect, authorize('admin'), upload.single('image'), articleCtrl.uploadImage);

module.exports = router;
