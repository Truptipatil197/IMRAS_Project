const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { isAdmin, isManager, isStaff } = require("../middleware/roleMiddleware");

// Admin only
router.get("/admin-only", verifyToken, isAdmin, (req, res) => {
    res.json({
        success: true,
        message: "Welcome Admin!",
        user: req.user
    });
});

// Manager + Admin
router.get("/manager-access", verifyToken, isManager, (req, res) => {
    res.json({
        success: true,
        message: "Welcome Manager/Admin!",
        user: req.user
    });
});

// Staff + Manager + Admin
router.get("/staff-access", verifyToken, isStaff, (req, res) => {
    res.json({
        success: true,
        message: "Welcome Staff/Manager/Admin!",
        user: req.user
    });
});

module.exports = router;
