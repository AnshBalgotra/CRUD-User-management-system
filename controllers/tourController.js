const fs = require('fs');
const Tour = require('./../models/tourModel'); 
const { json } = require('express');
const factory = require('./handlerFactory'); 
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError'); 


const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);


class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 5;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}





exports.aliasTopTours = (req,res,next)=>{
  req.query.sort = 'price'; 
  req.query.sort = '-ratingsAverage duration';
  next(); 
}


exports.getAllTours = factory.getAll(Tour); 
exports.getTour = factory.getOne(Tour,{path:'reviews'})

exports.createTour = factory.createOne(Tour); 
exports.updateTour = factory.updateOne(Tour); 

exports.deleteTour = factory.deleteOne(Tour); 

exports.getTourStats = async (req,res)=> {
  console.log("This is here");
  try{
    const stats = Tour.aggregate([
      {
        $match:{ratingsAverage:{$gte:4.5}}
      },
      {
        $group: {
          _id: '$difficulty',
          numTour: {$sum:1 },
          ratingsAverage: {$avg: '$ratingsAverage'},
          minPrice: {$min: '$price'},
          maxPrice: {$max: '$price'}
        }
      }
    ]); 
    const tours = await stats; 
    res.status(200).json({
      status:"success",
      data: tours
    }); 

  } catch(err){
      res.status(404).json({
        status:"fail",
        message:err
      })
    }
  }


exports.getMonthlyPlan = async (req,res)=>{
  try{
    const year = req.params.year*1 
    const plan = await Tour.aggregate([
      {$unwind: "$startDates"},
      {
        $match : 
        {startDates :
          {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)              
          }
        }
      },
      {
        $group:{
          _id: {$month: '$startDates'},
          numTourStarts: {$sum:1},
          tours: {$push:'name'}
        }
      },
      {
        $addFields:{month:'$_id'}
      },
      {
        $sort:{numTourStarts:-1}
      },
      {
        $project:{
          _id:0
        }
      }
    ]);
  res.status(200).json({
    status:"success",
    message:"you are in right place",
    data: plan
  });

  } catch{
    res.status(404).json({
      status:"fail",
      message:err
    })
  }
}

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});




exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});