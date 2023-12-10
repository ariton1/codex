const express = require("express");
const app = express();
const port = 5000;
require("dotenv").config();

const bodyParser = require("body-parser");
const flash = require("connect-flash");
const cookieSession = require("cookie-session");
const cookieParser = require("cookie-parser");
const sequelize = require("./config/connection");

// Import routes
const usersRouter = require("./routes/usersRouter");
const adminRouter = require("./routes/adminRouter");
const buyerRouter = require("./routes/buyerRouter");
const pgpRouter = require("./routes/pgpRouter");
const bannedRouter = require("./routes/bannedRouter");

// Import middlewares
const isLoggedIn = require("./middleware/isLoggedIn");
const require2FA = require("./middleware/require2FA");
const isBanned = require("./middleware/isBanned");

// Import the database models
const db = require("./models");
const User = db.User;
const Role = db.Role;

const getUserIdFromToken = require("./utils/getUserIdFromToken");

app.use(flash());
app.use(cookieParser());

// Enable cookies
app.use(
  cookieSession({
    name: "sessId",
    secret: process.env.COOKIE_SECRET,
    maxAge: 864000, // expiration time in milliseconds (1 day)
  })
);

// Use body-parser to parse request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/users", usersRouter);
app.use("/admin", adminRouter);
app.use("/buyer", buyerRouter);
app.use("/pgp", pgpRouter);
app.use("/banned", bannedRouter);

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "public/views");

require("./unbanUsers"); // run the cron job periodically

app.get("/", isLoggedIn, require2FA, isBanned, async (req, res) => {
  const userId = getUserIdFromToken(req);

  const user = await User.findOne({ where: { id: userId } });
  const role = await Role.findOne({ where: { id: user.roleId } });

  res.render("index", { role: role });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
