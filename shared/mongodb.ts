// source: https://acloudguru.com/blog/engineering/how-to-create-crud-applications-with-azure-functions-and-mongodb
const mongoose = require('mongoose');

const config = {
    dbName: "kiri"
};

function createConnection() {
    console.log("start mongodb connection");

    const mongodbConnectionString = process.env["mongodbConnectionString"];

    if (mongodbConnectionString) {
        console.log("mongodb: connectionstring defined");
        
        // connect db
        mongoose.connect(mongodbConnectionString, {
            useNewUrlParser: true,
            useCreateIndex: true,
            dbName: config.dbName
        }).then(() => {
            console.log('MongoDB connected!!');
        }).catch(err => {
            console.log('Failed to connect to MongoDB', err);
        });       
    }else{
        console.log("mongodb: connectionstring missing");
        return;
    }
}
module.exports = createConnection;