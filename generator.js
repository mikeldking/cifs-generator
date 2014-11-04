'use strict';

/**
 * module imports
 */
var SMB2 = require('smb2'),
    program = require('commander'),
    async = require('async'),
    ProgressBar = require('progress');


/**
 * variables
 */
var smbConfig = {},
    progressBar = new ProgressBar('Generating Traffic [:bar] :percent', {width: 20, total: 100}),
    startTime, //the time that the traffic generation start
    endTime, //the time to end the traffic generation
    lastTick,
    currentTick,
    statistics = {reads: 0, writes: 0},
    statisticsPrinted = false,
    writeBuffer, //buffer to be used to write data to the share
    outstandingTasks = 0,//number of tgen tasks outstanding
    smb2Client; //the client that is re-used for reads and writes

program
    .version('0.0.1')
    .option('-s, --share <share>', 'share')
    .option('-d, --shareDomain <shareDomain>', 'shareDomain')
    .option('-u, --username <username>', 'username')
    .option('-p, --password <password>', 'password')
    .option('-o, --octets <octets>', 'nubmer of octets in the files in the file transfer', parseFloat, 2048000)//default octets
    .option('-t, --time <time>', 'the amount of time to generate traffic in ms', 600000)
    .option('-r, --read <read>', 'flag to perform reads (defaults to true)', parseBool, true)
    .option('-w, --write <write>', 'flag to perform writes (defaults to true)', parseBool, true)
    .parse(process.argv);

//check the parameters
if (typeof program.share !== 'string' || typeof program.shareDomain !== 'string' || typeof program.username !== 'string' || typeof program.password !== 'string') {
    console.log('Incorrect parameters');
    program.help();
}
else{
    //the parameters are correct
    console.log('\nInitializing SMB client');
    console.log('Share: %s', program.share);
    console.log('Domain: %s', program.shareDomain);
    console.log('Username: %s', program.username);
    console.log('Password: %s \n', program.password);

    //initialize the smb share config
    smbConfig = {
     share: program.share,
     domain: program.shareDomain,
     username: program.username,
     password: program.password
     };
    //create an smb client instance
    smb2Client = new SMB2(smbConfig);

    //initialize the write buffer
    writeBuffer = createBufferWithDummyData(program.octets);

    console.log('Generating traffic for %d ms', program.time);
    console.log('Perform reads: ' + program.read);
    console.log('Perform writes: ' + program.write + '\n');

    //perform the first write so that there is a file to read from
    if(program.read){
        console.log('Creating a file to read from...');
        smb2Client.writeFile('cifs_data_read.txt', writeBuffer, function (err) {
            if(err){
                throw new Error(err);
            }
            console.log('Read file created.\n');
            initializeTiming(program.time);
            outstandingTasks++;
            generateReadTraffic(generateReadTrafficCallback);
            if(program.write){
                outstandingTasks++;
                generateWriteTraffic(generateWriteTrafficCallback);
            }
        });
    }
    else if(program.write){
        initializeTiming(program.time);
        outstandingTasks++;
        generateWriteTraffic(generateWriteTrafficCallback);
    }
}

function initializeTiming(time){
    //calculate the start and end time
    startTime = new Date().getTime();
    endTime = startTime + time;

    //initialize the ticks
    lastTick = startTime;

    //start the progress bar
    progressBar.tick(0);
}

function generateWriteTraffic(callback){
    smb2Client.writeFile('cifs_data_write.txt', writeBuffer, function (err) {
        if(err){
            throw new Error(err);
        }
        statistics.reads++;
        callback(null, null);
    });
}

function generateReadTraffic(callback){
    smb2Client.readFile('cifs_data_read.txt', {encoding: 'utf8'},function (err, data) {
        if(err){
            throw new Error(err);
        }
        statistics.writes++;
        callback(null, null);
    });
}

function generateWriteTrafficCallback(error, result){
    lastTick = currentTick;
    currentTick = new Date().getTime();
    progressBar.tick(Math.ceil(100 * (currentTick - lastTick)/program.time));
    if(!progressBar.complete){
        generateWriteTraffic(generateWriteTrafficCallback);
    }
    else{
        outstandingTasks--;
        if (outstandingTasks === 0) {
            console.log('\nTraffic generation complete\n');
            //write out the statistics
            printStatistics();
            //close the connection
            smb2Client.close();
        }
    }
}

function generateReadTrafficCallback(error, result){
    lastTick = currentTick;
    currentTick = new Date().getTime();
    progressBar.tick(Math.ceil(100 * (currentTick - lastTick)/program.time));
    if(!progressBar.complete){
        generateReadTraffic(generateReadTrafficCallback);
    }
    else {
        outstandingTasks--;
        if (outstandingTasks === 0) {
            console.log('\nTraffic generation complete\n');
            //write out the statistics
            printStatistics();
            //close the connection
            smb2Client.close();
        }
    }
}

/**
 * Creates a buffer of the specified size with dummy data in it
 * @param octets
 * @returns {Buffer}
 */
function createBufferWithDummyData(octets){
    //dummy data to insert into the buffer
    var writeData = 'I will not do bad things';
    console.log('Creating a buffer (%d octets)...\n', program.octets);
    var buffer = new Buffer(octets);
    //fill the buffer with data
    for(var i = 0; i < octets/writeData.length; i++){
        buffer.write(writeData, i * writeData.length);
    }
    return buffer;
}

function printStatistics(){
    //TODO fix multi-callback issue
    if(!statisticsPrinted){
        console.log('\n---Statistics---');
        var duration = new Date().getTime() - startTime;
        if(statistics.reads > 0){
            console.log('Reads: %d', statistics.reads);
            console.log('Reads/s: %d', (statistics.reads)/(duration/1000));
            console.log('Read bps: %d\n', (statistics.reads * writeBuffer.length)/(duration/1000))
        }
        if(statistics.writes > 0){
            console.log('Writes: %d', statistics.reads);
            console.log('Writes/s: %d', (statistics.reads)/(duration/1000));
            console.log('Writes bps: %d\n', (statistics.reads * writeBuffer.length)/(duration/1000))
        }
        statisticsPrinted = true;
    }
}

function parseBool(val){
    if(val === 'true' || val === 't'){
        return true;
    }
    return false;
}