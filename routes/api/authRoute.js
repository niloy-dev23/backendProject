const express = require('express')
const router = express.Router()
const {
    registration,
    verifyEmail,
    resendVerification,
    login,
    forgotPassword,
    resetPassword,
    getMe
} = require('../../controller/authController')
const { protect } = require('../../middleware/authMiddleware')
const limiter = require('../../middleware/limiter')
const getAll = require('../../controller/getAllUserController')

router.post('/registration', registration)
router.post('/login',limiter, login)
router.get('/verify-email', verifyEmail)
router.post('/verify-email', verifyEmail)
router.post('/resend-verification', resendVerification)
router.post('/forgot-password', forgotPassword)
router.get('/reset-password', (req, res) => {
    const { token } = req.query
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Reset token is required. Submit a POST request with token and new password.'
        })
    }
    return res.status(200).json({
        success: true,
        message: 'Valid reset link received. Submit a POST request to this endpoint with token, password, and optional confirmPassword.',
        data: { token }
    })
})
router.post('/reset-password', resetPassword)
router.get('/me', protect, getMe)
router.get('/getAll', protect, getAll)

module.exports = router
