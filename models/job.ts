const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { composeWithMongoose } = require("graphql-compose-mongoose");

const jobSchema = new Schema({
    type: {
       type: String,
       required: true
    }
}, {
    timestamps: true
});

export const JobTC = composeWithMongoose(mongoose.model('Job', jobSchema));
export const Job = mongoose.model('Job', jobSchema);
