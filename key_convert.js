const fs = require("fs");
const key = fs.readFileSync("./firebase-admins-service-key.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
