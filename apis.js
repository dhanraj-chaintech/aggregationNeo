const { MaxTransaction } = require('./dataPipeline');
const cors = require('cors');
const db = require("./db");
const session = require('./neodb');
const app = require('express')();
const port = 3000;
app.use(
  cors()
)
app.get('/max-trans',async (req,res)=>{
    const data = await db
    .collection("wallet_history_kyt")
    .aggregate(MaxTransaction)
    .toArray();
    res.send(data);
})

async function runQuery() {
  try {
    // Example query to find nodes where the userId doesn't contain 'ixfi'
    const result = await session.run(
      'MATCH (n) WHERE NOT n.userId CONTAINS $userIdSubstring RETURN n',
      { userIdSubstring: 'ixfi' } // Using parameterized queries for better security
    );

    return result.records;
  } catch (error) {
    console.error('Error running query', error);
  } 
}
app.get('/data',async (req,res)=>{
const data = await runQuery();
console.log(JSON.stringify(data[0]))
res.json({data:data})
})

app.listen(port, () => {
  console.log(`Data pipeline listening at http://localhost:${port}`);
});


