const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const generateAuthToken = (user) => {
    const payload = {
        id: user._id,
        username: user.username,
        email: user.email
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES
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
