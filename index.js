require('dotenv').config()
const express = require('express');
const app = express()
app.use(express.json())
const port = process.env.PORT || 8000
const dns = require('node:dns')
dns.setServers(['8.8.8.8','1.1.1.1'])
const dbConfig = require('./config/dbConfig')
const routes = require('./routes/main')
dbConfig()
app.use(routes)


app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})