const userModel = require('../models/userModel')

const getAllUser = async (req, res) => {
    try {
        const users = await userModel
            .find({ _id: { $ne: req.user._id } })
            .select('username email profilePic address gender isEmailVerified createdAt updatedAt')
            .lean()

        return res.status(200).json({
            success: true,
            message: 'All users fetched successfully',
            data: users
        })
    } catch (error) {
        console.error('Failed to fetch users:', error.message)
        return res.status(500).json({
            success: false,
            message: 'Error fetching users'
        })
    }
}

module.exports = getAllUser