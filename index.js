var Service, Characteristic;
var exec = require('child_process').execFile;
var cputemp, dhtExec;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-dht", "Dht", DhtAccessory);
}


function DhtAccessory(log, config) {
    this.log = log;

    this.config = config;
    this.name = config["name"];
    this.service = config["service"];

    dhtExec = config.dhtExec || "dht22";
    cputemp = config.cputemp || "cputemp";
    var that = this;
}

DhtAccessory.prototype = {

    getDHTTemperature: function(callback) {
        exec(dhtExec, function(error, responseBody, stderr) {
            if (error !== null) {
                this.log('dhtExec function failed: ' + error);
                callback(error);
            } else {
                // dht22 output format - gives a 3 in the first column when it has troubles
                // 0 24.8 C 50.3 %
                var result = responseBody.toString().split(/[ \t]+/);
                var temperature = parseFloat(result[1]);
                var humidity = parseFloat(result[3]);
                //                this.humidity = humidity;
                this.log("Got status of %s", result[0]);
                this.log("Got Temperature of %s", temperature);
                this.log("Got humidity of %s", humidity);

                if (parseInt(result[0]) !== 0) {
                    this.log.error("Error: dht22 read failed with status %s", result[0]);
                    callback(new Error("dht22 read failed"));
                } else {
                    this.service.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                    callback(null, temperature);
                }
            }
        }.bind(this));
    },

    getTemperature: function(callback) {
        exec(cputemp, function(error, responseBody, stderr) {
            if (error !== null) {
                this.log('cputemp function failed: ' + error);
                callback(error);
            } else {
                var binaryState = parseFloat(responseBody);
                this.log("Got Temperature of %s", binaryState);

                callback(null, binaryState);
            }
        }.bind(this));
    },


    identify: function(callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function() {

        var that = this;

        this.log("INIT: %s", this.name);

        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "AOSONG")
            .setCharacteristic(Characteristic.Model, this.service)
            .setCharacteristic(Characteristic.SerialNumber, this.device);

        switch (this.service) {

            case "Temperature":
                this.temperatureService = new Service.TemperatureSensor(this.name);
                this.temperatureService
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getTemperature.bind(this));

                return [informationService, this.temperatureService];
            case "dht22":
                this.service = new Service.TemperatureSensor(this.name);
                this.service
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getDHTTemperature.bind(this));

                this.service
                    .addCharacteristic(Characteristic.CurrentRelativeHumidity);


                return [informationService, this.service];

        }
    }
};