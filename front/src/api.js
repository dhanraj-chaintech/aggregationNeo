// api.js
export const fetchGraphData = async (cypherQuery) => {
    try {
      const response = await fetch("http://localhost:7474/db/neo4j/tx", {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa("neo4j:root@123"),
          "Content-Type": "application/json",
          Accept: "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          statements: [
            {
              statement: cypherQuery,
              resultDataContents: ["graph", "row"], 
            },
          ],
        }),
      });
  
      if (!response.ok) {
        console.error("HTTP Error: ", response.statusText);
        return null;
      }
  
      const data = await response.json();
      return data.results[0].data;
    } catch (error) {
      console.error("Error fetching data from Neo4j:", error);
      return null;
    }
  };
  