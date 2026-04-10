import jwt from "jsonwebtoken";

/**
 * Middleware to authenticate a user based on a JWT token from cookies.
 *
 * This function extracts the JWT token from the request cookies, verifies it,
 * and retrieves the user ID from the token payload. If the token is valid,
 * the user ID is added to the request body for further processing.
 *
 */
const userAuth = async (req, res, next) => {
    // Extract token from cookies
    const { token } = req.cookies;

    // Check if the token is provided
    if (!token) {
        return res.json({ success: false, message: "Not authorized. Login Again" });
    }

    try {
        // Decode and verify the token using the JWT secret
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        // Check if the token payload contains a user ID
        if (tokenDecode.id) {
            // Ensure req.body exists
            if (!req.body) {
                req.body = {};
            }
            // Attach the user ID to the request body
            req.body.userId = tokenDecode.id;
        } else {
            return res.json({
                success: false,
                message: "Not authorized. Login Again",
            });
        }

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // Handle errors during token verification
        return res.json({ success: false, message: error.message });
    }
};
export default userAuth;