const express = require('express')
const router = express.Router()
const apiURL = process.env.API_URL || '/api/v1'
const authRoute = require('./api/authRoute')

router.use(apiURL, authRoute)

module.exports = router