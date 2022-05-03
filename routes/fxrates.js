const express = require("express");
const FxRates = require("../models/fxrates");
const axios = require("axios").default;
const { parseString } = require("xml2js");
const { format } = require("date-fns");

const router = express.Router();

router.get("/", (req, res) => {
  res.send({ message: "Welcome to fx-rates-api" });
});

/**
 * Get latest FX Rates
 */
router.get("/fxrates", async (req, res) => {
  try {
    const { base, date } = req.query;

    let filter = {};

    if (date !== "latest") {
      filter = {
        date,
      };
    }

    const fxrate = await FxRates.findOne(filter).sort({
      date: -1,
    });

    if (fxrate) {
      const rates = fxrate.rates;
      const date = fxrate.date;

      if (base && base.toUpperCase() !== "EUR") {
        const newBaseRate = parseFloat(
          rates.find((r) => r.currency === base).rate
        ).toFixed(4);

        const newRates = rates.map((r) => {
          const calcRate = newBaseRate / parseFloat(r.rate);
          return {
            currency: r.currency,
            rate: calcRate.toFixed(4),
          };
        });

        const calcEURRate = 1 / newBaseRate;
        newRates.push({
          currency: "EUR",
          rate: calcEURRate.toFixed(4),
        });

        res.send({ base, date, rates: newRates });
      } else {
        rates.push({
          currency: "EUR",
          rate: 1.0,
        });

        res.send({ base: "EUR", date, rates });
      }
    } else res.status(404).send(`No FX Rates were found`);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: error.message || "Error occured in retrieving fxRates!",
    });
  }
});

router.get("/fxrates/history", async (req, res) => {
  try {
    const { base, start, end } = req.query;

    if (start === undefined && end === undefined) {
        return res.status(400).send({ message: 'Invalid Input. Missing query string parameters Start and End '});
    }

    console.log(start, end);

    const fxrates = await FxRates.find({ date: { $lte: end, $gte: start } }).sort({ date: 1 });

    console.log(fxrates.length);
    if (fxrates || fxrates.length) {
      const fxRatesColl = [];
      fxrates.forEach((r) => {
        const rates = r.rates;
        const date = r.date;

        if (base && base.toUpperCase() !== "EUR") {
          const newBaseRate = parseFloat(
            rates.find((r) => r.currency === base).rate
          ).toFixed(4);

          const newRates = rates.map((r) => {
            const calcRate = newBaseRate / parseFloat(r.rate);
            return {
              currency: r.currency,
              rate: calcRate.toFixed(4),
            };
          });

          const calcEURRate = 1 / newBaseRate;
          newRates.push({
            currency: "EUR",
            rate: calcEURRate.toFixed(4),
          });
          fxRatesColl.push({ base, date, rates: newRates });
        } else {
          // Base currency defaults to EUR
          rates.push({
            currency: "EUR",
            rate: parseFloat("1").toFixed(4),
          });

          fxRatesColl.push({ base: "EUR", date, rates });
        }
      });
      res.send(fxRatesColl);
    } else res.status(404).send(`No FX Rates were found`);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: error.message || "Error occured in retrieving fxRates!",
    });
  }
});

router.get("/refresh", async (req, res) => {
  try {
    const result = await axios.get(process.env.ECB_API_URL);
    const fxData = [];

    parseString(result.data, (err, result) => {
      result["gesmes:Envelope"].Cube[0]["Cube"].forEach((item) => {
        const fxrates = [];
        const record = {
          date: "",
          rates: [],
        };

        record.date = item.$.time;
        item.Cube.forEach((rate) => {
          fxrates.push(rate.$);
        });
        record.rates = fxrates;
        fxData.push(record);
      });
    });

    const fxresult = await FxRates.insertMany(fxData);
    if (fxresult) res.send(fxresult);
    else
      res
        .status(500)
        .send(
          `Cannot insert data into database. Check console log for error. ${fxresult}`
        );
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: error.message || "Error occured in inserting data!",
    });
  }
});

module.exports = router;
