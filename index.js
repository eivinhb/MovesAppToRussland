var MongoClient = require('mongodb').MongoClient;
var request = require('request');
var moment = require('moment');
var base64 = require('base-64');
var q = require('q');
var _ = require('underscore');
var appConfig = require('./config.json');

var config = {
    token: appConfig.token,
    passord: "Basic " + base64.encode(appConfig.username + ":" + appConfig.passord),
    usernr: appConfig.usernr,
    startmoment: moment([2015, 9, 9]),
    startdato: moment([2015, 9, 9]).format("YYYY-MM-DD"),
    datoer: [],
    mongourl: appConfig.mongourl
};

var current = config.startmoment;
while (!moment().isSame(current, 'day') && moment().isAfter(current)) {
    config.datoer.push(current.format("YYYY-MM-DD"));
    current.add(1, 'days');
}

console.log("Startdato: " + config.startdato);
console.log("Auth: " + config.passord);
console.log("Datoer: " + config.datoer);

MongoClient.connect(config.mongourl, function (err, db) {
    console.log("Connected correctly to server");


    findImportedActivities(db)
        .then(function (data) {
            var datoer = config.datoer;
            _.each(data, function (_id) {
                datoer = _.reject(datoer, function (dato) {
                    return dato === _id._id;
                });
            });
            return datoer;
        })
        .then(function (datoer) {
            var promises = [];

            _.each(datoer, function (dato) {
                promises.push(fetchFromMovesExport(dato));
            });

            return q.all(promises)
        })
        .then(function (moves) {
            var promises = [];

            _.each(moves, function (move) {
                promises.push(insertActivities(db, move))
            });

            return q.all(promises)
        })
        .then(function () {
            return fetchStegForAktivities(db);
        })
        .then(function (docs) {
            var promises = [];

            _.each(docs, function (doc) {
                promises.push(pushToRusslandPaaTvers(doc._id, doc.antallSteg));
            });

            return q.all(promises)
        })
        .then(function (p) {
            console.log(p);
        })
        .then(function () {
            db.close();
        });
});


function fetchFromMovesExport(dato) {
    var pms = q.defer();

    request.post({
            url: 'http://moves-export.herokuapp.com/data',
            form: {
                date: dato.replace(new RegExp('-', 'g'), ''), access_token: config.token
            }
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Fikk data!")
            }
            var json = JSON.parse(body);
            json._id = dato;
            pms.resolve(json);
        }
    );

    return pms.promise;
}

function pushToRusslandPaaTvers(date, skritt) {
    var pms = q.defer();

    var distance = Math.round(skritt / 1.33);
    date = date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2)

    request.post({
            url: 'http://russland.matsemann.com/api/distance/' + config.usernr,
            form: {
                date: date,
                distance: distance
            },
            headers: {
                'Authorization': config.passord
            }},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                body.distance = distance;
                body.skrtt = skritt;
                pms.resolve(body);
            }
        }
    );

    return pms.promise;
}

var findImportedActivities = function (db) {
    var pms = q.defer();
    var collection = db.collection('export');
    collection.find({}, {_id: true}).toArray(
        function (err, result) {
            pms.resolve(result);
        }
    );
    return pms.promise;
};

var insertActivities = function (db, json) {
    var pms = q.defer();

    var collection = db.collection('export');
    collection.insert(json, function () {
        pms.resolve();
    });

    return pms.promise;
};

var fetchStegForAktivities = function (db) {
    var pms = q.defer();

    var collection = db.collection('export');
    collection.aggregate([
        { $unwind: "$data" },
        { $unwind: "$data.segments" },
        { $unwind: "$data.segments.activities" },
        {$group: {_id: "$data.date", antallSteg: {$sum: "$data.segments.activities.steps"}}}
    ]).toArray(function (err, result) {
        pms.resolve(result);
    });
    return pms.promise;
};