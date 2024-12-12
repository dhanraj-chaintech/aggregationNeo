async function fetchGraphData(cypherString) {
  try {
    let response = await fetch("http://localhost:7474/db/neo4j/tx", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa("neo4j:root@123"),
        "Content-Type": "application/json",
        Accept: "application/json;charset=UTF-8",
      },
      body:
        '{"statements":[{"statement":"' +
        cypherString.replace(/(\r\n|\n|\r)/gm, "\\n").replace(/"/g, '\\"') +
        '", "resultDataContents":["graph", "row"]}]}',
    });

    if (!response.ok) {
      console.error("HTTP Error: ", response.statusText);
      return;
    }

    let jsonResponse = await response.json();
    if (jsonResponse?.errors && jsonResponse.errors.length > 0)
      throw new Error(JSON.stringify(jsonResponse.errors));
    return jsonResponse;
  } catch (error) {
    console.log(error);
  }
}
async function insertData(data) {
  try {
    let response = await fetch("http://localhost:7474/db/neo4j/tx/commit", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa("neo4j:root@123"),
        "Content-Type": "application/json",
        Accept: "application/json;charset=UTF-8",
      },
      body:JSON.stringify(data)
    });

    if (!response.ok) {
      console.error("HTTP Error: ", response.statusText);
      return;
    }

    let jsonResponse = await response.json();
    if (jsonResponse?.errors && jsonResponse.errors.length > 0)
      throw new Error(JSON.stringify(jsonResponse.errors));
    return jsonResponse;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {fetchGraphData , insertData};
