const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const userModel = require('../models/userModel')
const generateToken = require('../helpers/tokenHelper')

const registration = async (req, res)=>{
    const {username, email, password, profilePic, address, gender} = req.body
    if(!username || !email || !password || !gender){
        return res.status(400).json({
            success:false,
            message:"Username, email, password and gender is required"
        })
    }
    const validEmail = emailRegex.test(email)
    if(!validEmail){
        return res.status(400).json({
            success:false,
            message:"Email is not valid"
        })
    }
    const existingEmail = await userModel.findOne({email:email})
    if(existingEmail){
        return res.status(400).json({
            success:false,
            message:"Email already exists"
        })
    }
    if(password.length < 8){
        return res.status(400).json({
            success:false,
            message:"Password must be at least 8 characters long"
        })
    }
    const user = new userModel({
        username, email, password, profilePic, address, gender, emailVerificationToken:generateToken(userModel)
    })
    await user.save()
    res.status(201).json({
        success:true,
        message:"User Registered Successfully",
        data:user
    })
}

module.exports = registration