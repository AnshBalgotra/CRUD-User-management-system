
const jwt = require("jsonwebtoken")
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const appError = require("../utils/appError"); 
const {promisify} = require('util')
const crypto = require("crypto")
const signToken = id=>{
    return jwt.sign({id:id}, 'your-secret-key-vishnu', {expiresIn:'90d'})
}

const createSendToken = (user,statusCode, res)=>{
    const token = signToken(user._id)
    const cookieOptions = {
        expiresIn: new Date( Date.now()+ 90*24*60*60*1000),
        httpOnly: true
    }
    if (process.env.NODE_ENV==='production') cookieOptions = true 
    user.password = undefined

    res.cookie('jwt',token,cookieOptions)
    res.status(statusCode).json({
        status:"success",
        token,
        user
    })
  
}
exports.signup = catchAsync( async (req,res,next)=>{

    const newUser = User.create(req.body) 
    
    createSendToken(newUser,201,res)

})

exports.login = catchAsync( async (req,res,next)=>{
    const {email, password} = req.body 
    console.log(email, password)

    if (!email || !password){
        return next( new appError("Please provide email and password",400))
    }
 
    
    const user = await User.findOne({ email: email }).select("+password");
    console.log(user) 

    if (!user || !(await  user.correctPassword(password, user.password))){
        return next( new appError("PLease provide email and password",400))
    }
    createSendToken(user,200,res)
})

exports.protect = catchAsync( async (req,res,next)=>{
    let token; 

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1]
        
    }
    const decoded = await promisify(jwt.verify)(token,'your-secret-key-vishnu')
    console.log(decoded.id)
    
    const freshUser = await User.findById(decoded.id) 

    if (!freshUser){
        return next(new appError("User doesnt exist",401))
    }
    if (freshUser.changedPasswordAfter(decoded.iat)){
        return next( new appError("Wrong Password",401))
    } 
    console.log(freshUser)
    req.user = freshUser
    next() 
})


exports.restrictTo = (...roles)=>{
    return (req,res,next)=>{
        if (!roles.includes(req.user.role)){
            return next( new appError("You are not allow to do so!", 403))
        }
        next(); 
    }
}


exports.forgetPassword = catchAsync(async (req,res,next) =>{
    const user = await User.findOne({email:req.body.email})
    if (!user){
        return next( new appError("There is no user with this email ",404))
    }
    
    const resetToken = user.createPasswordResetToken() 
    
    await user.save({validateBeforeSave:false})
    console.log(resetToken)
    return next() 

}) 
exports.resetPassword = catchAsync( async (req,res,next) =>{
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({passwordResetToken:hashedToken, passwordResetExpires:{$gt:Date.now()}})

    if (!user){
        return next( new appError("Token has expired", 400))
    }

    user.password = req.body.password 
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined 
    await user.save() 
    
    createSendToken(user,200,res)

}) 

exports.updatePassword = catchAsync( async (req,res,next)=>{
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    createSendToken(user,200 ,res)
})

exports.deleteUser = catchAsync( async (req,res,next)=>{
    await User.findByIdAndUpdate(req.user._id, {active:false})

    res.status(200).json({
        status:"success",
        data:null
    })
})