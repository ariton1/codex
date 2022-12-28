const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bip39 = require("bip39");
const { check, validationResult } = require("express-validator");
require("dotenv").config();
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// Import the database models
const db = require("../models");
const Role = db.Role;
const User = db.User;

router.get("/register", (req, res) => {
	const token = req.cookies.token;
	if (token) {
		// If the user is authenticated, redirect them to the home page
		return res.redirect("/");
	}
	res.render("register", { flash: req.flash() });
});

router.post(
	"/register",
	[
		// Validate the request body
		check(
			"username",
			"Username must be alphanumeric and have at least 5 characters"
		)
			.isAlphanumeric()
			.isLength({ min: 5, max: 32 }),
		check(
			"password",
			"Password must have at least 8 characters and contain at least 1 uppercase character, 1 lowercase character, 1 number, and 1 symbol"
		)
			.isLength({ min: 8, max: 32 })
			.matches(
				/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$/,
				"i"
			),
		check("confirmPassword", "Passwords do not match").custom(
			(value, { req }) => value === req.body.password
		),
		check("phrase", "Phrase must have at least 5 characters").isLength({
			min: 5,
			max: 32,
		}),
	],
	async (req, res) => {
		// Check for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// Set flash messages and redirect the user back to the register page
			req.flash(
				"error",
				errors.array().map((error) => error.msg)
			);
			return res.redirect("/users/register");
		}

		// Hash the password
		const hashedPassword = bcrypt.hashSync(req.body.password, 10);

		// Check if the 'buyer' role exists
		let role = await Role.findOne({ where: { name: "buyer" } });
		if (!role) {
			// If the 'buyer' role does not exist, create it
			role = await Role.create({ name: "buyer" });
		}

		// Generate a mnemonic
		const mnemonic = bip39.generateMnemonic();

		// Create a new user in the database
		User.create({
			username: req.body.username.toLowerCase(),
			password: hashedPassword,
			phrase: req.body.phrase,
			mnemonic: mnemonic,
			roleId: role.id,
			mnemonic_shown: false,
		})
			.then((user) => {
				// Generate a JWT and send it back to the client
				const token = jwt.sign(
					{ id: user.id },
					process.env.JWT_SECRET,
					{ expiresIn: 86400 }
				); // expires in 24 hours

				// Set the token in a cookie with an expiration date
				res.cookie("token", token, {
					expires: new Date(Date.now() + 86400), // Expires in 24 hours
					httpOnly: true, // Only accessible by the server
				});

				res.redirect("/users/mnemonic");
			})
			.catch((error) => {
				// Check if the error is due to the username already existing
				if (error.name === "SequelizeUniqueConstraintError") {
					req.flash("error", "Username already exists");
					return res.redirect("/users/register");
				}
				res.status(500).send({ error: error });
			});
	}
);

router.get("/mnemonic", async (req, res) => {
	// Check if the user is authenticated
	if (!req.cookies.token) {
		// If the user is not authenticated, redirect them to the login page
		return res.redirect("/users/login");
	}

	// Get the token from the cookie
	const token = req.cookies.token;

	const decoded = jwt.verify(token, process.env.JWT_SECRET);
	const user = await User.findOne({ where: { id: decoded.id } });

	if (user.mnemonic_shown) {
		return res.redirect("/");
	}

	user.mnemonic_shown = true;
	await user.save();

	res.render("mnemonic", { mnemonic: user.mnemonic });
});

router.get("/set-2fa", async (req, res) => {
	// Check if the user is authenticated
	if (!req.cookies.token) {
		// If the user is not authenticated, redirect them to the login page
		return res.redirect("/users/login");
	}

	// Get the token from the cookie
	const token = req.cookies.token;

	const decoded = jwt.verify(token, process.env.JWT_SECRET);
	const user = await User.findOne({ where: { id: decoded.id } });

	if (!user.mnemonic_shown) {
		return res.redirect("/users/mnemonic");
	}

	// Check if 2FA is already enabled for the user
	if (user.twofactorenabled) {
		// If 2FA is already enabled, redirect the user to the home page
		return res.redirect("/");
	}

	// Generate a secret and QR code for the user
	const secret = speakeasy.generateSecret({
		length: 20,
		encoding: "base32",
	});

	QRCode.toDataURL(secret.otpauth_url, (err, src) => {
		if (err) {
			res.send("Something went wrong. Please refresh the page");
		}
		// Render the 2FA setup page
		res.render("set-2fa", {
			qrCodeUrl: src,
			secret: secret.base32,
			error: req.flash("error"),
		});
	});
});

router.post("/set-2fa", async (req, res) => {
	if (!req.cookies.token) {
		return res.redirect("/users/login");
	}

	// Get the token from the cookie
	const token = req.cookies.token;

	const decoded = jwt.verify(token, process.env.JWT_SECRET);
	const user = await User.findOne({ where: { id: decoded.id } });

	const verified = speakeasy.totp.verify({
		secret: req.body.secret,
		encoding: "base32",
		token: req.body.code, // 2FA code entered by user
	});

	if (verified) {
		user.twoFactorEnabled = true;
		user.twoFactorAuthSecret = req.body.secret;
		user.save();
		res.redirect("/");
	} else {
		req.flash("error", "Invalid 2FA code");
		res.redirect("/users/set-2fa");
	}
});

module.exports = router;
