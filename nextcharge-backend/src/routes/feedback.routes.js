const express = require('express');
const router = express.Router();
const feedbackCtrl = require('../controllers/feedback.controller');
const { protect } = require('../middleware/auth');

router.get('/', feedbackCtrl.getAllFeedbacks);
router.post('/', protect, feedbackCtrl.createFeedback);

module.exports = router;
