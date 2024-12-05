const sensor = require('node-dht-sensor');
const exec = require('child_process').execFile;
const Logger = require('mcuiot-logger').logger;
const moment = require('moment');
const os = require('os');
const hostname = os.hostname();

let Service, Characteristic, FakeGatoHistoryService;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerAccessory('homebridge-dht', 'Dht', DhtAccessory);
};

class DhtAccessory {
  constructor(log, config) {
    this.log = log;
    this.log('Initializing accessory:', config.name);

    // Destructure configuration with defaults
    const {
      name,
      name_temperature = name,
      name_humidity = name,
      service = 'dht22',
      gpio = '4',
      refresh = 60,
      storage = 'fs',
      cputemp = 'cputemp',
      spreadsheetId
    } = config;

    this.config = config;
    this.name = name;
    this.name_temperature = name_temperature;
    this.name_humidity = name_humidity;
    this.service = service;
    this.gpio = gpio;
    this.refresh = refresh;
    this.storage = storage;
    this.cputemp = cputemp;
    this.type = parseInt(service.replace(/\D/g, ''), 10);
    this.log_event_counter = 0;

    if (spreadsheetId) {
      this.logger = new Logger(spreadsheetId);
    }
  }

  logSensorData(temperature, humidity) {
    this.log(`DHT Status: OK, Temperature: ${temperature}°C, Humidity: ${humidity}%`);

    if (++this.log_event_counter >= 60 && this.logger) {
      this.logger.storeDHT(this.name, 0, temperature, humidity);
      this.log_event_counter = 0;
    }

    this.loggingService.addEntry({
      time: moment().unix(),
      temp: temperature,
      humidity: humidity
    });

    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(humidity);
  }

  getDHTTemperature(callback) {
    sensor.read(this.type, this.gpio, (err, temperature, humidity) => {
      if (err) {
        this.log.error('Error reading DHT sensor:', err);
        return callback(err);
      }

      const roundedTemp = roundInt(temperature);
      const roundedHumidity = roundInt(humidity);
      this.logSensorData(roundedTemp, roundedHumidity);
      callback(null, roundedTemp);
    });
  }

  getCPUTemperature(callback) {
    exec(this.cputemp, (error, stdout) => {
      if (error) {
        this.log.error('Failed to get CPU temperature:', error);
        return callback(error);
      }

      const temp = parseFloat(stdout);
      this.log(`CPU Temperature: ${temp}°C`);
      callback(null, temp);
    });
  }

  identify(callback) {
    this.log('Identify requested!');
    callback();
  }

  createInformationService() {
    return new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, 'dht22')
      .setCharacteristic(Characteristic.Model, this.service)
      .setCharacteristic(Characteristic.SerialNumber, `${hostname}-${this.name}`)
      .setCharacteristic(Characteristic.FirmwareRevision, require('../package.json').version);
  }

  setupTemperatureService() {
    this.temperatureService = new Service.TemperatureSensor(this.name);

    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100, maxValue: 100 })
      .on('get', this.getCPUTemperature.bind(this));

    setInterval(() => {
      this.getCPUTemperature((err, temp) => {
        if (!err) {
          this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .updateValue(temp);
        }
      });
    }, this.refresh * 1000);

    return this.temperatureService;
  }

  setupDHTServices() {
    this.dhtService = new Service.TemperatureSensor(this.name_temperature);
    this.humidityService = new Service.HumiditySensor(this.name_humidity);

    this.loggingService = new FakeGatoHistoryService('weather', this.dhtService, {
      storage: this.storage,
      minutes: (this.refresh * 10) / 60
    });

    setInterval(() => {
      this.getDHTTemperature((err, temp) => {
        if (!err) {
          this.dhtService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .updateValue(temp);
        }
      });
    }, this.refresh * 1000);

    this.getDHTTemperature((err, temp) => {
      if (!err) {
        this.dhtService.setCharacteristic(Characteristic.CurrentTemperature, temp);
      }
    });

    return [this.dhtService, this.humidityService, this.loggingService];
  }

  getServices() {
    this.log('Initializing services for:', this.name);

    const informationService = this.createInformationService();
    if (this.service === 'Temperature') {
      return [informationService, this.setupTemperatureService()];
    }

    return [informationService, ...this.setupDHTServices()];
  }
}

function roundInt(value) {
  return Math.round(parseFloat(value) * 10) / 10;
}
