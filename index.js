// Homebridge plugin to reading DHT22 Sensor on a Raspberry PI.  Assumes DHT22
// is connected to GPIO 4 by default.

// Uses pigpio library to access gpio pin, and a custom program dht22 read the sensor.

// "accessories": [{
//    "accessory": "Dht",
//    "name": "cputemp",
//    "service": "Temperature"
// }, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor",
//    "service": "dht22"
// }, {        // For testing
//    "accessory": "Dht",
//    "name": "Test-DHT",
//    "service": "dht22",
//    "dhtExec": "Code/homebridge-dht/test/dht22"
// }]
//
// or Multiple
//
// "accessories": [{
//    "accessory": "Dht",
//    "name": "cputemp",
//    "service": "Temperature"
// }, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor - Indoor",
//    "service": "dht22",
//    "gpio": "4"
// }, {
//    "accessory": "Dht",
//    "name": "Temp/Humidity Sensor - Outdoor",
//    "service": "dht22",
//    "gpio": "5"
// }]

var Service, Characteristic, FakeGatoHistoryService;
var sensor = require('node-dht-sensor');
var exec = require('child_process').execFile;
var cputemp;
// var debug = require('debug')('DHT');
var Logger = require("mcuiot-logger").logger;
const moment = require('moment');
var os = require("os");
var hostname = os.hostname();

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  FakeGatoHistoryService = require('fakegato-history')(homebridge);
  homebridge.registerAccessory("homebridge-dht", "Dht", DhtAccessory);
};

function DhtAccessory(log, config) {
  this.log = log;
  this.log("Adding Accessory");
  this.config = config;
  this.name = config.name;
  this.name_temperature = config.name_temperature || config.name;
  this.name_humidity = config.name_humidity || config.name;
  this.service = config.service || "dht22";
  this.gpio = config.gpio || "4";
  this.refresh = config.refresh || "60"; // Every minute
  this.storage = config['storage'] || "fs";

  this.type = parseInt(this.service.replace(/\D/g, ""));

  // dhtExec = config.dhtExec || "dht22";
  cputemp = config.cputemp || "cputemp";

  this.log_event_counter = 59;
  this.spreadsheetId = config['spreadsheetId'];
  if (this.spreadsheetId) {
    this.logger = new Logger(this.spreadsheetId);
  }
}

DhtAccessory.prototype = {

  getDHTTemperature: function(callback) {
    sensor.read(this.type, this.gpio, function(err, temperature, humidity) {
      if (!err) {
        this.log("DHT Status: %s, Temperature: %s°C, Humidity: %s%", 0, roundInt(temperature), roundInt(humidity));
        this.log_event_counter = this.log_event_counter + 1;
        if (this.log_event_counter > 59) {
          if (this.spreadsheetId) {
            this.logger.storeDHT(this.name, 0, roundInt(temperature), roundInt(humidity));
          }
          this.log_event_counter = 0;
        }

        this.loggingService.addEntry({
          time: moment().unix(),
          temp: roundInt(temperature),
          humidity: roundInt(humidity)
        });

        this.humidityService
          .getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(roundInt(humidity));
        callback(err, roundInt(temperature));
      } else {
        this.log.error("Error:", err);
        callback(err);
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
      .setCharacteristic(Characteristic.Manufacturer, "dht22")
      .setCharacteristic(Characteristic.Model, this.service)
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

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

        setInterval(function() {
          this.getTemperature(function(err, temp) {
            if (err) {
              temp = err;
            }
            this.temperatureService
              .getCharacteristic(Characteristic.CurrentTemperature).updateValue(temp);
          }.bind(this));
        }.bind(this), this.refresh * 1000);

        return [informationService, this.temperatureService];
      case "dht22":
      case "dht11":
        this.dhtService = new Service.TemperatureSensor(this.name_temperature);
        this.dhtService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100
          });

        this.humidityService = new Service.HumiditySensor(this.name_humidity);

        this.dhtService.log = this.log;
        this.loggingService = new FakeGatoHistoryService("weather", this.dhtService, {
          storage: this.storage,
          minutes: this.refresh * 10 / 60
        });

        setInterval(function() {
          this.getDHTTemperature(function(err, temp) {
            if (err) {
              temp = err;
            }
            this.dhtService
              .getCharacteristic(Characteristic.CurrentTemperature).updateValue(temp);
          }.bind(this));
        }.bind(this), this.refresh * 1000);

        this.getDHTTemperature(function(err, temp) {
          this.dhtService
            .setCharacteristic(Characteristic.CurrentTemperature, temp);
        }.bind(this));
        return [this.dhtService, informationService, this.humidityService, this.loggingService];
    }
  }
};

function roundInt(string) {
  return Math.round(parseFloat(string) * 10) / 10;
}
