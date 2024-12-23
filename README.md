# aggregationNeo

**With the help of CSV File**

```javascript
:auto LOAD CSV WITH HEADERS FROM 'file:///kyt.csv' AS row
CALL {
  WITH row

  // Merge unique nodes for sender and receiver
  MERGE (s:Person { userId: row.sender, name: row.senderName })
  SET s.username = row.senderName, s.email = row.senderEmail

  MERGE (r:Person { userId: row.receiver, name: row.receiverName })
  SET r.username = row.receiverName, r.email = row.receiverEmail

  // Create relationships based on transaction_type
  FOREACH(_ IN CASE WHEN row.transaction_type = 'send' THEN [1] ELSE [] END |
    MERGE (s) -[t:SEND {transaction_id: row.transaction_id}] -> (r)
    SET t.transaction_type = row.transaction_type,
        t.transaction_amount = toFloat(row.transaction_amount),
        t.coin_code = row.coin_code,
        t.username = row.username,
        t.email = row.email,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.date = date(datetime(row.created_at)),  // Convert to date
        t.fund_source = row.fund_source,
        t.internal_status = row.internal_status,
        t.transaction_number = row.transaction_number
  )

  FOREACH(_ IN CASE WHEN row.transaction_type = 'receive' THEN [1] ELSE [] END |
    MERGE (s) -[t:RECEIVE {transaction_id: row.transaction_id}] -> (r)
    SET t.transaction_type = row.transaction_type,
        t.transaction_amount = toFloat(row.transaction_amount),
        t.coin_code = row.coin_code,
        t.username = row.username,
        t.email = row.email,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.date = date(datetime(row.created_at)),  // Convert to date
        t.fund_source = row.fund_source,
        t.internal_status = row.internal_status,
        t.transaction_number = row.transaction_number
  )

  FOREACH(_ IN CASE WHEN row.transaction_type IS NULL OR NOT row.transaction_type IN ['send', 'receive'] THEN [1] ELSE [] END |
    MERGE (s) -[t:OTHER {transaction_id: row.transaction_id}] -> (r)
    SET t.transaction_type = row.transaction_type,
        t.transaction_amount = toFloat(row.transaction_amount),
        t.coin_code = row.coin_code,
        t.username = row.username,
        t.email = row.email,
        t.sender = row.sender,
        t.senderName = row.senderName,
        t.receiver = row.receiver,
        t.receiverName = row.receiverName,
        t.date = date(datetime(row.created_at)),  // Convert to date
        t.fund_source = row.fund_source,
        t.internal_status = row.internal_status,
        t.transaction_number = row.transaction_number
  )
} IN TRANSACTIONS OF 9000 ROWS;
```

## Merge the existing node into single and delete existing data

```javascript
      MATCH (s:Person)-[r]->(n:Person)
WHERE r.transaction_type IN ['send', 'receive']  // Filter by transaction type
  AND r.coin_code IS NOT NULL  // Filter to exclude null coin_code
WITH s, n, r.transaction_type AS type, r.coin_code AS coin,
     SUM(toFloat(r.transaction_amount)) AS totalAmount

// Delete existing relationships with the same coin_code and transaction_type
MATCH (s)-[existingRel:sendM|recM]->(n)
WHERE existingRel.coin_code = coin AND existingRel.transaction_type = type
DELETE existingRel

// Handle 'send' transactions
WITH s, n, type, coin, totalAmount
WHERE type = 'send'  // Only send transactions
MERGE (s)-[sendRel:sendM {transaction_type: 'send', coin_code: coin}]->(n)
SET sendRel.transaction_amount = totalAmount

// Handle 'receive' transactions
WITH s, n, type, coin, totalAmount
WHERE type = 'receive'  // Only receive transactions
MERGE (s)-[recRel:recM {transaction_type: 'receive', coin_code: coin}]->(n)
SET recRel.transaction_amount = totalAmount

RETURN s, n   // You can adjust this to return additional details if needed
```

# Shortest Path query

```javascript
MATCH (vStart1:${neo4jQueryConstants[searchType][0]} {${neo4jQueryConstants[searchType][1]}: '${search}'})
                    OPTIONAL MATCH (vStart2:${neo4jQueryConstants[branchSearchType][0]} {${neo4jQueryConstants[branchSearchType][1]}: '${branchSearch}'})

                    CALL apoc.path.expandConfig(vStart1, {
                        relationshipFilter: "visitorId|IP",
                        uniqueness: "NODE_GLOBAL",
                        maxLevel: -1
                    }) YIELD path AS path1

                    WITH path1, vStart2
                    CALL apoc.path.expandConfig(vStart2, {
                        relationshipFilter: "visitorId|IP",
                        uniqueness: "NODE_GLOBAL",
                        maxLevel: -1
                    }) YIELD path AS path2
                    WITH path1, path2

                    WHERE last(nodes(path1)) = last(nodes(path2))
                    RETURN path1, path2
                    LIMIT 1
```
# One node with children hops traverse

```javascript
MATCH (vStart:User {userId: '666ab4c1550396ea1a969857'})
CALL apoc.path.expandConfig(vStart, {
    relationshipFilter: "visitorId|IP",
    uniqueness: "NODE_GLOBAL",
    maxLevel: -1
})
YIELD path
RETURN path limit 50;
 ```
# Find Date Range
```javascript
MATCH (s:Person)-[t:SEND]->(r:Person)
WITH t, s, r, 
     [transaction IN t.transactions | apoc.convert.fromJsonMap(transaction)] AS transactions
UNWIND transactions AS transaction
WITH transaction, s, r
WHERE date(transaction.date) >= date('2024-11-01') AND date(transaction.date) <= date('2024-12-30')
RETURN s,r
```

# Virtual realationship
```javascript
MATCH (a:User {name: 'a'})-[r:SEND]->(t:Transaction)-[:SEND]->(u2:User)
WITH a, u2, SUM(t.amount) AS totalAmount
CALL apoc.create.vRelationship(a, 'SENT_AGGREGATED', {amount: totalAmount}, u2) YIELD rel
RETURN a, u2, rel;
```
# Update with date 

# Virtual Relation With Filter
```javascript
MATCH (s:Person)-[t:SEND]->(r:Person)
WITH s, r, 
     // Convert the stringified JSON array into a list of JSON objects using fromJsonMap
     [transaction IN t.transactions 
        | apoc.convert.fromJsonMap(transaction)
     ] AS transactions
WITH s, r, 
     // Filter transactions by date range and coin_code
     [txn IN transactions
        WHERE date(txn.date) >= date('2022-12-01') 
        AND date(txn.date) <= date('2024-01-30') 
        AND txn.coin_code = 'usdt'
     ] AS filteredTransactions
WITH s, r, filteredTransactions, 
     // Collect the filtered transactions into an array as transaction history
     COLLECT(filteredTransactions) AS transactionHistory,
     // Calculate total USD and count of filtered transactions
     REDUCE(totalValue = 0.0, txn IN filteredTransactions | totalValue + toFloat(txn.transaction_usd_value)) AS totalUsd,
     SIZE(filteredTransactions) AS transactionCount
WHERE totalUsd > 0
// Create virtual relationship with the computed data
CALL apoc.create.vRelationship(s, 'VIRTUAL_SEND', {
    totalUsd: totalUsd,
    transactionCount: transactionCount,
    coin_code: 'usdt',
    receiverName: r.name,
    transactionHistory: apoc.convert.toJson(transactionHistory), // Save entire filtered transactions as history
    senderName: s.name,
    senderEmail: s.email,
    receiverEmail: r.email
}, r) YIELD rel
RETURN rel, s,r LIMIT 10

```
```javascript
MATCH (s:Person)-[t:SEND]->(r:Person)
where s.username="rishi0007" AND r.username="ccptest"
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
LIMIT 10
;

```
# This For Find path between two nodes
```javascript
  MATCH (vStart1:Person {username:""})
      OPTIONAL MATCH (vStart2:Person {username:""})
      CALL apoc.path.expandConfig(vStart1, {
          uniqueness: "NODE_GLOBAL",
          maxLevel: -1
      }) YIELD path AS path1
      WITH path1, vStart2
      CALL apoc.path.expandConfig(vStart2, {
          uniqueness: "NODE_GLOBAL",
          maxLevel: -1
      }) YIELD path AS path2
      WITH path1, path2
      WHERE last(nodes(path1)) = last(nodes(path2))
      RETURN path1, path2
      LIMIT 1
```
# This For Find Path of single node 

```javascript
 MATCH (vStart1:Person {username:""})
      CALL apoc.path.expandConfig(vStart1, {
          uniqueness: "NODE_GLOBAL",
          maxLevel: -1
      }) YIELD path AS path1
      WITH path1
      RETURN path1
      LIMIT 1

 ```