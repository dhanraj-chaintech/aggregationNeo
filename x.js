const fs = require('fs');
const path = require('path');
async function fetchGraphData() {
    let cypherString = `
MATCH (n:Person)
WITH n LIMIT 10 
WITH collect(n) AS nodes  
UNWIND nodes AS n
OPTIONAL MATCH (n)-[r]-(m)
WHERE r.year > 2022 AND r.filter = "yearly" 
AND m IN nodes  
RETURN n, r, m
LIMIT 1000


    `;

      let response = await fetch("http://localhost:7474/db/neo4j/tx", {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa("neo4j:root@123"),
          "Content-Type": "application/json",
          Accept: "application/json;charset=UTF-8",
        },
        body:
          '{"statements":[{"statement":"' +
          cypherString
            .replace(/(\r\n|\n|\r)/gm, "\\n")
            .replace(/"/g, '\\"') +
          '", "resultDataContents":["graph", "row"]}]}',
      });

      if (!response.ok) {
        console.error("HTTP Error: ", response.statusText);
        return;
      }

      let jsonResponse = await response.json();
      fs.writeFileSync('./a.js', JSON.stringify(jsonResponse, null, 2));
      console.log(jsonResponse);
    }

    fetchGraphData()