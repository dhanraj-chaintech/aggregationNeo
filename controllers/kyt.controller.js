const { filteredQueryData, shortestPath, normalView } = require("../neo/query");

const filteredTransaction = async (req,res)=>{
    try {
        const filteredQueryProps = req.body;
        const results  = 
        
        await filteredQueryData(filteredQueryProps);
        if(results[0]?.data.length===0) return res.status(404).json({message:"No data Found",status:404})
        res.status(200).json({
            message:"data fetch successfully",
            status:200,
            data:results[0].data
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"INTERNAL SERVER ERROR",status:500})
    }
}

const shortestPathFilteredData = async(req,res)=>{
    try {
        const filteredQueryProps = req.body;
        const results = await shortestPath(filteredQueryProps);
        if(results[0].data.length===0) return res.status(404).json({message:"No data Found",status:404})
        res.status(200).json({
            message:"data fetch successfully",
            status:200,
            data:results[0].data
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"INTERNAL SERVER ERROR",status:500})
        
    }
}

const normalViewData = async(req,res)=>{
    try {
        const filteredQueryProps = req.body;
        const results = await normalView(filteredQueryProps);
        if(results[0].data.length===0) return res.status(404).json({message:"No data Found",status:404})
        res.status(200).json({
            message:"data fetch successfully",
            status:200,
            data:results[0].data
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"INTERNAL SERVER ERROR",status:500})
        
    }
}

module.exports ={
    filteredTransaction,
    shortestPathFilteredData,
    normalViewData
}