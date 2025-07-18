const User = require('../models/user.model');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register a new user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists. Please log in." });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email: user.email },
      process.env.TOKEN_KEY,
      { expiresIn: "2h" }
    );

    user.token = token;
    await user.save();

    return res.status(201).json(user);
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// Login an existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { user_id: user._id, email: user.email },
      process.env.TOKEN_KEY,
      { expiresIn: "2h" }
    );

    user.token = token;
    await user.save();

    return res.status(200).json(user);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// Update user data
const update = async (req, res) => {
  try {
    const { userID, firstName, lastName, email, phoneNumber, birthDate } = req.body;

    const updateData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      birthDate,
    };

    const updatedUser = await User.findByIdAndUpdate(userID, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User updated successfully!", user: updatedUser });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// Delete a user
const destroy = async (req, res) => {
  try {
    const { userID } = req.body;

    const deletedUser = await User.findByIdAndRemove(userID);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

module.exports = {
  register,
  login,
  update,
  destroy,
};
