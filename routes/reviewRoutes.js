const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({mergeParams:true});

router.use(authController.protect) 
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authController.restrictTo('user'), reviewController.createReview)


router
  .route('/:tourID/reviews')
  .get(reviewController.getAllReviews)
  .post(reviewController.setTourUserIds, reviewController.createReview)
module.exports = router 