const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const userModel = require('../models/userModel')
const {
    generateAuthToken,
    generateSecureToken,
    hashToken
} = require('../helpers/tokenHelper')
const {
    sendVerificationEmail,
    sendPasswordResetEmail
} = require('../helpers/emailHelper')

const getVerificationExpiry = () => {
    const ms = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MS) || 86400000
    return new Date(Date.now() + ms)
}

const getPasswordResetExpiry = () => {
    const ms = Number(process.env.PASSWORD_RESET_EXPIRES_MS) || 900000
    return new Date(Date.now() + ms)
}

const getRefreshTokenExpiry = () => {
    const configuredMs = process.env.REFRESH_TOKEN_EXPIRES_MS
    const ms = configuredMs === undefined ? 7 * 24 * 60 * 60 * 1000 : Number(configuredMs)

    if (!Number.isSafeInteger(ms) || ms <= 0) {
        throw new Error('REFRESH_TOKEN_EXPIRES_MS must be a positive integer')
    }

    return new Date(Date.now() + ms)
}

const registration = async (req, res) => {
    try {
        const { username, email, password, profilePic, address, gender, role } = req.body
        if (!username || !email || !password || !gender) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, password and gender are required'
            })
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email is not valid'
            })
        }

        if (!['male', 'female', 'others'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: 'Gender must be male, female, or others'
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            })
        }

        const normalizedEmail = email.toLowerCase().trim()
        const existingEmail = await userModel.findOne({ email: normalizedEmail })
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            })
        }

        const { plainToken, hashedToken } = generateSecureToken()

        const user = new userModel({
            username: username.trim(),
            email: normalizedEmail,
            password,
            profilePic,
            address,
            gender,
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationTokenExpires: getVerificationExpiry()
        })

        await user.save()

        try {
            await sendVerificationEmail({
                to: user.email,
                username: user.username,
                plainToken
            })
        } 
        
        catch (emailError) {
            console.error('Failed to send verification email:', emailError.message)
            return res.status(201).json({
                success: true,
                message: 'User registered, but verification email could not be sent. Please request a new verification email.',
                data: user.toSafeObject()
            })
        }

        return res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
            data: user.toSafeObject()
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        })
    }
}

const verifyEmail = async (req, res) => {
    try {
        const token = req.query.token || req.body.token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            })
        }

        const hashed = hashToken(token)
        const user = await userModel
            .findOne({ emailVerificationToken: hashed })
            .select('+emailVerificationToken +emailVerificationTokenExpires')

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or already-used verification token'
            })
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            })
        }

        if (!user.emailVerificationTokenExpires || user.emailVerificationTokenExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Verification token has expired. Please request a new verification email.'
            })
        }

        await userModel.findByIdAndUpdate(user._id, {
            $set: { isEmailVerified: true },
            $unset: {
                emailVerificationToken: 1,
                emailVerificationTokenExpires: 1
            }
        })

        const updatedUser = await userModel.findById(user._id)

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.',
            data: updatedUser.toSafeObject()
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Email verification failed',
            error: error.message
        })
    }
}

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'A valid email is required'
            })
        }

        const user = await userModel
            .findOne({ email: email.toLowerCase().trim() })
            .select('+emailVerificationToken +emailVerificationTokenExpires')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            })
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            })
        }

        const { plainToken, hashedToken } = generateSecureToken()
        user.emailVerificationToken = hashedToken
        user.emailVerificationTokenExpires = getVerificationExpiry()
        await user.save()

        await sendVerificationEmail({
            to: user.email,
            username: user.username,
            plainToken
        })

        return res.status(200).json({
            success: true,
            message: 'A new verification email has been sent'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Could not resend verification email',
            error: error.message
        })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            })
        }

        const user = await userModel
            .findOne({ email: email.toLowerCase().trim() })
            .select('+password')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            })
        }

        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            })
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before logging in. You can request a new verification email.'
            })
        }

        const accessToken = generateAuthToken(user)
        const { plainToken: refreshToken, hashedToken: refreshTokenHash } = generateSecureToken()
        user.refreshTokenHash = refreshTokenHash
        user.refreshTokenExpiresAt = getRefreshTokenExpiry()
        await user.save()

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toSafeObject(),
                accessToken,
                token: accessToken,
                refreshToken
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        })
    }
}

const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body
        if (typeof refreshToken !== 'string' || !/^[a-f0-9]{64}$/i.test(refreshToken)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            })
        }

        const now = new Date()
        const currentHash = hashToken(refreshToken)
        const user = await userModel
            .findOne({
                refreshTokenHash: currentHash,
                refreshTokenExpiresAt: { $gt: now },
                isEmailVerified: true
            })
            .select('+refreshTokenHash +refreshTokenExpiresAt')

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            })
        }

        const accessToken = generateAuthToken(user)
        const {
            plainToken: nextRefreshToken,
            hashedToken: nextRefreshTokenHash
        } = generateSecureToken()
        const refreshTokenExpiresAt = getRefreshTokenExpiry()

        const rotatedUser = await userModel.findOneAndUpdate(
            {
                _id: user._id,
                refreshTokenHash: currentHash,
                refreshTokenExpiresAt: { $gt: new Date() },
                isEmailVerified: true
            },
            {
                $set: {
                    refreshTokenHash: nextRefreshTokenHash,
                    refreshTokenExpiresAt
                }
            },
            { new: true }
        )

        if (!rotatedUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Access token refreshed successfully',
            data: {
                accessToken,
                token: accessToken,
                refreshToken: nextRefreshToken
            }
        })
    } catch (error) {
        console.error('Could not refresh access token:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Could not refresh access token'
        })
    }
}

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body
        if (typeof refreshToken !== 'string' || !/^[a-f0-9]{64}$/i.test(refreshToken)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            })
        }

        const user = await userModel.findOneAndUpdate(
            {
                refreshTokenHash: hashToken(refreshToken),
                refreshTokenExpiresAt: { $gt: new Date() }
            },
            {
                $unset: {
                    refreshTokenHash: 1,
                    refreshTokenExpiresAt: 1
                }
            },
            { new: true }
        )

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        })
    } catch (error) {
        console.error('Could not log out:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Could not log out'
        })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'A valid email is required'
            })
        }

        const genericMessage =
            'If an account with that email exists, a password reset link has been sent.'

        const user = await userModel.findOne({ email: email.toLowerCase().trim() })
        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            })
        }

        const { plainToken, hashedToken } = generateSecureToken()
        user.passwordResetToken = hashedToken
        user.passwordResetTokenExpires = getPasswordResetExpiry()
        await user.save()

        try {
            await sendPasswordResetEmail({
                to: user.email,
                username: user.username,
                plainToken
            })
        } catch (emailError) {
            await userModel.findByIdAndUpdate(user._id, {
                $unset: {
                    passwordResetToken: 1,
                    passwordResetTokenExpires: 1
                }
            })
            console.error('Failed to send password reset email:', emailError.message)
            return res.status(500).json({
                success: false,
                message: 'Could not send password reset email. Please try again later.'
            })
        }

        return res.status(200).json({
            success: true,
            message: genericMessage
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Password reset request failed',
            error: error.message
        })
    }
}

const resetPassword = async (req, res) => {
    try {
        const token = req.query.token || req.body.token
        const { password, confirmPassword } = req.body

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            })
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            })
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            })
        }

        const hashed = hashToken(token)
        const user = await userModel
            .findOne({
                passwordResetToken: hashed,
                passwordResetTokenExpires: { $gt: new Date() }
            }).select('+passwordResetToken +passwordResetTokenExpires +password')

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token'
            })
        }

        user.password = password
        user.passwordResetToken = undefined
        user.passwordResetTokenExpires = undefined
        await user.save()

        await userModel.findByIdAndUpdate(user._id, {
            $unset: {
                passwordResetToken: 1,
                passwordResetTokenExpires: 1,
                refreshTokenHash: 1,
                refreshTokenExpiresAt: 1
            }
        })

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Password reset failed',
            error: error.message
        })
    }
}

const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Authenticated user profile',
        data: req.user.toSafeObject()
    })
}

module.exports = {
    registration,
    verifyEmail,
    resendVerification,
    login,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    getMe
}
