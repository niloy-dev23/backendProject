const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')

const protect = async (req, res, next) => {
    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Authentication service is not configured.'
            })
        }

        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ') || !authHeader.slice(7)) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please provide a valid token.'
            })
        }

        const token = authHeader.split(' ')[1]
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ['HS256']
            })
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please log in again.'
            })
        }

        if (
            !decoded ||
            typeof decoded !== 'object' ||
            !decoded.id ||
            (decoded.tokenUse && decoded.tokenUse !== 'access')
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token.'
            })
        }

        let user
        try {
            user = await userModel.findById(decoded.id)
        } catch (error) {
            if (error.name === 'CastError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid access token.'
                })
            }
            throw error
        }

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
        console.error('Authentication failed:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Authentication failed.'
        })
    }
}

module.exports = { protect }
