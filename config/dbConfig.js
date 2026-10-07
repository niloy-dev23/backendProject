const mongoose = require('mongoose')
const dbURL = process.env.DB_URL 

const dbConfig = async ()=>{
    await mongoose.connect(dbURL).then(()=>{
        console.log('MongoDB Connected')
    })
}

module.exports = dbConfig