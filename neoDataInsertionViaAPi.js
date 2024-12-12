const db = require("./db"); // MongoDB connection
const { insertData } = require("./neo/neoApi");

const groupingKytCollectionName = "wallet_history_kyt_group";

async function bulkInsertData() {
  try {
    console.log("Fetching transaction data from MongoDB...");
    const transactionData = await db
      .collection(groupingKytCollectionName)
      .find()
      .toArray();

    console.log(`Fetched ${transactionData.length} records.`);

    const statements = transactionData.map((row) => {
      const sender = row.sender.toString();
      const receiver = row.receiver.toString();

      return {
        statement: `
        MERGE (s:Person {userId: $sender})
SET s.name = $senderName, s.username = $senderName, s.email = $senderEmail
MERGE (r:Person {userId: $receiver})
SET r.name = $receiverName, r.username = $receiverName, r.email = $receiverEmail

MERGE (s)-[t:SEND]->(r)
ON CREATE SET 
    t.transactions = [],
    t.total_amount = 0,
    t.transaction_count = 0
SET t.transaction_type = $transactionType,
    t.sender = $sender,
    t.senderName = $senderName,
    t.senderEmail = $senderEmail,
    t.receiver = $receiver,
    t.receiverName = $receiverName,
    t.receiverEmail = $receiverEmail,
    t.platform = $platform,
    t.source_address = $source_address,
    t.destination_address = $destination_address

WITH t, s, r, 
     [transaction IN t.transactions | apoc.convert.fromJsonMap(transaction)] AS transactions

// Check if transaction with the same tnxId already exists
WITH t, s, r, transactions, 
     NONE(txn IN transactions WHERE txn.tnxId = $tnxId) AS isNewTransaction

// Initialize transactions array if null
SET t.transactions = COALESCE(t.transactions, [])

WITH t, s, r, isNewTransaction

// Update count and amount if the transaction is new
SET t.total_amount = t.total_amount + CASE WHEN isNewTransaction THEN toFloat($transaction_usd_value) ELSE 0 END,
    t.transaction_count = t.transaction_count + CASE WHEN isNewTransaction THEN 1 ELSE 0 END

// Conditionally append the transaction if it's new
SET t.transactions = CASE 
    WHEN isNewTransaction THEN 
        t.transactions + apoc.convert.toJson({
            date: date($transactionDate),
            time: $transactionTime,
            amount: toFloat($transactionAmount),
            transaction_usd_value: toFloat($transaction_usd_value),
            coin_code: $coinCode,
            tnxId: $tnxId
        })
    ELSE 
        t.transactions
    END
RETURN t.transaction_count, t.total_amount, t.transactions

        `,
        parameters: {
          sender,
          senderName: row.senderName,
          senderEmail: row.senderEmail,
          receiver,
          receiverName: row.receiverName,
          receiverEmail: row.receiverEmail,
          transactionType: row.transaction_type,
          platform: row.platform,
          source_address: row.source_address,
          destination_address: row.destination_address,
          transactionDate: row.created_at.toISOString().split("T")[0],
          tnxId: row._id.toString(),
          transactionTime: row.created_at
            .toISOString()
            .split("T")[1]
            .split(".")[0],
          transactionAmount: parseFloat(row.transaction_amount),
          transaction_usd_value: parseFloat(row.transaction_usd_value),
          coinCode: row.coin_code,
        },
      };
    });

    console.log("Sending data to Neo4j...");
    const response = await insertData({ statements });
    const result = await response;

    if (result.errors && result.errors.length > 0) {
      console.error("Errors:", result.errors);
    } else {
      console.log(
        `Successfully inserted or updated ${transactionData.length} records into Neo4j.`
      );
    }
    process.exit(0);
  } catch (error) {
    console.error("Error during bulk insert:", error);
    process.exit(1);
  }
}

bulkInsertData();
