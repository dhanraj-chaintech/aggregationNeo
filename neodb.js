// Import the Neo4j driver
const neo4j = require('neo4j-driver');

// Create a driver instance (Replace with your own Neo4j URI, username, and password)
const driver = neo4j.driver(
  'bolt://localhost:7689', // URI of the Neo4j database
  neo4j.auth.basic('neo4j', 'root@123') // Authentication (username, password)
);

// Create a session to run queries
const session = driver.session();



module.exports =session;