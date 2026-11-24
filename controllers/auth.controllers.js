import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken, hashRefreshToken } from "../utils/token.js";
import Session from "../models/session.model.js";

export const registerUser = async (req, res) => {
  try {
    const { name, phoneNumber, department, role, username, password } =
      req.body;

    const finalUsername = (username || phoneNumber || "").trim();

    const userExists = await User.findOne({ username: finalUsername });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const hashPwd = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      name,
      phoneNumber,
      department,
      role,
      username: finalUsername,
      password: hashPwd,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.log("Error creating user: ", error);
    return res.status(500).json({
      success: false,
      message: `Error creating user: ${error}`,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const userExists = await User.findOne({ username });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, userExists.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

const accessToken = generateAccessToken(userExists);

const refreshToken = generateRefreshToken();

const tokenHash = hashRefreshToken(refreshToken);

await Session.create({
  userId: userExists._id,
  tokenHash,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

return res.status(200).json({
  success: true,
  message: "Login successful",

  accessToken,
  refreshToken,

  user: {
    id: userExists._id,
    name: userExists.name,
    username: userExists.username,
    role: userExists.role,
    department: userExists.department,
  },
});  } catch (error) {
    console.log("Error login: ", error);
    return res.status(500).json({
      success: false,
      message: `Error login: ${error}`,
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data fetched",
      data: users,
    });
  } catch (error) {
    console.log("Error finding users: ", error);
    return res.status(500).json({
      success: false,
      message: `Error finding users: ${error}`,
    });
  }
};


export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const oldHash = hashRefreshToken(refreshToken);

    const now = new Date();

    // Atomically claim and revoke the old session.
    const session = await Session.findOneAndUpdate(
      {
        tokenHash: oldHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: { revokedAt: now },
      },
      { new: false }
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid, expired or revoked refresh token",
      });
    }

    const user = await User.findById(session.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
      });
    }

    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    await Session.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    });

    await Session.updateOne(
      { _id: session._id },
      { $set: { replacedByTokenHash: newHash } }
    );

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error("Refresh Token Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh token",
    });
  }
};


export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const filter = {
      tokenHash,
      revokedAt: null,
      ...(req.user?.userId ? { userId: req.user.userId } : {}),
    };

    const session = await Session.findOneAndUpdate(
      filter,
      {
        $set: { revokedAt: new Date() },
      }
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session not found or already revoked",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, department, role, username, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (username && username.trim() && username.trim() !== user.username) {
      const existingUser = await User.findOne({ username: username.trim(), _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken by another employee",
        });
      }
      user.username = username.trim();
    }

    if (name && name.trim()) user.name = name.trim();
    if (phoneNumber && phoneNumber.trim()) user.phoneNumber = phoneNumber.trim();
    if (department !== undefined) user.department = department;
    if (role && ["owner", "staff"].includes(role)) user.role = role;

    if (password && password.trim().length >= 6) {
      user.password = await bcrypt.hash(password.trim(), 12);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        phoneNumber: user.phoneNumber,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: `Error updating employee: ${error.message || error}`,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.userId === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await Session.deleteMany({ userId: id });

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: `Error deleting employee: ${error.message || error}`,
    });
  }
};


