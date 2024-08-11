const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController')
const reviewRouter = require('./../routes/reviewRoutes')
const router = express.Router();

router.use('/:tourID/reviews', reviewRouter); 


router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/tour-stats')
  .get( authController.protect, authController.restrictTo('admin','lead-guide','guide'), tourController.getTourStats); 

router
  .route('/monthly-plan/:year')
  .get(tourController.getMonthlyPlan); 
router
  .route('/top-5-cheap-tour')
  .get(tourController.aliasTopTours,tourController.getAllTours); 

router.use(authController.protect) 
router
  .route('/')
  .get( authController.protect ,tourController.getAllTours)
  .post( authController.restrictTo('admin','lead-guide'), tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch( authController.restrictTo('admin','lead-guide'), tourController.updateTour)
  .delete( authController.restrictTo('admin','lead-guide'),tourController.deleteTour);





module.exports = router;