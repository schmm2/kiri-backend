// source: https://acloudguru.com/blog/engineering/how-to-create-crud-applications-with-azure-functions-and-mongodb
const mongoose = require('mongoose');

const config = {
    dbName: "kiri"
};

async function createConnection() {
    console.log("mongodb: start connection");

    const mongodbConnectionString = process.env["mongodbConnectionString"];
    let connectionEstablished = false;

    if (mongodbConnectionString) {
        console.log("mongodb: connectionstring defined");

        try {
            // connect db
            await mongoose.connect(mongodbConnectionString, {
                dbName: config.dbName
            });
            connectionEstablished = true;
        } catch (error) {
            console.error("mongodb: unable to connect");
            throw new Error(error);
        }
    }
    else {
        console.log("mongodb: connectionstring missing");
        throw new Error("mongodb: connectionstring missing");
    }
    return connectionEstablished;
}

module.exports = createConnection;