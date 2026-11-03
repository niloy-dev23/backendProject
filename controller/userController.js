const userModel = require('../models/userModel')

const getAllUser = async (req, res) => {

    const search = req.query.search ? req.query.search.trim() : ""
    const role = req.query.role ? req.query.role.trim() : ""


    const filter = {
        _id: { $ne: req.user._id}
    }

    if(search){
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter.$or = [
            { username: { $regex: searchRegex, $options: 'i' } }
        ]
    }
    if(role){
        const roleRegex = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter.$or = [
            { role: { $regex: roleRegex, $options: 'i' } }
        ]
    }
    const users = await userModel.find(filter)

    // try {
    //     const users = await userModel
    //         .find({ _id: { $ne: req.user._id }, username: { $regex: search, $options: 'i' } })
    //         .select('username email profilePic address gender isEmailVerified createdAt updatedAt')
    //         .lean()

        return res.status(200).json({
            success: true,
            message: 'Users searched successfully',
            data: users
        })
    // } catch (error) {
    //     console.error('Failed to fetch users:', error.message)
    //     return res.status(500).json({
    //         success: false,
    //         message: 'Error fetching users'
    //     })
    // }
}

const getSingle =async (req, res)=>{
    const userId = req.params.id
    try{
        const singleUser = await userModel.findOne({_id: userId})
        if(!user){
            return res.status(400).json({
                success:false,
                message:"No User Found"
            })
        }
        res.status(200).json({
            success:true,
            message:"User Fetched Successfully",
            data:singleUser
        })
    }
    catch(error){
        return res.status(500).json({
            success:false, 
            message:error
        })
    }
}

const approveUser = async (req, res) => {
    const userId = req.params.id
    try{
        const user = await userModel.findByIdAndUpdate({_id:userId}, {status:true},
            {
                new:true, 
                runValidators:true
            }
        )
        res.status(200).json({
            success:true,
            message:"User Updated Successfully"
        })
    }
    catch(err){
        return res.status(500).json({
            success:false,
            message:err
        })
    }

}

const disapproveUser = async (req, res) => {
    const userId = req.params.id
    try{
        const user = await userModel.findByIdAndUpdate({_id:userId}, {status:false},
            {
                new:true, 
                runValidators:true
            }
        )
        res.status(200).json({
            success:true,
            message:"User Updated Successfully"
        })
    }
    catch(err){
        return res.status(500).json({
            success:false,
            message:err
        })
    }

}

const deleteUser = async (req, res) => {
    const userId = req.params.id
    try{
        const user = await userModel.findByIdAndDelete({_id:userId})
        res.status(200).json({
            success:true,
            message:"User Deleted Successfully"
        })
    }
    catch(err){
        return res.status(500).json({
            success:false,
            message:err
        })
    }

}

const updateUser = async (req, res) => {
    const userId = req.params.id
    const user = await userModel.findByIdAndUpdate({_id:userId}, {$set: req.body}, {
        new:true, 
        runValidators:true
    })
    res.status(200).json({
        success:true,
        message:"User Updated Successfully"
    })
}

module.exports = {getAllUser, getSingle, approveUser, deleteUser, disapproveUser, updateUser}