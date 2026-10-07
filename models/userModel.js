const mongoose = require('mongoose')
const {Schema} = mongoose

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
    }
},
{
    timestamps:true
})

module.exports = mongoose.model('User', userSchema)