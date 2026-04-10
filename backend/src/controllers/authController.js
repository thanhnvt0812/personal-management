import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";
import {
    EMAIL_VERIFY_TEMPLATE,
    PASSWORD_RESET_TEMPLATE,
} from "../config/emailTemplates.js";
import {
    findUserByEmail,
    findUserById,
    createUser,
    updateUser,
} from "../repositories/userRepository.js";

/**
 * Register a new user.
 *
 * This function:
 * - Validates required fields
 * - Checks if email already exists
 * - Hashes password
 * - Creates a new user in Supabase
 * - Generates JWT token
 * - Stores token in cookie
 * - Sends welcome email
 */
export const register = async (req, res) => {
    const { full_name, email, password } = req.body;
    // Validate input
    if (!full_name || !email || !password) {
        return res.json({ success: false, message: "Please fill all the fields" });
    }
    try {
        // Check if user already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.json({ success: false, message: "Email already exists" });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create user in database
        const user = await createUser({
            full_name,
            email,
            password: hashedPassword,
        });
        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Send welcome email
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Welcome",
            text: `Hello ${full_name}, your account has been created successfully.`,
        });
        return res.json({ success: true, message: "Register successful" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Login a user.
 *
 * This function:
 * - Validates input
 * - Checks if user exists
 * - Compares password
 * - Generates JWT token
 * - Stores token in cookie
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
        return res.json({ success: false, message: "Please fill all the fields" });
    }
    try {
        // Find user by email
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Incorrect password" });
        }
        // Generate token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.json({ success: true, message: "Login successful" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Logout user.
 *
 * This function clears the authentication cookie.
 */
export const logout = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        });
        res.json({ success: true, message: "Logout successful" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Send verification OTP to user's email.
 *
 * This function:
 * - Checks if user is already verified
 * - Generates OTP
 * - Saves OTP + expiration in DB
 * - Sends OTP via email
 */
export const sendVerifyOtp = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await findUserById(userId);
        if (user.is_account_verified) {
            return res.json({ success: false, message: "Account Already Verified" });
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        // Update OTP in DB
        await updateUser(userId, {
            verify_otp: otp,
            verify_otp_expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        // Send email
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Account Verification OTP",
            html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace(
                "{{email}}",
                user.email
            ),
        });
        res.json({ success: true, message: "Verification OTP sent" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

/**
 * Verify user's email using OTP.
 *
 * This function:
 * - Validates input
 * - Checks OTP correctness
 * - Checks expiration
 * - Marks user as verified
 */
export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
        return res.json({ success: false, message: "Missing Details!!!" });
    }
    try {
        const user = await findUserById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not Found!!!" });
        }
        if (!user.verify_otp || user.verify_otp !== otp) {
            return res.json({ success: false, message: "Invalid OTP!!!" });
        }
        const expireDate = typeof user.verify_otp_expire_at === 'string' && !user.verify_otp_expire_at.endsWith('Z') 
            ? new Date(user.verify_otp_expire_at.replace(' ', 'T') + 'Z')
            : new Date(user.verify_otp_expire_at);
        
        if (expireDate.getTime() < Date.now()) {
            return res.json({ success: false, message: "OTP Expired" });
        }
        // Update user verification status
        await updateUser(userId, {
            is_account_verified: true,
            verify_otp: "",
            verify_otp_expire_at: null,
        });
        return res.json({
            success: true,
            message: "Email Verified Successfully",
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Check if user is authenticated.
 *
 * This function assumes authentication middleware already validated the user.
 */
export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Send password reset OTP.
 *
 * This function:
 * - Finds user by email
 * - Generates OTP
 * - Stores OTP + expiration
 * - Sends email
 */
export const sendResetOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.json({ success: false, message: "Email is Required!!!" });
    }
    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({ success: false, message: "User not Found!!!" });
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        await updateUser(user.id, {
            reset_otp: otp,
            reset_otp_expire_at: new Date(Date.now() + 15 * 60 * 1000),
        });
        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Password Reset OTP",
            html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace(
                "{{email}}",
                user.email
            ),
        });
        return res.json({ success: true, message: "Reset OTP sent" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

/**
 * Reset user password using OTP.
 *
 * This function:
 * - Validates input
 * - Checks OTP correctness
 * - Checks expiration
 * - Hashes new password
 * - Updates user password
 */
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.json({
            success: false,
            message: "Missing Information! Email, OTP and New Password are required",
        });
    }
    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.json({ success: false, message: "User not Found!!!" });
        }
        if (!user.reset_otp || user.reset_otp !== otp) {
            return res.json({ success: false, message: "Invalid OTP!!!" });
        }
        const expireDate = typeof user.reset_otp_expire_at === 'string' && !user.reset_otp_expire_at.endsWith('Z') 
            ? new Date(user.reset_otp_expire_at.replace(' ', 'T') + 'Z')
            : new Date(user.reset_otp_expire_at);

        if (expireDate.getTime() < Date.now()) {
            return res.json({ success: false, message: "OTP Expired" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUser(user.id, {
            password: hashedPassword,
            reset_otp: "",
            reset_otp_expire_at: null,
        });
        return res.json({
            success: true,
            message: "Password Changed Successfully",
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
