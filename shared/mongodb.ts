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
                useNewUrlParser: true,
                dbName: config.dbName,
                // https://stackoverflow.com/questions/52572852/deprecationwarning-collection-findandmodify-is-deprecated-use-findoneandupdate
                useFindAndModify: false,
                useUnifiedTopology: true,
                useCreateIndex: true
            });
            connectionEstablished = true;
        } catch (error) {
            console.log("mongodb: failed to connect to mongodb");
        }
    }
    else {
        console.log("mongodb: connectionstring missing");
    }
    return connectionEstablished;
}

module.exports = createConnection;