const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const generateAuthToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be configured')
    }

    const payload = {
        id: user._id,
        username: user.username,
        email: user.email,
        tokenUse: 'access'
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: process.env.JWT_EXPIRES || '15m'
    })
}

/**
 * Creates a random token for email verification / password reset.
 * Returns the plain token (send via email) and a SHA-256 hash (store in DB).
 */
const generateSecureToken = () => {
    const plainToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = hashToken(plainToken)
    return { plainToken, hashedToken }
}

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

module.exports = {
    generateAuthToken,
    generateSecureToken,
    hashToken
}
