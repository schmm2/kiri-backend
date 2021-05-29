const mongoose = require('mongoose');

const config = {
    dbName: "kiri"
};

async function createConnection() {

    mongoose.Promise = Promise

    mongoose.connection.on('connected', () => {
        console.log('MongoDB Connection Established')
    })

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB Connection Reestablished')
    })

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB Connection Disconnected')
    })

    mongoose.connection.on('close', () => {
        console.log('MongoDB Connection Closed')
    })

    mongoose.connection.on('error', (error) => {
        console.log('MongoDB ERROR: ' + error)
    })

    const mongodbConnectionString = process.env["mongodbConnectionString"];

    if (mongodbConnectionString) {
        console.log("mongodb: connectionstring defined");
        
        // connect db
        let db = await mongoose.connect(mongodbConnectionString, {
            useNewUrlParser: true,
            useCreateIndex: true,
            dbName: config.dbName
        });
        return db;
    }else{
        console.log("mongodb: connectionstring missing");
    }
}

module.exports = createConnection;