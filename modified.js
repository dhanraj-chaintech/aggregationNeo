const db = require("./db");
const session = require("./neodb");

const groupingKytCOllectionName = "wallet_history_kyt_group";

async function bulkInsertData() {
  try {
    const transactionData = await db
      .collection(groupingKytCOllectionName)
      .find()
      .toArray();

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

    const query = `
    UNWIND $records AS row
    MERGE (s:Person {userId: row.sender})
    SET s.name = row.senderName, s.username = row.senderName, s.email = row.senderEmail
    MERGE (r:Person {userId: row.receiver})
    SET r.name = row.receiverName, r.username = row.receiverName, r.email = row.receiverEmail

    FOREACH (_ IN CASE WHEN row.transactionType = 'send' THEN [1] ELSE [] END |
        MERGE (s)-[t:SEND {coin_code: row.coinCode}]->(r)
        SET t.transaction_type = row.transactionType,
            t.total_amount = COALESCE(t.total_amount, 0) + toFloat(row.transaction_usd_value),
            t.transactions = COALESCE(t.transactions, []) + [
                apoc.convert.toJson({
                    date: date(row.date),  // Use the formatted date here  
                     time: row.time,          
                     amount: toFloat(row.transaction_amount),
                    transaction_usd_value:toFloat(row.transaction_usd_value)
                })
            ],
            t.transaction_count = COALESCE(t.transaction_count, 0) + 1,
            t.coin_code = row.coinCode,
            t.sender = row.sender,
            t.senderName = row.senderName,
            t.senderEmail = row.senderEmail,
            t.receiver = row.receiver,
            t.receiverName = row.receiverName,
            t.receiverEmail = row.receiverEmail
    )
    
    FOREACH (_ IN CASE WHEN row.transactionType = 'receive' THEN [1] ELSE [] END |
        MERGE (s)-[t:SEND {coin_code: row.coinCode}]->(r)
        SET t.transaction_type = row.transactionType,
            t.total_amount = COALESCE(t.total_amount, 0) + toFloat(row.transaction_usd_value),
            t.transactions = COALESCE(t.transactions, []) + [
                apoc.convert.toJson({
                    date: date(row.date),  
                     time: row.time,                  
                   amount: toFloat(row.transaction_amount),
                    transaction_usd_value:toFloat(row.transaction_usd_value)
                })
            ],
            t.transaction_count = COALESCE(t.transaction_count, 0) + 1,
            t.coin_code = row.coinCode,
            t.sender = row.sender,
            t.senderName = row.senderName,
            t.senderEmail = row.senderEmail,
            t.receiver = row.receiver,
            t.receiverName = row.receiverName,
            t.receiverEmail = row.receiverEmail
    )
    
    FOREACH (_ IN CASE WHEN row.transactionType IS NULL OR NOT row.transactionType IN ['send', 'receive'] THEN [1] ELSE [] END |
        MERGE (s)-[t:SEND {coin_code: row.coinCode}]->(r)
        SET t.transaction_type = row.transactionType,
            t.total_amount = COALESCE(t.total_amount, 0) + toFloat(row.transaction_usd_value),
            t.transactions = COALESCE(t.transactions, []) + [
                apoc.convert.toJson({
                    date: date(row.date),
                    time: row.time,
                    amount: toFloat(row.transaction_amount),
                    transaction_usd_value:toFloat(row.transaction_usd_value)
                })
            ],
            t.transaction_count = COALESCE(t.transaction_count, 0) + 1,
            t.coin_code = row.coinCode,
            t.sender = row.sender,
            t.senderName = row.senderName,
            t.senderEmail = row.senderEmail,
            t.receiver = row.receiver,
            t.receiverName = row.receiverName,
            t.receiverEmail = row.receiverEmail
    )
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