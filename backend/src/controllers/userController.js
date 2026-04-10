import { findUserById } from "../repositories/userRepository.js";

export const getUserData = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await findUserById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not Found!!!" });
        }
        res.json({
            success: true,
            userData: {
                name: user.full_name,
                email: user.email,
                isAccountVerified: user.is_account_verified,
            },
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
