const { EventEmitter } = require('events');
const { execFile } = require('child_process');
const registerPlugin = require('../src');

jest.mock('child_process', () => ({ execFile: jest.fn() }));
jest.mock('node-dht-sensor', () => ({}));
jest.mock('mcuiot-logger', () => ({}));
jest.mock('fakegato-history', () => () => {});

describe('Temperature service polling', () => {
  let Accessory, characteristic, log;

  beforeEach(() => {
    jest.useFakeTimers();
    execFile.mockReset();
    execFile.mockImplementation((command, callback) => callback(null, '27.8 C\n'));
    log = Object.assign(jest.fn(), { error: jest.fn() });
    characteristic = new EventEmitter();
    characteristic.setProps = jest.fn().mockReturnThis();
    characteristic.updateValue = jest.fn(value => {
      characteristic.value = value;
      return characteristic;
    });

    registerPlugin({
      hap: {
        Service: {
          TemperatureSensor: jest.fn().mockImplementation(() => ({
            getCharacteristic: () => characteristic
          }))
        },
        Characteristic: { CurrentTemperature: 'CurrentTemperature' }
      },
      registerAccessory: (plugin, name, constructor) => { Accessory = constructor; }
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function start(config = { refresh: 300 }) {
    new Accessory(log, {
      name: 'Test temperature',
      service: 'Temperature',
      cputemp: '/test/cputemp',
      ...config
    }).setupTemperatureService();
  }

  // Model HAP's GET behavior: invoke a registered handler or return the cache.
  function readTemperature() {
    return new Promise((resolve, reject) => {
      const callback = (error, value) => error ? reject(error) : resolve(value);
      if (!characteristic.emit('get', callback)) {
        callback(characteristic.value instanceof Error ? characteristic.value : null, characteristic.value);
      }
    });
  }

  test('reads immediately and publishes asynchronous command results', async () => {
    execFile.mockImplementation(() => {});
    start();

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith('/test/cputemp', expect.any(Function));
    execFile.mock.calls[0][1](null, '27.8 C\n');
    await expect(readTemperature()).resolves.toBe(27.8);

    jest.advanceTimersByTime(300000);
    expect(execFile).toHaveBeenCalledTimes(2);
    await expect(readTemperature()).resolves.toBe(27.8);
    execFile.mock.calls[1][1](null, '28.1 C\n');
    await expect(readTemperature()).resolves.toBe(28.1);
    expect(execFile).toHaveBeenCalledTimes(2);
  });

  test('serves repeated HomeKit reads without additional commands or logs', async () => {
    start();
    log.mockClear();

    const readings = await Promise.all(Array.from({ length: 50 }, readTemperature));

    expect(readings).toEqual(Array(50).fill(27.8));
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  test.each([
    [300, 300000],
    ['300', 300000],
    [undefined, 60000]
  ])('with refresh %p, waits %i ms between polls', (refresh, interval) => {
    start({ refresh });
    expect(execFile).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(interval - 1);
    expect(execFile).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(execFile).toHaveBeenCalledTimes(2);
  });

  test('publishes errors and recovers on the next poll, including zero degrees', async () => {
    const error = new Error('sensor unavailable');
    execFile
      .mockImplementationOnce((command, callback) => callback(error))
      .mockImplementation((command, callback) => callback(null, '0.0 C\n'));
    start();

    expect(characteristic.updateValue).toHaveBeenLastCalledWith(error);
    await expect(readTemperature()).rejects.toBe(error);
    expect(execFile).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300000);
    await expect(readTemperature()).resolves.toBe(0);
    expect(characteristic.updateValue).toHaveBeenLastCalledWith(0);
    expect(execFile).toHaveBeenCalledTimes(2);
  });
});
