const db = require("./db");
const session = require("./neodb");

const groupingKytCOllectionName = "wallet_history_kyt_by_date";

// Helper function to format date to 'YY-MM-DD'
function formatDateToYYMMDD(date) {
  const d = new Date(date);
  const year = String(d.getFullYear()); // Get last two digits of the year (e.g., 22 for 2022)
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Get month and pad to two digits
  const day = String(d.getDate()).padStart(2, "0"); // Get day and pad to two digits

  return `${year}-${month}-${day}`; // Format as 'YY-MM-DD'
}

async function bulkInsertData() {
  try {
    // Fetch data from MongoDB
    const transactionData = await db
      .collection(groupingKytCOllectionName)
      .find()
      .toArray();

    // Prepare data for Cypher query
    const records = transactionData.map((row) => ({
      sender: row.sender.toString(), // Convert ObjectId to string
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      transaction_count :row.transaction_count,
      receiver: row.receiver.toString(), // Convert ObjectId to string
      receiverName: row.receiverName,
      receiverEmail: row.receiverEmail,
      transactionType: row.transaction_type,
      total_amount: row.total_amount,
      coinCode: row.coin_code,
      year: row.year,
      month: row.month,
      transactions: JSON.stringify(row.transactions)
    }));

    // Cypher query to insert data into Neo4j
    const query = `
  UNWIND $records AS row
  MERGE (s:Person {userId: row.sender})
  SET s.name = row.senderName, s.username = row.senderName, s.email = row.senderEmail
  MERGE (r:Person {userId: row.receiver})
  SET r.name = row.receiverName, r.username = row.receiverName, r.email = row.receiverEmail

  FOREACH (_ IN CASE WHEN row.transactionType = 'send' THEN [1] ELSE [] END |
    MERGE (s)-[t:SEND {year: row.year, month: row.month,coin_code:row.coinCode}]->(r)
    SET t.transaction_type = row.transactionType,
        t.total_amount = toFloat(row.total_amount),
        t.coin_code = row.coinCode,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.senderEmail = row.senderEmail,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.receiverEmail = row.receiverEmail,
        t.transactions = row.transactions,
        t.transaction_count = row.transaction_count
  )

  FOREACH (_ IN CASE WHEN row.transactionType = 'receive' THEN [1] ELSE [] END |
    MERGE (s)-[t:RECEIVE {year: row.year, month: row.month,coin_code:row.coinCode}]->(r)
    SET t.transaction_type = row.transactionType,
        t.total_amount = toFloat(row.total_amount),
        t.coin_code = row.coinCode,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.senderEmail = row.senderEmail,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.receiverEmail = row.receiverEmail,
               t.transactions = row.transactions,
        t.transaction_count = row.transaction_count
  )

  FOREACH (_ IN CASE WHEN row.transactionType IS NULL OR NOT row.transactionType IN ['send', 'receive'] THEN [1] ELSE [] END |
    MERGE (s)-[t:OTHER {year: row.year, month: row.month,coin_code:row.coinCode}]->(r)
    SET t.transaction_type = row.transactionType,
        t.total_amount = toFloat(row.total_amount),
        t.coin_code = row.coinCode,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.senderEmail = row.senderEmail,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.receiverEmail = row.receiverEmail,
               t.transactions = row.transactions,
        t.transaction_count = row.transaction_count
  )
`;

    // Run the query in Neo4j
    const result = await session.run(query, { records });

    // Handle result
    console.log(`Successfully inserted ${result.records.length} records.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during bulk insert:", error);
  } finally {
    // Close session and connection
    await session.close();
  }
}

// Call the function to bulk insert data into Neo4j
bulkInsertData();
