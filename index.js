const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.jea08bc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// import from the firebase for verify the keys
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Set verify fireBaseToken
const verifyFireBaseToken = async (req, res, next) => {
  // console.log("Token in the middlewire", req.headers);
  const authHeader = req.headers?.authorization;
  // console.log(authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).send({ message: "unauthorized access" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // console.log("Decoded token", decoded);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  // console.log(token);
};

const verifyEmailToken = async (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //Added resturant json data
    const foodCollections = client.db("restaurantBD").collection("foodItems");
    const authFoodCollections = client
      .db("restaurantBD")
      .collection("authFood");
    const myOrderCollection = client.db("restaurantBD").collection("myOrders");
    //get all food Data
    app.get("/all-foods", async (req, res) => {
      try {
        const result = await foodCollections.find().toArray();
        res.send(result);
      } catch (error) {
        // console.error("Error finding food:", error);
        res.status(500).send({ error });
      }
    });

    // Add foods data
    app.post("/add-foods", async (req, res) => {
      try {
        const foodsData = req.body;
        const result = await authFoodCollections.insertOne(foodsData);
        res
          .status(201)
          .send({ ...result, message: "Data inserted successfully" });
      } catch (error) {
        // console.error("Error inserting food:", error);
        res.status(500).send({ error: "Failed to insert food data" });
      }
    });

    // get my foods
    app.get(
      "/add-foods",
      verifyFireBaseToken,
      verifyEmailToken,
      async (req, res) => {
        const email = req.query.email;
        const query = { auth_email: email };
        try {
          const result = await authFoodCollections.find(query).toArray();

          res.status(200).send(result);
        } catch (error) {
          res.status(500).send({ message: "Error fetching foods", error });
        }
      }
    );

    // Update Food data
    app.get("/add-foods/:id", async (req, res) => {
      const id = req.params.id;
      const food = await authFoodCollections.findOne({
        _id: new ObjectId(id),
      });
      // console.log(food);
      res.send(food);
    });

    app.put("/add-food/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateFoods = req.body;
      const updateDoc = {
        $set: updateFoods,
      };
      const result = await authFoodCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // My orders post the data
    app.post("/my-orders", async (req, res) => {
      try {
        const orderData = req.body;
        const result = await myOrderCollection.insertOne(orderData);
        res
          .status(201)
          .send({ ...result, message: "Data Insert Successfully" });
      } catch (error) {
        // console.error("Error inserting food:", error);
        res.status(500).send({ error: "Failed to insert food data" });
      }
    });

    // my orders get the data
    app.get(
      "/my-orders",
      verifyFireBaseToken,
      verifyEmailToken,
      async (req, res) => {
        const email = req.query.email;
        const query = { email };
        try {
          const result = await myOrderCollection.find(query).toArray();
          console.log(result);
          res.status(200).send(result);
        } catch (error) {
          res.status(500).send({ message: "Error fetching foods", error });
        }
      }
    );

    // My order deleting method
    app.delete("/my-orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myOrderCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Data Run Successfully");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
