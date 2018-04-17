'use strict';
var port = process.env.PORT || 1337;
var app = require('express')();
var express = require('express');
var bodyParser = require("body-parser");
var server = require('http').Server(app);
var config = require("./config/config");
var spWeb = require("./models/sharepoint");
const mySQL = require("./models/mysql");

server.listen(port);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// GET method route
app.get('/index', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

//This route, which SHOULD BE REMOVED, serves just to read the data from the mysql db
app.get('/mysql', function (req, res) {
    var sql = new mySQL();
    sql.init();
    sql.connect().then( connection => {
        sql.readAllData( connection ).then( items => {
            if (items) {
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end( JSON.stringify(items) );
            } else {
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end( "No subscription found" )
            }
        }).catch( err => {
            console.error(err);
            res.writeHead(500, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end();
        });
        //sql.queryDatabase(connection);
    }).catch( err => {
        console.error(err);
    });
});

//this just makes resetting the DB easier, REMOVE THIS ONE BEFORE PRODUCTION!
app.get('/reset_mysql', function (req, res) {
    var sql = new mySQL();
    sql.init();
    sql.connect().then( connection => {
        console.log("say the magic word");
        sql.queryDatabase(connection);
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end( "reset!" )
    }).catch( err => {
        console.error(err);
    });
});

// POST method route
app.post('/', function (req, res) {
    if (req.query && req.query.validationtoken) {
        // Validating the webhooks subscription
        console.log('Found validation token: ', req.query.validationtoken);
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(req.query.validationtoken);
    }
    else {
        //handle the webhook(s)
        if (typeof req.body.value !== "undefined" && req.body.value !== null) {
            var data = JSON.stringify(req.body.value);
            console.log(JSON.stringify(req.body.value));
            for (let webhook of req.body.value) {
                getProjectChanges(webhook);
            }
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            });
            res.end();
        }
    }
});

var getProjectChanges = function(webhook) {
    var site = "https://contoso.sharepoint.com" + webhook.siteUrl;

    //initiate sharepoint service
    var getWeb = new spWeb();
    getWeb.init();
    
    //initiate mysql service
    var sql = new mySQL();
    sql.init();

    //initiate sql connection, query for existing subscriptions
    sql.connect().then( connection => {
        sql.readData( connection, webhook.subscriptionId ).then( items => {
            getWeb.getContext(site).then( ctx => {
                //if we got the subscription in the DB, use it
                if (items.length > 0) {
                    console.dir(items[0]);
                    const changetoken = {
                        StringValue: items[0].changeToken
                    };
                    let listID = items[0].listId;
                    //query the list to see what has changed
                    getWeb.getChangedItem( site, listID, changetoken ).then( changes => {
                        console.dir(changes);
                        if (changes.length > 0) {
                            //update the changetoken in the DB
                            sql.connect().then( connection => {
                                for (let change of changes) {
                                    sql.updateChangeToken( connection, change.ChangeToken.StringValue, listID, webhook.subscriptionId).then( updateRes => {
                                        console.dir(updateRes);
                                        getWeb.validationTest( "https://ateara.sharepoint.com/teams/project-1899125", "ff7d7298-40e8-4309-b725-1256558cacd6", change, site ).then( itemAdded => {
                                            console.dir(itemAdded);
                                        }).catch( err => {
                                            console.error(err);
                                        });
                                    }).catch( err => {
                                        console.error(err);
                                    })
                                }
                            }).catch( err => {
                                console.error(err);
                            });
                        } else {
                            console.log("There has been no changes since the last change (probably because you are testing amirite?)");
                        }
                    }).catch( err => {
                        console.error(err);
                    });
                } else {
                    //if no subscription in DB, we must query the list with a new token and store the returned token in the DB
                    getWeb.newGetChangedItem(site, webhook.subscriptionId).then( firstChange => {
                        let newRow = {
                            listID: firstChange.listID,
                            subscriptionID: webhook.subscriptionId,
                            changeToken: firstChange.listChanges[0].ChangeToken.StringValue,
                            siteURL: site,
                            expirationDateTime: webhook.expirationDateTime
                        };
                        sql.connect().then( connection => {
                            sql.newChangeToken( connection, newRow.changeToken, newRow.listID, newRow.subscriptionID, newRow.siteURL, newRow.expirationDateTime).then( newRowResult => {
                                console.log("successfully added new row to DB");
                                console.dir(newRowResult);

                                //OPTIONAL: add a new item to a sample list to show that we did in fact manage to get the change
                                // getWeb.validationTest( "https://contoso.sharepoint.com/teams/project-1899125", "ff7d7298-40e8-4309-b725-1256558cacd6", firstChange.listChanges[0], site ).then( itemAdded => {
                                //     console.dir(itemAdded);
                                // }).catch( err => {
                                //     console.error(err);
                                // });
                            }).catch( err => {
                                console.error(err);
                            });
                        }).catch( err => {
                            console.error(err);
                        });
                    }).catch( err => {
                        console.error(err);
                    });
                }
            });
        }).catch( err => {
            console.dir(err);
        });
    });
}

var initAzureFunc = function(siteUrl) {
    getWeb.runAzureFunc(site).then( result => {
        console.dir(result);
    }).catch( err => {
        console.error(err);
    })
}