const express = require("express");
const FxRates = require('../models/fxrates');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;

const router = express.Router();

/**
 * Get latest FX Rates 
 */
router.get("/", async (req, res) => {

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
            message: error.message || "Error occured in retrieving fxRates!",
        });
    }
});

/**
 * Get FX Rates for a specific date 
 * if query param has only date then the base currency is EUR
 */
 router.get("/:date", async (req, res) => {
    const date = req.params.date;
    const condition = date ? { date: new Date(date) } : {};

    try {
        const fxrate = await FxRates.find(condition).sort({
            date: -1
        }).limit(1);
        if (fxrate)
            res.send(fxrate);
        else
            res.status(404).send(`No FX Rates were found`)
    } catch (error) {
        res.status(500).send({
            message: error.message || "Error occured in retrieving fxRates!",
        });
    }
});

/**
 * Fetch latest data from ECB
 */
router.get("/db/refresh", async (req, res) => {

    try {
        const response = await fetch(process.env.ECB_API_URL);
        const data = await response.text();
        const fxData = []

        const result = await FxRates.find({}, { _id: 0, date: 1});
        const fxDates = result.map(f => f.date).map(Number);
                
        parseString(data, (err, result) => {            
            result['gesmes:Envelope'].Cube[0]['Cube'].forEach(item => {
                const fxrates = [];
                const record = {
                    date: '',
                    rates: []
                };

                let fxDate = new Date(item.$.time);
                
                if (fxDates.indexOf(+fxDate) === -1) {
                    record.date = item.$.time;
                    item.Cube.forEach(rate => {
                        fxrates.push(rate.$);
                    });
                    record.rates = fxrates;
                    fxData.push(record);
                }
            });
        });
        
        if (fxData.length) {
            const fxresult = await FxRates.insertMany(fxData);
            if (fxresult)
                res.send(fxresult);
            else
                res.status(500).send(`Cannot insert data into database. Check console log for error. ${fxresult}`)
        } else {
            res.send({message: 'All FX data accounted!'});
        }
            
    } catch (error) {
        res.status(500).send({
            message: error.message || "Error occured in inserting data!",
        });
    }
});


module.exports = router;