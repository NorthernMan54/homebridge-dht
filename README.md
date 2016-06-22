# homebridge-dht

Supports X10 devices via dht on the HomeBridge Platform. Tested with a CM11A Module connected via a USB Serial adapter.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install homebridge-dht using: npm install -g homebridge-dht
3. Update your configuration file. See sample-config.json in this repository for a sample.
4. Assumes dht is installed in /usr/local/bin/heyu, and already configured and running
5. Homebridge must run under the same id as heyu

# Configuration

```
"accessories": [
  { "accessory":              "Heyu",
        "name":               "All Devices",    // Alias for the allon/alloff command
        "device":             "a",              // House code A
        "on_command":         "allon",          // heyu command
        "off_command":        "alloff",         // heyu command
        "statusHandling":     "no",             // Device does not supply status
        "service":            "Switch"
       },
  { "accessory": "Heyu",
        "name":               "All Lights",
        "device":             "a",
        "on_command":         "lightson",
        "off_command":        "lightsoff",
        "statusHandling":     "no",
        "service":    	      "Switch"
       },
  { "accessory": "Heyu",
        "name":         	    "Front Door Lights",
        "device":             "a1",                   // X10 device
      	"service":        	  "Light",                // Lights may be dimmed
        "dimmable":           "yes"                   // Device is dimmable
       },
        { "accessory": "Heyu",                                                  
        "name":               "Walkway Lights",         
        "device":             "a2",
        "service":            "Switch"        // Switches are not dimmable
       },

    ]
```

# ToDo

Setup monitoring of events from X10 Remotes and 2 way devices
