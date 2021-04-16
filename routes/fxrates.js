const express = require("express");
const FxRates = require('../models/fxrates');
// const parseString = require('xml2js').parseString;

const router = express.Router();

/**
* Get latest FX Rates 
*/
router.get("/latest", async(req, res) => {

    try {
        const fxrate = await FxRates.find({}).sort({ date: -1 }).limit(1);
        if (fxrate)
            res.send(fxrate);
        else
            res.status(404).send(`No FX Rates were found`)
    } catch (error) {
        res.status(500).send({
            message: err.message || "Error occured in retrieving fxRates!",
        });
    }
});

// TODO: Add code to parse data from ECB
// parseString(data, (err, result) => {
//     console.dir(result['gesmes:Envelope'].Cube[0]['Cube']);
// });


module.exports = router;