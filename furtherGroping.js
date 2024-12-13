const db = require("./db");
const session = require("./neodb");

const groupingKytCollectionName = "wallet_history_kyt_group";

async function bulkInsertData() {
  try {
    // Fetch transaction data from the MongoDB collection
    const transactionData = await db
      .collection(groupingKytCollectionName)
      .find()
      .toArray();

    // Map the MongoDB data to the required format
    const records = transactionData.map((row) => {
      return {
        sender: row.sender.toString(),
        senderName: row.senderName,
        senderEmail: row.senderEmail,
        transaction_amount: row.transaction_amount,
        receiver: row.receiver.toString(),
        transaction_usd_value: row.transaction_usd_value,
        receiverName: row.receiverName,
        receiverEmail: row.receiverEmail,
        transactionType: row.transaction_type,
        platform: row.platform,
        coinCode: row.coin_code,
        date: row.created_at.toISOString().split("T")[0],
        time: row.created_at.toISOString().split("T")[1].split(".")[0],
        tnxId: row._id.toString()
      };
    });

    // Cypher query for bulk insertion/updation
    const query = `
    UNWIND $records AS row
    
    MERGE (s:Person {userId: row.sender})
    SET s.name = row.senderName, s.username = row.senderName, s.email = row.senderEmail
    
    MERGE (r:Person {userId: row.receiver})
    SET r.name = row.receiverName, r.username = row.receiverName, r.email = row.receiverEmail

    MERGE (s)-[t:SEND]->(r)
    ON CREATE SET 
        t.transactions = [],
        t.total_amount = 0,
        t.transaction_count = 0
    SET  t.transaction_type = row.transactionType,
    t.sender = row.sender,
    t.senderName = row.senderName,
    t.senderEmail = row.senderEmail,
    t.receiver = row.receiver,
    t.receiverName = row.receiverName,
    t.receiverEmail = row.receiverEmail,
    t.platform = row.platform
    
    WITH t, row, 
         [txn IN t.transactions | apoc.convert.fromJsonMap(txn)] AS transactions
    
    // Check if the transaction already exists in the array
    WITH t, row, transactions,
         NONE(txn IN transactions WHERE txn.tnxId = row.tnxId) AS isNewTransaction

    // Update the relationship properties and append the transaction if it's new
    SET t.total_amount = t.total_amount + CASE WHEN isNewTransaction THEN toFloat(row.transaction_usd_value) ELSE 0 END,
        t.transaction_count = t.transaction_count + CASE WHEN isNewTransaction THEN 1 ELSE 0 END,
        t.transactions = CASE 
            WHEN isNewTransaction THEN 
                t.transactions + [apoc.convert.toJson({
                    date: row.date,
                    time: row.time,
                    amount: toFloat(row.transaction_amount),
                    transaction_usd_value: toFloat(row.transaction_usd_value),
                    coin_code: row.coinCode,
                    tnxId: row.tnxId
                })]
            ELSE 
                t.transactions
        END
    RETURN t.transaction_count AS transactionCount, t.total_amount AS totalAmount, t.transactions AS transactions
    `;

    // Run the query in Neo4j session
    const result = await session.run(query, { records });

    console.log(`Successfully inserted/updated transactions. Total relationships processed: ${result.records.length}`);
  } catch (error) {
    console.error("Error during bulk insert:", error);
  } finally {
    await session.close();
    process.exit(0);
  }
}

bulkInsertData();
