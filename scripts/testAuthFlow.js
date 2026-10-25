/**
 * End-to-end auth API smoke test (backend only).
 * Run with: node scripts/testAuthFlow.js
 * Requires the server to be running on BASE_URL.
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwtLibrary = require('jsonwebtoken')
const userModel = require('../models/userModel')
const { generateSecureToken } = require('../helpers/tokenHelper')

const BASE = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
const API = process.env.API_URL || '/api/v1'
const root = `${BASE}${API}`

const unique = Date.now()
const testEmail = `authtest_${unique}@example.com`
const otherTestEmail = `authtest_other_${unique}@example.com`
const testPassword = 'TestPass123'
const newPassword = 'NewPass456'

const request = async (method, path, body, token) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${root}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
}

const assert = (condition, message) => {
    if (!condition) throw new Error(message)
}

const run = async () => {
    console.log('Connecting to DB...')
    await mongoose.connect(process.env.DB_URL)

    console.log('\n1) Registration')
    const reg = await request('POST', '/registration', {
        username: 'AuthTester',
        email: testEmail,
        password: testPassword,
        gender: 'male'
    })
    console.log(reg.status, reg.data.message)
    assert(reg.status === 201, 'Registration should return 201')
    assert(reg.data.data && reg.data.data.isEmailVerified === false, 'User should be unverified')

    console.log('\n2) Login before verification (expect 403)')
    const earlyLogin = await request('POST', '/login', {
        email: testEmail,
        password: testPassword
    })
    console.log(earlyLogin.status, earlyLogin.data.message)
    assert(earlyLogin.status === 403, 'Unverified login should be forbidden')

    console.log('\n3) Inject known verification token & verify')
    const { plainToken: verifyPlain, hashedToken: verifyHash } = generateSecureToken()
    await userModel.findOneAndUpdate(
        { email: testEmail },
        {
            emailVerificationToken: verifyHash,
            emailVerificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000)
        }
    )
    const verify = await request('GET', `/verify-email?token=${verifyPlain}`)
    console.log(verify.status, verify.data.message)
    assert(verify.status === 200, 'Verification should succeed')
    assert(verify.data.data.isEmailVerified === true, 'User should be verified')

    console.log('\n4) Reuse verification token (expect 400)')
    const reuse = await request('GET', `/verify-email?token=${verifyPlain}`)
    console.log(reuse.status, reuse.data.message)
    assert(reuse.status === 400, 'Used token should be rejected')

    console.log('\n5) Expired verification token')
    const { plainToken: expiredPlain, hashedToken: expiredHash } = generateSecureToken()
    await userModel.findOneAndUpdate(
        { email: testEmail },
        {
            isEmailVerified: false,
            emailVerificationToken: expiredHash,
            emailVerificationTokenExpires: new Date(Date.now() - 1000)
        }
    )
    const expired = await request('POST', '/verify-email', { token: expiredPlain })
    console.log(expired.status, expired.data.message)
    assert(expired.status === 400, 'Expired token should be rejected')

    console.log('\n6) Resend verification')
    const resend = await request('POST', '/resend-verification', { email: testEmail })
    console.log(resend.status, resend.data.message)
    assert(resend.status === 200 || resend.status === 500, 'Resend should attempt send')

    // Re-verify for login tests
    const { plainToken: v2, hashedToken: h2 } = generateSecureToken()
    await userModel.findOneAndUpdate(
        { email: testEmail },
        {
            isEmailVerified: false,
            emailVerificationToken: h2,
            emailVerificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000)
        }
    )
    await request('GET', `/verify-email?token=${v2}`)

    console.log('\n7) Login')
    const login = await request('POST', '/login', {
        email: testEmail,
        password: testPassword
    })
    console.log(login.status, login.data.message)
    assert(login.status === 200, 'Login should succeed')
    assert(login.data.data.token, 'JWT should be returned')
    const jwt = login.data.data.token
    assert(login.data.data.accessToken === jwt, 'Access token should be returned')
    assert(login.data.data.refreshToken, 'Refresh token should be returned')

    console.log('\n8) Protected /me')
    const me = await request('GET', '/me', null, jwt)
    console.log(me.status, me.data.message)
    assert(me.status === 200, '/me should succeed')
    assert(me.data.data.email === testEmail, 'Profile email should match')

    console.log('\n8a) Reject missing and expired access tokens')
    const unauthenticated = await request('GET', '/getAll')
    assert(unauthenticated.status === 401, 'Unauthenticated getAll should be rejected')
    const databaseUser = await userModel.findOne({ email: testEmail })
    const expiredAccessToken = jwtLibrary.sign(
        { id: databaseUser._id, tokenUse: 'access' },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: -1 }
    )
    const expiredAccess = await request('GET', '/me', null, expiredAccessToken)
    assert(expiredAccess.status === 401, 'Expired access token should be rejected')

    console.log('\n8b) getAll excludes caller and returns safe user data')
    const otherUser = await new userModel({
        username: 'OtherAuthTester',
        email: otherTestEmail,
        password: testPassword,
        gender: 'female',
        isEmailVerified: true
    }).save()
    const allUsers = await request('GET', '/getAll', null, jwt)
    assert(allUsers.status === 200, 'getAll should succeed with an access token')
    assert(!allUsers.data.data.some((user) => String(user._id) === String(databaseUser._id)),
        'getAll should exclude the authenticated user')
    assert(allUsers.data.data.some((user) => user.email === otherTestEmail), 'getAll should include other users')
    for (const user of allUsers.data.data) {
        for (const secretField of ['password', 'passwordResetToken', 'emailVerificationToken', 'refreshTokenHash']) {
            assert(!(secretField in user), `getAll must not return ${secretField}`)
        }
    }

    console.log('\n8c) Refresh rotates and revokes refresh tokens')
    const refreshed = await request('POST', '/refresh', {
        refreshToken: login.data.data.refreshToken
    })
    assert(refreshed.status === 200, 'Valid refresh token should issue new tokens')
    assert(refreshed.data.data.accessToken, 'Refresh response should contain a new access token')
    assert(refreshed.data.data.refreshToken !== login.data.data.refreshToken, 'Refresh token should rotate')
    assert((await request('GET', '/me', null, refreshed.data.data.accessToken)).status === 200,
        'New access token should authorize requests')
    assert((await request('POST', '/refresh', {
        refreshToken: login.data.data.refreshToken
    })).status === 401, 'Rotated refresh token should be rejected')
    assert((await request('POST', '/refresh', {
        refreshToken: 'a'.repeat(64)
    })).status === 401, 'Unknown refresh token should be rejected')

    const { plainToken: expiredRefreshToken, hashedToken: expiredRefreshHash } = generateSecureToken()
    await userModel.findByIdAndUpdate(otherUser._id, {
        refreshTokenHash: expiredRefreshHash,
        refreshTokenExpiresAt: new Date(Date.now() - 1000)
    })
    assert((await request('POST', '/refresh', {
        refreshToken: expiredRefreshToken
    })).status === 401, 'Expired refresh token should be rejected')

    assert((await request('POST', '/logout', {
        refreshToken: refreshed.data.data.refreshToken
    })).status === 200, 'Logout should revoke the active refresh token')
    assert((await request('POST', '/refresh', {
        refreshToken: refreshed.data.data.refreshToken
    })).status === 401, 'Logged-out refresh token should be rejected')

    console.log('\n9) Forgot password + reset')
    const forgot = await request('POST', '/forgot-password', { email: testEmail })
    console.log(forgot.status, forgot.data.message)
    assert(forgot.status === 200 || forgot.status === 500, 'Forgot password should respond')

    const { plainToken: resetPlain, hashedToken: resetHash } = generateSecureToken()
    await userModel.findOneAndUpdate(
        { email: testEmail },
        {
            passwordResetToken: resetHash,
            passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000)
        }
    )
    const reset = await request('POST', '/reset-password', {
        token: resetPlain,
        password: newPassword,
        confirmPassword: newPassword
    })
    console.log(reset.status, reset.data.message)
    assert(reset.status === 200, 'Password reset should succeed')

    console.log('\n10) Login with new password')
    const login2 = await request('POST', '/login', {
        email: testEmail,
        password: newPassword
    })
    console.log(login2.status, login2.data.message)
    assert(login2.status === 200, 'Login with new password should succeed')

    console.log('\n11) Reject reused reset token')
    const reuseReset = await request('POST', '/reset-password', {
        token: resetPlain,
        password: 'AnotherPass1'
    })
    console.log(reuseReset.status, reuseReset.data.message)
    assert(reuseReset.status === 400, 'Used reset token should be rejected')

    console.log('\nCleanup test user...')
    await userModel.deleteOne({ email: testEmail })
    await userModel.deleteOne({ email: otherTestEmail })
    await mongoose.disconnect()
    console.log('\nAll auth flow tests passed.')
}

run().catch(async (err) => {
    console.error('\nTEST FAILED:', err.message)
    try {
        await userModel.deleteMany({ email: { $in: [testEmail, otherTestEmail] } })
        await mongoose.disconnect()
    } catch (_) {}
    process.exit(1)
})
