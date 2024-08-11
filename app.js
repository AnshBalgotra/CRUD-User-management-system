// just checking the chnages 

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();
app.use(helmet())
app.use(express.json())
// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max:100,
  windowMS:60*60*1000,
  message:"Too many req to this IP. Try Again in an hour"
})
app.use('api/', limiter)
app.use(express.json({limit:'100kb'})); //to get req.body data from the post request 
app.use(mongoSanitize())
app.use(xss())
app.use(express.static(`${__dirname}/public`));// to use static in url 

app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  next();
});// checking the middleware is working or not 

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  
  next();
}); // providing one more req params as date so that we can use in our actions 

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

module.exports = app;