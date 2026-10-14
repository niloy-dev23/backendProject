const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcrypt')

const userSchema = new Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    }, 
    password: {
        type:String,
        required:true
    },
    profilePic: {
        type:String
    },
    address: {
        type:String
    },
    gender: {
        type:String,
        enum:['male', 'female', 'others']
    },
    isEmailVerified: {
        type:Boolean,
        default:false,
    },
    emailVerificationToken:{
        type:String,
        select:false
    },
    emailVerificationTokenExpires:{
        type:Date,
        select:false
    },
    passwordResetToken:{
        type:String,
        select:false
    },
    passwordResetTokenExpires:{
        type:Date,
        select:false
    }
},
{
    timestamps:true
})

userSchema.pre('save', async function(next){
    if(!this.isModified('password')){
        return next()
    }
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model('User', userSchema)