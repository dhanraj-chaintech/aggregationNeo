const mongodb = require("mongodb");

const client = new mongodb.MongoClient("mongodb://127.0.0.1:27017");

async () => {
  await client.connect();
  console.log("Connected successfully to server");
};
const db = client.db("cardex");

module.exports = db;
