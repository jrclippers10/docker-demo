var _ = require('lodash');
var express = require('express');
var morgan = require('morgan');
var dns = require('dns');
var http = require('http');

var force_fail = false;
var config = {
    port: 5000
};

var srvCache = {
    'world': [{
        addr: "192.168.99.100",
        port: 5001
    }]
}

var dependencies = [
    {
        name: "World Demo",
        service_name: "world",
        level: "hard",
        is_healthy: true
    },
    // {
    //     name: "Non-Existant App",
    //     service_name: "nea",
    //     level: "soft",
    //     is_healthy: true
    // },
];

var health = {
    name: "Hello Demo",
    service_name: "hello",
    message: "OK",
    is_healthy: true,
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
                console.log("Error looking up SRV", err)
                callback(err);
            } else {
                console.log("SRV records found!")
                srvCache[hostname] = parseDnsRecords(records)
                console.log(srvCache[hostname])
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
                        setServiceUnhealthy(d)
                    } else {
                        if (results.length === 0) {
                            setServiceUnhealthy(d)
                        } else {
                            reqobj = {
                                host: _.get(results[0], "addr"),
                                port: _.get(results[0], "port"),
                                path: "/health_check"
                            }
                            console.log("making request", reqobj);
                            http.get(reqobj, function(r) {
                                r.on('end', function() {
                                    console.log(r)
                                    if (r.statusCode > 300) {
                                        setServiceUnhealthy(d)
                                    } else {
                                        d.is_healthy = true
                                    }
                                });
                            }).on('error', function(err) {
                                console.error("Error...please dont die", err);
                                setServiceUnhealthy(d)
                            });
                        }
                    }
                })
            });
        }, 2000);
    }
};

var setServiceUnhealthy = function(service) {
    service.is_healthy = false;
    if (_.get(srvCache, service.service_name)) delete srvCache[service.service_name];
};

app.get('/', function(req, res) {
    res.status(204).send();
});

app.get('/hello', function(req, res) {
    var hello = "hello"
    var obj = {
        message: hello
    };
    res.status(200).send(obj)
});

app.get('/hello/world', function(req, res) {
    var hello = "hello"
    // make request to world /world
    srvLookup("world", function(err, results) {
        if (err) {
            res.status(500).send()
        } else {
            if (results.length === 0) {
                res.status(500).send()
            } else {
                http.get({
                    host: _.get(results[0], "addr"),
                    port: _.get(results[0], "port"),
                    path: "/world"
                }, function(r) {
                    var chunk = ""
                    r.on('data', function(a) {
                        chunk += a;
                    });
                    r.on('end', function() {
                        if (r.statusCode > 300) {
                            res.status(500).send()
                        } else {
                            var robj = JSON.parse(chunk);
                            var obj = {
                                message: hello + " " + robj.message
                            };
                            res.status(200).send(obj)
                        }
                    });
                });
            }
        }
    });
});

app.get('/health_check', function(req, res) {
    var status;
    if (health.force_fail) {
        health.is_healthy = false;
    } else {
        _.each(dependencies, function(d) {
            if (!d.is_healthy && (d.level === "hard")) {
                health.is_healthy = false;
            }    
        })
    }
    health.message = (health.is_healthy) ? "OK" : "NOT OK";
    status = (health.is_healthy) ? 200 : 500;
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
  console.log('Hello app listening on port: ' + config.port);
});
