const { filteredTransaction, shortestPathFilteredData, normalViewData } = require("../controllers/kyt.controller");

const router = require("express").Router();

router.post('/filtered-data',filteredTransaction)
router.post('/shortestpath-data',shortestPathFilteredData)
router.post('/normal-view',normalViewData)

module.exports = router;