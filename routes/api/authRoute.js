const express = require('express')
const router = express.Router()
const registration = require('../../controller/authController')

router.post('/registration', registration)

module.exports = router