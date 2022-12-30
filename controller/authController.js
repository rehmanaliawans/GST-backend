const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/email");
const authErrors = require("../utils/errors");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const sendVerificationEmail = async (user) => {
  let verifyToken = user.resetToken;
  const resetURL = `${process.env.HOST}/verify-email?token=${verifyToken}`;

  const message = `<h3>Thank you for creating account on AX3. Please verify your email to continue.</h2> 
   <p><a href=${resetURL}>Click here to verify the email</a> <p>
    <p>The verification link  will expire in 10 minutes</p>
    <p>If its not you?, please ignore this email</p>
    `;

  await sendEmail({
    email: user.email,
    subject: "Verifying your email (Token will expire in 10 minutes)",
    message,
    emailFrom: process.env.EMAIL_FROM
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  console.log("signUp", req.body);
  const userPresent = await User.findOne({ email: req.body.email });
  if (userPresent) {
    return next(new AppError(authErrors.userAlreadyExists, 401));
  }
  console.log("cal user after", req.body);

  const user = await User.create({
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    password: req.body.password,
    phoneNo: req.body.phoneNo
  });
  console.log("created user", user);
  if (user) {
    res.status(200).json({
      status: "success",
      token: generateToken(user._id),
      user
    });
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email) {
    return next(new AppError(authErrors.provideEmail, 404));
  }
  if (!password) {
    return next(new AppError(authErrors.providePassword, 404));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new AppError(authErrors.invalidUser, 401));
  }

  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save({ validateBeforeSave: false });
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(authErrors.invalidUser, 401));
  }
  user.password = undefined;

  res.status(200).json({
    status: "success",
    token: generateToken(user._id),
    user
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(authErrors.userNotFound, 404));
  }
  const resetToken = user.createPasswordResetToken(req.body.email);
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.HOST}/reset-password?token=${resetToken}`;
  const message = `<h3>Forgot your Password?</h3> 
  <a href=${resetURL}>Click on this link to reset your password</a> 
  <p>If you do not forget your password, please ignore this email</p>`;

  try {
    await sendEmail({
      email: user.email,
      subject: "AX3 - Reset Your Password",
      message,
      emailFrom: process.env.EMAIL_FROM
    });
    res.status(200).json({
      status: "success",
      message: "Check your email for reset password link"
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. try again later", 500)
    );
  }
});

exports.verifyToken = catchAsync(async (req, res, next) => {
  const token = req.body.token;
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    return next(new AppError("User does not exist", 400));
  }
  res.status(200).json({
    status: "success",
    message: "Token is valid"
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }
  user.password = req.body.password;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();
  res.status(200).json({
    status: 200,
    token: generateToken(user._id)
  });
});

exports.resendEmailVerficationTokenById = catchAsync(async (req, res, next) => {
  const data = await User.findById(req.params.id);
  const user = await User.recreateEmailVerification(data.email);
  sendVerificationEmail(user);
  res.status(200).json("sucess");
});

exports.resendEmailVerficationTokenByEmail = catchAsync(
  async (req, res, next) => {
    const user = await User.recreateEmailVerification(req.params.email);
    sendVerificationEmail(user);
    res.status(200).json("sucess");
  }
);

exports.checkEmailVerification = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  console.log("hashedToken", hashedToken);
  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyTokenExpires: { $gt: Date.now() }
  });
  if (user) {
    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyTokenExpires = undefined;
    const userData = await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    res.status(200).json({
      status: 200,
      token: generateToken(user._id),
      message: "Email verified successfully"
    });
  } else {
    return next(new AppError("Token is invalid or expired", 400));
  }
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError(authErrors.currentPasswordWrong, 400));
  }

  if (req.body.currentPassword === req.body.newPassword) {
    return next(new AppError(authErrors.passwordSameAsPrevious, 400));
  }

  user.password = req.body.newPassword;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  const token = generateToken(user._id);
  user.token = token;

  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    message: "Succesfully change password",
    token: token
  });
});

exports.getUserInfo = catchAsync(async (req, res, next) => {
  const data = await User.findById(req.user._id);

  res.status(200).json(data);
});

exports.editUserInfo = catchAsync(async (req, res, next) => {
  const { firstName, lastName, phoneNo } = req.body;
  const user = await User.findById(req.user._id);
  user.firstName = firstName;
  user.lastName = lastName;
  user.phoneNo = phoneNo;
  const data = await user.save({
    validateBeforeSave: false
  });
  res.status(200).json(data);
});
