const express = require("express");
const FxRates = require('../models/fxrates');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;

const router = express.Router();

router.get("/", (req, res) => {
    res.send({message:"Welcome to fx-rates-api"});
})

/**
 * Get latest FX Rates 
 */
router.get("/latest", async (req, res) => {

    try {
        const fxrate = await FxRates.find({}).sort({
            date: -1
        }).limit(1);
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

router.get("/refresh", async (req, res) => {

    try {
        const response = await fetch(process.env.ECB_API_URL);
        const data = await response.text();
        const fxData = []

        parseString(data, (err, result) => {            
            result['gesmes:Envelope'].Cube[0]['Cube'].forEach(item => {
                const fxrates = [];
                const record = {
                    date: '',
                    rates: []
                };

                record.date = item.$.time;
                item.Cube.forEach(rate => {
                    fxrates.push(rate.$);
                });
                record.rates = fxrates;
                fxData.push(record)
            });
        });
        
        const fxresult = await FxRates.insertMany(fxData);
        if (fxresult)
            res.send(fxresult);
        else
            res.status(500).send(`Cannot insert data into database. Check console log for error. ${fxresult}`)
            
    } catch (error) {
        res.status(500).send({
            message: err.message || "Error occured in inserting data!",
        });
    }
});




module.exports = router;
