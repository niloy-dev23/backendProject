const userModel = require('../models/userModel')

const getAllUser = async (req, res) => {
    const users = await userModel.find()
    try{
        res.status(200).json({
            success:true,
            message:"All Users fetched successfully",
            data:users
        })
    }
    catch(err){
        res.status(500).json({
            success:false,
            message:"Error fetching Users"
        })
    }
    
}

module.exports = getAllUser