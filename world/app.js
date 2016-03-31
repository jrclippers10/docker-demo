var _ = require('lodash');
var express = require('express');
var morgan = require('morgan')
var dns = require('dns')
var http = require('http');

var config = {
    port: 5001
};
var force_fail = false;
var srvCache = {}
var dependencies = [];
var health = {
    message: "OK",
    force_fail: false,
    dependencies: dependencies
};

var app = express()
app.use(morgan('combined'))

var srvLookup = function(hostname, callback) {
    console.log("Resolving " + hostname)
    var address = _.get(srvCache, hostname)
    if (address) {
        console.log("Hostname: " + hostname + " found in cache")
        callback(null, address)
    } else {
        var lookup = hostname + ".service.consul";
        dns.resolveSrv(lookup, function(err, records) {
            if (err) {
                console.log("Error looking up SRV")
                callback(err);
            } else {
                console.log("SRV records found!")
                srvCache[hostname] = parseDnsRecords(records)
                callback(null, srvCache[hostname])
            }
        });
    }
};

var parseDnsRecords = function (records) {
  return records.map(function(record) {
    return {addr: record.name, port: record.port};
  });
}

var healthCheck = function() {
    if (dependencies.length > 0) {
        setInterval(function() {
            _.each(dependencies, function(d) {
                srvLookup(d.service_name, function(err, results) {
                    if (err) {
                        d.is_healthy = false
                    } else {
                        if (results.length === 0) {
                            d.is_healthy = false; 
                        } else {
                            http.get({
                                host: _.get(results[0], "addr"),
                                port: _.get(results[0], "port"),
                                path: "/health_check"
                            }, function(r) {
                                if (r.statusCode > 300) {
                                    d.is_healthy = false
                                } else {
                                    d.is_healthy = true
                                }
                            });
                        }
                    }
                })
            });
        }, 2000);
    }
};

app.get('/', function(req, res) {
    res.status(204).send();
});

app.get('/world', function(req, res) {
    var world = "world"
    var obj = {
        message: world
    };
    res.status(200).send(obj)
});

app.get('/health_check', function(req, res) {
    var status = 200;
    if (health.force_fail) {
        status = 500
    } else {
        _.each(dependencies, function(d) {
            if (!d.is_healthy && (d.level === "hard")) {
                status = 500
            }    
        })
    }
    health.message = (status > 300) ? "NOT OK" : "OK";
    res.status(status).send(health)
});

app.get('/health_check/force_fail', function(req, res) {
    health.force_fail = true
    res.status(204).send()
});

app.get('/health_check/remove_force_fail', function(req, res) {
    health.force_fail = false
    res.status(204).send()
});

healthCheck();

app.listen(config.port, function () {
  console.log('World app listening on port: ' + config.port);
});
