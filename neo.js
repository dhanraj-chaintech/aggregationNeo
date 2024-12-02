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

______________________________________________________________________________
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
