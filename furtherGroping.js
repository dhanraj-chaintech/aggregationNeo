const db = require("./db");
const session = require("./neodb");

const groupingKytCOllectionName = "wallet_history_kyt_group";

async function bulkInsertData() {
  try {
    const transactionData = await db
      .collection(groupingKytCOllectionName)
      .find()
      .toArray();
    const a=  await session.run('MATCH (s)-[t:SEND]-(r) return s,r,t')

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
        coinCode: row.coin_code,
        date:row.created_at.toISOString().split('T')[0],
        time:row.created_at.toISOString().split('T')[1].split('.')[0],
      };
    });

    const query = `UNWIND $records AS row
MERGE (s:Person {userId: row.sender})
SET s.name = row.senderName, s.username = row.senderName, s.email = row.senderEmail
MERGE (r:Person {userId: row.receiver})
SET r.name = row.receiverName, r.username = row.receiverName, r.email = row.receiverEmail

// Create or update the SEND relationship between sender and receiver
MERGE (s)-[t:SEND]->(r)
SET t.transaction_type = row.transactionType,
    t.total_amount = COALESCE(t.total_amount, 0) + toFloat(row.transaction_usd_value),
    t.transaction_count = COALESCE(t.transaction_count, 0) + 1,
    t.sender = row.sender,
    t.senderName = row.senderName,
    t.senderEmail = row.senderEmail,
    t.receiver = row.receiver,
    t.receiverName = row.receiverName,
    t.receiverEmail = row.receiverEmail

// Use APOC to store the JSON data (with details for each transaction)
WITH s, r, t, row
SET t.transactions = 
    CASE 
        WHEN t.transactions IS NULL THEN 
            [apoc.convert.toJson({
                date: date(row.date),
                time: row.time,
                amount: toFloat(row.transaction_amount),
                transaction_usd_value: toFloat(row.transaction_usd_value),
                coin_code: row.coinCode
            })]
        ELSE
            t.transactions + [apoc.convert.toJson({
                date: date(row.date),
                time: row.time,
                amount: toFloat(row.transaction_amount),
                transaction_usd_value: toFloat(row.transaction_usd_value),
                coin_code: row.coinCode
            })]
    END
`;

    const result = await session.run(query, { records });

    console.log(`Successfully inserted ${result.records.length} records.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during bulk insert:", error);
  } finally {
    await session.close();
  }
}



bulkInsertData()