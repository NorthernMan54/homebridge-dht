# homebridge-dht

Supports integration of a DHT11/DHT21/DHT22/DHT33/DHT44 Temperature/Humidity
Sensor into hombridge via the pigpio library on a Raspberry PI.   I have tried
numerous other interface methods for the DHT22, and found that this was least
problematic.  Also includes optional reporting of the RaspBerry PI CPU Temperature.
This latest version splits the temperature and humidity into separate sensors, so
they are readable from the home screen icon.

Also support use of multiple DHT22's, see config.json fragment.

# Installation

For detailed installation instructions, please see the instructable at http://www.instructables.com/id/RPIHomeBridge-TemperatureHumidity-Sensor/

# Configuration - with RPI cpu temperature sensor, requires cputemp program ( Optional )

```
{
    "bridge": {
        "name": "Penny",
        "username": "CC:22:3D:E3:CD:33",
        "port": 51826,
        "pin": "031-45-154"
    },

    "description": "HomeBridge Heyu Status Control",

 "platforms": [],

   "accessories": [
	{ "accessory":        "Dht",
	 "name":               "cputemp",
	  "service":            "Temperature" },
	{ "accessory":        "Dht",
          "name": "dht22",
    	  "name_temperature": "Temperature",
          "name_humidity": "Humdity",
          "service":            "dht22" }
	]
}
```
# Configuration - without cputemp
```
{
    "bridge": {
        "name": "Penny",
        "username": "CC:22:3D:E3:CD:33",
        "port": 51826,
        "pin": "031-45-154"
    },

    "description": "HomeBridge Heyu Status Control",

 "platforms": [],

   "accessories": [
	{ "accessory":        "Dht",
        "name":               "Temp/Humidity Sensor",
        "service":            "dht22" }
	]
}
```
# or with multiple DHT22's
```
{ "accessory":   "Dht",
  "name":        "dht22 - indoor",
  "name_temperature": "Indoor Temperature",
  "name_humidity": "Indoor Humdity",
  "gpio":        "4",       
  "service":     "dht22" },
{ "accessory":   "Dht",
  "name":        "dht22 - outdoor",
  "name_temperature": "Outdoor Temperature",
  "name_humidity": "Outdoor Humdity",
  "gpio":        "2",   
  "service":     "dht22" }

```
# or with unique names for temperature and humidity

```
{
    "accessory": "Dht",
    "name": "dht22",
    "name_temperature": "Temperature",
    "name_humidity": "Humdity",
    "service": "dht22"
}
```
# Configuration Options

Optional parameters includes

* `dhtExec` - Full command including path to read dht22 sensor.  Not needed
unless dht22 is installed in a location not on the path.  Defaults to dht22
ie "dhtExec": "/usr/local/bin/dht22"

* `cputemp` - Full command including path to read cpu temp sensor.  Not needed
unless cputemp is installed in a location not on the path.  Defaults to cputemp
ie "cputemp": "/usr/local/bin/cputemp"

* `gpio` - Gpio pin to read for dht22 sensor.  Defaults to 4
ie "gpio": "4"

* `name`: descriptive name
* `name_temperature` (optional): descriptive name for the temperature sensor
* `name_humidity` (optional): descriptive name for the humidity sensor

# Optional cputemp script - install in /usr/local/bin
```
#!/bin/bash
cpuTemp0=$(cat /sys/class/thermal/thermal_zone0/temp)
cpuTemp1=$(($cpuTemp0/1000))
cpuTemp2=$(($cpuTemp0/100))
cpuTempM=$(($cpuTemp2 % $cpuTemp1))

echo $cpuTemp1" C"
#echo GPU $(/opt/vc/bin/vcgencmd measure_temp)
```
# ToDo

Stop using the external program call, and call the pigpio library directly using
npm module instead.

# Credits

rxseger - separate humidity sensor
hector305 - Multiple sensor testing
