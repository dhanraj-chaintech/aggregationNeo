const { MaxTransaction } = require("./dataPipeline");
const cors = require("cors");
const db = require("./db");
const parser = require('body-parser')
const fetchGraphData = require("./neo/neoApi");
const router = require("./routes/kyt.routes");
const app = require("express")();
app.use(require("express").json());
const port = 3000;
app.use(cors());
app.use(parser.urlencoded({extended:false}))


async function runQuery() {
  try {
    // Example query to find nodes where the userId doesn't contain 'ixfi'
    const result = await fetchGraphData(
      `MATCH (s:Person)-[t:SEND]->(r:Person)
WITH s, r, t, 
     // Convert the stringified JSON array into a list of JSON objects using fromJsonMap
     [transaction IN t.transactions 
        | apoc.convert.fromJsonMap(transaction)
     ] AS transactions
WITH s, r, t, 
     // Filter transactions by date range and coin_code
     [txn IN transactions
        WHERE date(txn.date) <= date('2025-08-25') 
     ] AS filteredTransactions
WITH s, r, t, filteredTransactions, 
     // Collect the filtered transactions into an array as transaction history
     COLLECT(filteredTransactions) AS transactionHistory,
     // Calculate total USD and count of filtered transactions
     REDUCE(totalValue = 0.0, txn IN filteredTransactions | totalValue + toFloat(txn.transaction_usd_value)) AS totalUsd,
     SIZE(filteredTransactions) AS transactionCount
WHERE totalUsd > 0
// Create virtual relationship with the computed data, including platform, source_address, and destination_address
CALL apoc.create.vRelationship(s, 'VIRTUAL_SEND', {
    totalUsd: totalUsd,
    transactionCount: transactionCount,
    receiverName: r.name,
    transactionHistory: apoc.convert.toJson(transactionHistory), 
    senderName: s.name,
    senderEmail: s.email,
    receiverEmail: r.email,
    platform: t.platform,  
    source_address: t.source_address,  
    destination_address: t.destination_address  
}, r) YIELD rel
RETURN rel, s, r
LIMIT 500`
    );

    return result.results[0].data;
  } catch (error) {
    console.error("Error running query", error);
  }
}
app.get("/data", async (req, res) => {
  const data = await runQuery();
  res.json({ data: data });
});
app.use(router)
app.listen(port, () => {
  console.log(`Data pipeline listening at http://localhost:${port}`);
});
