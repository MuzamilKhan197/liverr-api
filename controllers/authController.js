import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

export const register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      country,
      phone,
      desc,
      img,
      isSeller,
    } = req.body || {};
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 40 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128 ||
      typeof country !== "string" ||
      !country.trim() ||
      country.length > 80
    ) {
      return next(
        createError(400, "Provide a valid username, email, password, and country."),
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      country: country.trim(),
      phone: typeof phone === "string" ? phone.trim().slice(0, 40) : "",
      desc: typeof desc === "string" ? desc.trim().slice(0, 1000) : "",
      img: typeof img === "string" ? img.trim() : "",
      isSeller: isSeller === true,
    });

    await newUser.save();
    res.status(201).send("User has been created.");
  } catch (err) {
    if (err.code === 11000) {
      return next(createError(409, "Username or email is already in use."));
    }
    return next(err);
  }
};
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      password.length > 128
    ) {
      return next(createError(400, "Username and password are required."));
    }

    const user = await User.findOne({
      username: username.trim(),
    }).select("+password");

    const isCorrect = user && (await bcrypt.compare(password, user.password));
    if (!isCorrect) {
      return next(createError(401, "Wrong username or password."));
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        isSeller: user.isSeller,
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" },
    );

    const info = user.toObject();
    delete info.password;
    return res
      .cookie("accessToken", token, {
        ...cookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .send(info);
  } catch (err) {
    return next(err);
  }
};

export const logout = (req, res) => {
  return res
    .clearCookie("accessToken", cookieOptions())
    .status(200)
    .send("User has been logged out.");
};