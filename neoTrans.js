const { groupTransactionFrequency, groupTransactionFrequencyYear } = require("./dataPipeline");
const db = require("./db");
const session = require("./neodb");

const groupingKytCOllectionName = "wallet_history_kyt_by_date";

async function bulkInsertData(transactionData, filter = 'monthly') {
  try {
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
        transactions: JSON.stringify(row.transactions),
        month: filter === "monthly" ? row.month : null, // Ensure month is null only for non-monthly records
        filter:filter,
      }));
      

    const relationshipType = {
      send: filter === "monthly" ? "SEND" : "SEND_YEARLY",
      receive: filter === "monthly" ? "RECEIVE" : "RECEIVE_YEARLY",
      other: filter === "monthly" ? "OTHER" : "OTHER_YEARLY",
    };

    const keysProps = ["year", "coinCode","filter"];
    if (filter === "monthly") keysProps.push("month");

    const props = keysProps
      .filter((key) => key !== "month" || filter === "monthly") // Exclude 'month' if filter is 'yearly'
      .map((key) => `${key}: row.${key}`)
      .join(",");

    // Cypher query to insert data into Neo4j
    const query = `
      UNWIND $records AS row
      MERGE (s:Person {userId: row.sender})
      SET s.name = row.senderName, s.username = row.senderName, s.email = row.senderEmail
      MERGE (r:Person {userId: row.receiver})
      SET r.name = row.receiverName, r.username = row.receiverName, r.email = row.receiverEmail

      FOREACH (_ IN CASE WHEN row.transactionType = 'send' THEN [1] ELSE [] END |
        MERGE (s)-[t:${relationshipType.send} {${props}}]->(r)
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
            t.transaction_count = row.transaction_count,
                        t.filter = row.filter

      )

      FOREACH (_ IN CASE WHEN row.transactionType = 'receive' THEN [1] ELSE [] END |
        MERGE (s)-[t:${relationshipType.receive} {${props}}]->(r)
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
            t.transaction_count = row.transaction_count,
            t.filter = row.filter
      )

      FOREACH (_ IN CASE WHEN row.transactionType IS NULL OR NOT row.transactionType IN ['send', 'receive'] THEN [1] ELSE [] END |
        MERGE (s)-[t:${relationshipType.other} {${props}}]->(r)
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
            t.transaction_count = row.transaction_count,
                      t.filter = row.filter

      )
    `;

    // Run the query in Neo4j
    const result = await session.run(query, { records });

    // Handle result
    console.log(`Successfully inserted ${result.records.length} records.`);
  } catch (error) {
    console.error("Error during bulk insert:", error);
  }
}

(async () => {
  try {
    // Fetch data from MongoDB
    const transactionDataMonth = await db
      .collection(groupingKytCOllectionName)
      .find({filter:{$ne:"year"}})
      .toArray();
    const transactionDataYear = await db
      .collection(groupingKytCOllectionName)
      .find({filter:"year"})
      .toArray();

    // Call the bulk insert function
    await bulkInsertData(transactionDataMonth);
    await bulkInsertData(transactionDataYear, "yearly");
  } catch (error) {
    console.error("Error during bulk insert:", error);
    process.exit(0);
  } finally {
    // Ensure session is always closed after completion
    await session.close();
    process.exit(0);
  }
})();
