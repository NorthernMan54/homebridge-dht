# homebridge-dht

Supports integration of a DHT11/DHT21/DHT22/DHT33/DHT44 Temperature/Humidity
Sensor into hombridge via the pigpio library on a Raspberry PI.   I have tried
numerous other interface methods for the DHT22, and found that this was least
problematic.  Also includes reporting of the RaspBerry PI CPU Temperature.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install the pigpiod library via these commands
    sudo apt-get update
    sudo apt-get install pigpio python-pigpio python3-pigpio
3. Download the DHT22 Sample program from here
    http://abyz.co.uk/rpi/pigpio/code/DHTXXD.zip
4. Apply this patch to test_DHTXXD.  This adds units to the response, and adds
   an error when pigpiod is not running.

```
diff test_DHTXXD.c orig/test_DHTXXD.c
128c128
<    printf("%d %.1f C %.1f %%\n", r.status, r.temperature, r.humidity);
---
>    printf("%d %.1f %.1f\n", r.status, r.temperature, r.humidity);
158,160d157
<    } else {
< 	fprintf(stderr, "ERROR: pigpiod not running\n");
< 	return 1;
```

5. Compile with this command

```
gcc -Wall -pthread -o DHTXXD test_DHTXXD.c DHTXXD.c -lpigpiod_if2
```

6. Copy DHTXXD to /usr/local/bin/dht22, and make executable.
7. Follow one of the numerous guides to wire up a DHT22 to a Raspberry PI.
   Default GPIO pin to connect to is GPIO4
8. Install homebridge-dht using: npm install -g homebridge-dht
9. Create a file in /usr/local/bin/cputemp containing

```
#!/bin/bash
cpuTemp0=$(cat /sys/class/thermal/thermal_zone0/temp)
cpuTemp1=$(($cpuTemp0/1000))
cpuTemp2=$(($cpuTemp0/100))
cpuTempM=$(($cpuTemp2 % $cpuTemp1))

echo $cpuTemp1" C"
#echo GPU $(/opt/vc/bin/vcgencmd measure_temp)
```

10. Update your configuration file. See sample-config.json in this repository for a sample.


# Configuration

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
	    { "accessory":          "Dht",
	      "name":               "cputemp",
	      "service":		"Temperature" },
	    { "accessory":          "Dht",
        "name":               "Temp/Humidity Sensor",
        "service":            "dht22" }
	]


}
```

# ToDo

Stop using the external program call, and call the pigpio library directly using
npm module instead.
