const { filteredTransaction, shortestPathFilteredData } = require("../controllers/kyt.controller");

const router = require("express").Router();

router.post('/filtered-data',filteredTransaction)
router.post('/shortestpath-data',shortestPathFilteredData)

module.exports = router;