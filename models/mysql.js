const mysql = require('mysql2');
const config = require('../config/config');
var Q = require('q');

function mySQL(){

}

module.exports = mySQL;

mySQL.prototype = {
    init: function(){
      console.log("initialized");
    },
    connect: function() {
        let deferred = Q.defer();
        const conn = new mysql.createConnection(config.mysql);
        conn.connect(
            function (err) {
            if (err) {
                deferred.reject(err);
            }
            else {
                deferred.resolve(conn);
            }
        });
        return deferred.promise
    },
    queryDatabase: function ( conn ) {
        conn.query(`DROP TABLE IF EXISTS ${config.mysql.database};`, function (err, results, fields) { 
             if (err) throw err; 
             console.log('Dropped changeTokens table if existed.');
         })
        conn.query(`CREATE TABLE ${config.mysql.database} 
        ( 
            id serial PRIMARY KEY, 
            listId VARCHAR(60), 
            subscriptionId VARCHAR(100), 
            changeToken VARCHAR(150), 
            siteURL VARCHAR(100), 
            expirationDateTime TIMESTAMP NOT NULL
        );`, 
             function (err, results, fields) {
                 if (err) throw err;
             console.log(`Created ${config.mysql.database} table.`);
         })
        //just in case we end up with a bunch of rows, creating an index for the field we will be querying is a good idea
        conn.query(`CREATE UNIQUE INDEX subscriptions ON ${config.mysql.database} (subscriptionID)`, 
             function (err, results, fields) {
                 if (err) throw err;
             console.log(`Created unique index on subscriptions for ${config.mysql.database} table.`);
         })
        conn.end(function (err) { 
         if (err) throw err;
         else  console.log('Done.') 
         });
    },
    readData: function ( conn, subscriptionID ) {
        let deferred = Q.defer();
        conn.query(`SELECT * FROM ${config.mysql.database} WHERE subscriptionId = '${subscriptionID}'`,
            function (err, results, fields) {
                if (err) {
                    deferred.reject(err);
                }  else {
                    deferred.resolve(results);
                }
            })
       conn.end(
           function (err) { 
            if (err) {
                deferred.reject(err);
            }  else {
                console.log('Closing connection.');
            }
        });
        return deferred.promise;
    },
    readAllData: function ( conn ){
        let deferred = Q.defer();
        conn.query(`SELECT * FROM ${config.mysql.database}`,
            function (err, results, fields) {
                if (err) {
                    deferred.reject(err);
                }  else {
                    deferred.resolve(results);
                }
            })
       conn.end(
           function (err) { 
            if (err) {
                deferred.reject(err);
            }  else {
                console.log('Closing connection.') 
            }
        });
        return deferred.promise;
    },
    updateChangeToken: function( conn, changetoken, listID, subscriptionID ) {
        let deferred = Q.defer();
        conn.query(`UPDATE ${config.mysql.database} SET changeToken = '${changetoken}' WHERE subscriptionId = '${subscriptionID}'`,
            function (err, results, fields) {
                if (err) {
                    deferred.reject(err);
                }  else {
                    deferred.resolve(results);
                }
            })
       conn.end(
           function (err) { 
            if (err) {
                deferred.reject(err);
            }  else {
                console.log('Closing connection.') 
            }
        });
        return deferred.promise;
    },
    newChangeToken: function( conn, changetoken, listID, subscriptionID, siteURL, expiration) {
        let deferred = Q.defer();
        //console.log(`INSERT INTO ${config.mysql.database} (listId, subscriptionId, changeToken, siteURL, expirationDateTime) VALUES ('${listID}','${subscriptionID}','${changetoken}','${siteURL}', '${expiration}');`);
        conn.query(`INSERT INTO ${config.mysql.database} (listId, subscriptionId, changeToken, siteURL, expirationDateTime) VALUES ('${listID}','${subscriptionID}','${changetoken}','${siteURL}', '${expiration}');`, 
            function (err, results, fields) {
                if (err) {
                    deferred.reject(err);
                }  else {
                    deferred.resolve(results);
                }
        })
        conn.end( function (err) { 
            if (err) {
                deferred.reject(err);
            }  else {
                console.log('Closing connection.') 
            }
        });
        return deferred.promise;
    }
}