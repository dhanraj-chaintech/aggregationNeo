const { fetchGraphData } = require("./neoApi");

const filteredQueryData = async (data) => {
  const {
    startDate = null,
    senderID = null,
    senderName = null,
    receiverId = null,
    receiverName = null,
    platform = null,
    endDate = null,
    coinCode = null,
    sortBy = "transaction_count", // Default sorting by transaction count
    limit = 20, // Default limit
  } = data || {};

  try {
    const conditioNode = [];
    if (senderID) conditioNode.push(`s.userId = '${senderID}'`);
    if (senderName) conditioNode.push(`s.username = '${senderName}'`);
    if (receiverName) conditioNode.push(`r.username = '${receiverName}'`);
    if (receiverId) conditioNode.push(`r.userId = '${receiverId}'`); // Corrected to receiver's userId
    if (platform) conditioNode.push(`t.platform = '${platform}'`);

    // Build query conditionally based on filters
    let query = `
      MATCH (s:Person)-[t:SEND]->(r:Person)
    `;

    // Add filtering conditions for the nodes
    if (conditioNode.length > 0) {
      query += `WHERE ${conditioNode.join(" AND ")} `;
    }

    query += `
      WITH s, r, t, t.platform AS platform,
     [transaction IN t.transactions | apoc.convert.fromJsonMap(transaction)] AS transactions
    `;

    // Dynamically build filtering conditions for transactions (date and coinCode)
    const conditions = [];
    if (startDate || endDate) {
      const dateConditions = [];
      
      if (startDate) {
        dateConditions.push(`date(txn.date) >= date('${startDate}')`);
      }
      
      if (endDate) {
        dateConditions.push(`date(txn.date) <= date('${endDate}')`);
      }
    
      // Join date conditions with "AND"
      conditions.push(dateConditions.join(' AND '));
    }
    
    if (coinCode) {
      conditions.push(`txn.coin_code = '${coinCode}'`);
    }

    // Append the transaction filtering conditions
    if (conditions.length > 0) {
      query += `
        WITH s, r, platform,
             [txn IN transactions WHERE ${conditions.join(
               " AND "
             )}] AS filteredTransactions
      `;
    } else {
      query += `
        WITH s, r, platform, transactions AS filteredTransactions
      `;
    }

    // Add the rest of the query with transaction history, USD total, and transaction count
    query += `
      WITH s, r, filteredTransactions, platform,
           COLLECT(filteredTransactions) AS transactionHistory,
           REDUCE(totalValue = 0.0, txn IN filteredTransactions | totalValue + toFloat(txn.transaction_usd_value)) AS total_amount,
           SIZE(filteredTransactions) AS transaction_count
      WHERE total_amount > 0
      CALL apoc.create.vRelationship(s, 'VIRTUAL_SEND', {
          total_amount: total_amount,
          transaction_count: transaction_count,
          receiverName: r.name,
          transactions: apoc.convert.toJson(transactionHistory),
          senderName: s.name,
          senderEmail: s.email,
          receiverEmail: r.email,
          platform: platform
      }, r) YIELD rel
      RETURN rel, s, r
      ORDER BY 
          CASE WHEN '${sortBy}' = 'transaction_count' THEN transaction_count END DESC,
          CASE WHEN '${sortBy}' = 'total_amount' THEN total_amount END DESC
      LIMIT ${limit}
    `;

    // Debugging logs
    // console.log("Generated Query:", query);

    // Execute the query
    const queryResult = await fetchGraphData(query);

    // Validate and return results
    if (!queryResult || !queryResult.results) {
      console.error("No results returned from query.");
      return [];
    }

    return queryResult.results;
  } catch (error) {
    console.error("Error executing dynamic filtered query:", error);
    throw error;
  }
};

const shortestPath = async (data) => {
  try {
    const {
      user1ID = null,
      user1Name = null,
      user2Id = null,
      user2Name = null,
      limit = 1,
    } = data || {};

    // Dynamically build property filters, skipping null or undefined values
    const buildFilter = (properties) => {
      const filters = Object.entries(properties)
        .filter(([key, value]) => value !== null && value !== undefined)  // Filter out null/undefined values
        .map(([key, value]) => `${key}: '${value}'`)
        .join(", ");
      return filters ? `{${filters}}` : "";
    };

    const user1Filter = buildFilter({
      userId: user1ID,
      username: user1Name,
    });

    const user2Filter = buildFilter({
      userId: user2Id,
      username: user2Name,
    });

    // Construct the Cypher query with filters
    const query = `
      MATCH (vStart1:Person ${user1Filter})
      OPTIONAL MATCH (vStart2:Person ${user2Filter})
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
      LIMIT ${limit}
    `;

    // Fetch graph data using the constructed query
    const queryResult = await fetchGraphData(query);

    // Validate and return results
    if (!queryResult || !queryResult.results) {
      console.error("No results returned from query.");
      return [];
    }

    return queryResult.results;
  } catch (error) {
    console.error("Error executing dynamic filtered query:", error);
    throw error;
  }
};
const normalView = async (data) => {
  try {
    const {
      user1ID = null,
      user1Name = null,
      user2Id = null,
      user2Name = null,
      limit = 20,
    } = data || {};
    const conditions = [];

    // Dynamically add the conditions
    if (user1ID) conditions.push(`n.userId='${user1ID}' OR q.userId='${user1ID}'`);
    if (user2Id) conditions.push(`n.userId='${user2Id}' OR q.userId='${user2Id}'`);
    if (user1Name) conditions.push(`n.username='${user1Name}' OR q.username='${user1Name}'`); // Fixed this from userId to userName for user1Name
    if (user2Name) conditions.push(`n.username='${user2Name}' OR q.username='${user2Name}'`); // Fixed this from userId to userName for user2Name

    // Build the condition string by joining the array elements with 'OR'
    const cond = conditions.join(" OR ");

    // Construct the final query
    const query = `
      MATCH (n:Person)-[r:SEND]-(q:Person)
      ${conditions.length > 0 ? `WHERE ${cond}` : ''}
      RETURN n, r LIMIT ${limit}
    `;

    console.log("Generated Query:", query); // Debugging generated query

    // Fetch graph data using the constructed query
    const queryResult = await fetchGraphData(query);

    // Validate and return results
    if (!queryResult || !queryResult.results) {
      console.error("No results returned from query.");
      return [];
    }

    return queryResult.results
  } catch (error) {
    console.error("Error executing dynamic filtered query:", error);
    throw error;
  }
};



module.exports = { filteredQueryData, shortestPath ,normalView};
