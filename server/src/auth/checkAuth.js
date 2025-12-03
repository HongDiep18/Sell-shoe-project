const { AuthFailureError, BadRequestError } = require('../core/error.response');
const { verifyToken } = require('../utils/jwt');
const modelUser = require('../models/users.model');

const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const authUser = async (req, res, next) => {
    try {
        // Support token from cookie (web) or Authorization header (mobile)
        let token = null;
        if (req.cookies && req.cookies.token) token = req.cookies.token;
        else if (req.headers && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
        }

        if (!token) throw new AuthFailureError('Vui lòng đăng nhập');
        const decoded = await verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const authAdmin = async (req, res, next) => {
    try {
        // Support token from cookie (web) or Authorization header (mobile)
        let token = null;
        if (req.cookies && req.cookies.token) token = req.cookies.token;
        else if (req.headers && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
        }

        if (!token) throw new AuthFailureError('Bạn không có quyền truy cập');
        const decoded = await verifyToken(token);
        const { id } = decoded;
        const findUser = await modelUser.findOne({ _id: id });
        if (!findUser || findUser.isAdmin === false) {
            throw new AuthFailureError('Bạn không có quyền truy cập');
        }
        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

// Optional auth - không throw error nếu không có token
// const optionalAuth = async (req, res, next) => {
//     try {

//         console.log('\n🔐 === OPTIONAL AUTH MIDDLEWARE ===');
//         console.log('📋 Cookies:', Object.keys(req.cookies || {}));
//         console.log('🎫 Has token cookie?', !!req.cookies?.token);
//         // Support cookie or Authorization header
//         let token = null;
//         if (req.cookies && req.cookies.token) token = req.cookies.token;
//         const authHeader = req.headers && req.headers.authorization;
//         if (!token && authHeader && authHeader.startsWith('Bearer ')) {
//             token = authHeader.split(' ')[1];
//         }

//         if (token) {
//             try {
//                 const decoded = await verifyToken(token);
//                 req.user = decoded;
//             } catch (err) {
//                 req.user = null;
//             }
//         } else {
//             req.user = null;
//         }
//         next();
//     } catch (error) {
//         req.user = null;
//         next();
//     }
// };
const optionalAuth = async (req, res, next) => {
    try {
        console.log('\n🔐 === OPTIONAL AUTH MIDDLEWARE ===');
        console.log('📋 Cookies:', Object.keys(req.cookies || {}));
        console.log('🎫 Has token cookie?', !!req.cookies?.token);

        const user = req.cookies.token;
        if (user) {
            const token = user;
            console.log('🔑 Token found, verifying...');
            const decoded = await verifyToken(token);
            console.log('✅ Token verified:', { id: decoded.id, email: decoded.email });
            req.user = decoded;
        } else {
            console.log('❌ No token found - guest user');
            req.user = null; // No user authenticated
        }
        console.log('🔐 === END OPTIONAL AUTH ===\n');
        next();
    } catch (error) {
        // If token is invalid, just set user to null and continue
        console.log('⚠️  Token verification failed:', error.message);
        req.user = null;
        next();
    }
};

module.exports = {
    asyncHandler,
    authUser,
    authAdmin,
    optionalAuth,
};
