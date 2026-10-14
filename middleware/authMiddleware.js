const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please provide a valid token.'
            })
        }

        const token = authHeader.split(' ')[1]
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please log in again.'
            })
        }

        const user = await userModel.findById(decoded.id).select('-password')
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.'
            })
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before accessing this resource.'
            })
        }

        req.user = user
        next()
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authentication failed.',
            error: error.message
        })
    }
}

module.exports = { protect }
