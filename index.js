// Homebridge plugin to reading DHT22 Sensor on a Raspberry PI.  Assumes DHT22
// is connected to GPIO 4 by default.

// Uses pigpio library to access gpio pin, and a custom program dht22 read the sensor.

//"accessories": [{
//    "accessory": "Dht",
//    "name": "cputemp",
//    "service": "Temperature"
//}, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor",
//    "service": "dht22"
//}]
//
// or Multiple
//
//"accessories": [{
//    "accessory": "Dht",
//    "name": "cputemp",
//    "service": "Temperature"
//}, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor - Indoor",
//    "service": "dht22",
//    "gpio": "4"
//}, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor - Outdoor",
//    "service": "dht22",
//    "gpio": "5"
//}]




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
    this.name = config.name;
    this.service = config.service;
    this.gpio = config.gpio || "4";

    dhtExec = config.dhtExec || "dht22";
    cputemp = config.cputemp || "cputemp";

}

DhtAccessory.prototype = {

    getDHTTemperature: function(callback) {
        exec(dhtExec, ['-g', this.gpio], function(error, responseBody, stderr) {
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
                    .setProps({
                        minValue: -100,
                        maxValue: 100
                    })
                    .on('get', this.getTemperature.bind(this));

                return [informationService, this.temperatureService];
            case "dht22":
                this.service = new Service.TemperatureSensor(this.name);
                this.service
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .setProps({
                        minValue: -100,
                        maxValue: 100
                    })
                    .on('get', this.getDHTTemperature.bind(this));

                this.service
                    .addCharacteristic(Characteristic.CurrentRelativeHumidity);


                return [informationService, this.service];

        }
    }
};
