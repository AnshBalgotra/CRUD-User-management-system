const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require("bcryptjs")
const crypto = require("crypto")


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique: true,
        lowercase:true
    },
    photo:{
        type:String, 
        default:''
    },
    role:{
        type:String, 
        enum:['user','admin', 'guide','lead-guide'],
        default:'user' 
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    passwordConfirm:{
        type:String,
        required:true,
        validate: {
            validator: function (value) {
                return value === this.password;
            },
            message: 'Password confirmation does not match the password.',
        },
        select:false
    },
    passwordChangedAt:Date,
    passwordResetToken:String,
    passwordResetExpires:Date,
    active:{
        type:Boolean,
        default:true,
        select: false
    }
})



userSchema.pre(/^find/, function (next){
    this.find({active:{$ne:false}})
    next() 
})
userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();
  
    // Hash the password with cost of 12
    console.log(this.password); 
    this.password = await bcrypt.hash(this.password, 12);
    console.log(this.password); 
  
    // Delete passwordConfirm field
    this.passwordConfirm = undefined;
    next();
});
userSchema.pre('save',async function(next){
    if (!this.isModified('password') ||!this.isNew){
        return next()
    }
    this.passwordChangedAt = Date.now() - 1000 
    next() 
})

userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimeStamp){
    if (this.passwordChangedAt){
        const changedTimestamp = parseInt( this.passwordChangedAt.getTime() / 1000, 10 );
        console.log(changedTimestamp, JWTTimeStamp)

        return JWTTimeStamp < changedTimestamp
    }


    return false // not changed 
}

userSchema.methods.createPasswordResetToken = function (){
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex') 
    this.passwordResetExpires = Date.now()+ 10*60*1000

    return resetToken

}


const User = mongoose.model('User', userSchema);
module.exports = User;