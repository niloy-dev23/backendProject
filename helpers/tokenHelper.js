const jwt = require('jsonwebtoken')

const generateToken = (user)=>{
    const payload = {
        id:user._id,
        username:user.username,
        email:user.email
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES})
}

module.exports = generateToken