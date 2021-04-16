const mongoose = require('mongoose');

const fxratesSchema = mongoose.Schema({
    date: Date,
    rates: mongoose.SchemaTypes.Mixed
},
{
    timestamps: true
});

fxratesSchema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

const FxRates = mongoose.model('Fxrate', fxratesSchema);

module.exports = FxRates;