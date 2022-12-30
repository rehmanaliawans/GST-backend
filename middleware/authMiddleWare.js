const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../model/userModel");
const authErrors = require("../utils/errors");

const { promisify } = require("util");

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError(authErrors.notLoggedIn, 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError(authErrors.tokenUserDoesNotExist, 401));
  }
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(new AppError(authErrors.userChangedPassword, 401));
  }
  req.user = currentUser;
  next();
});
