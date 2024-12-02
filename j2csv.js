const db = require("./db");
const path = require("path");
const { Parser } = require("json2csv");

const collectionName =  "wallet_history_kyt_group";

async function fetchAndWriteToCSV() {
  try {
    const collection = db.collection(collectionName);
    // Execute aggregation pipeline
    const data = await collection.find().toArray();

    if (data.length === 0) {
      console.log("No data found in the collection");
      return;
    }


    // Convert the flattened data to CSV format using json2csv
    const parser = new Parser();
    const csv = parser.parse(data);

    // Write the CSV to a file
    const filePath = path.join(__dirname, "./kyt.csv");
    const filePath2 = '/home/dhanraj/.config/Neo4j Desktop/Application/relate-data/dbmss/dbms-ffc36e84-f398-4f84-a6b3-8251119ff6cd/import/kyt.csv';
    const fs = require("fs");
    fs.writeFileSync(filePath, csv); // Write the CSV string to the file
    fs.writeFileSync(filePath2, csv); // Write the CSV string to the file

    console.log("Data written to CSV file successfully");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    console.log("Connection closed");
    process.exit(0);
  }
}

// Run the function
fetchAndWriteToCSV();
