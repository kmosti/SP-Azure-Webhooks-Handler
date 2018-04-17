var pnp = require('sp-pnp-js');
var NodeFetchClient = require('node-pnp-js').default;
var config = require('../config/config');
var Q = require('q');
var JsomNode = require('sp-jsom-node').JsomNode;
var axios = require("axios");

function spWeb(){

}

module.exports = spWeb;

spWeb.prototype = {
    init: function () {
        pnp.setup({
            sp: {
                fetchClientFactory: () => {
                    let credentials =  {
                        username: config.spUserName,
                        password:  config.spPassword
                    };
                    return new NodeFetchClient(credentials);
                }
            }
        });
    },
    getContext: function ( url ) {
        let deferred = Q.defer();

        let jsomNodeOptions = {
            siteUrl: url,
            authOptions: {
                username: config.spUserName,
                password: config.spPassword
            },
            config: {
                encryptPassword: false
            },
            envCode: "spo"
        };

        (new JsomNode(jsomNodeOptions)).init();

        let ctx = SP.ClientContext.get_current();

        deferred.resolve(ctx);

        return deferred.promise;
    },
    runAzureFunc: function(site) {
        let deferred = Q.defer();
        axios({
            method: 'get',
            url: 'https://<insert url for azure function>',
            params: {
                src: site
            },
            timeout: 500*1000
        }).then( res => {
            deferred.resolve(res);
        }).catch( err => {
            deferred.reject(err);
        });
        return deferred.promise;
    },
    getChangedItem: function ( url, list, changeToken ) {
        let deferred = Q.defer();
        let Web = new pnp.Web(url);

        Web.lists.getById(list).getChanges({
            Item: true,
            Add: true,
            Update: true,
            ChangeTokenStart: changeToken
        }).then( res => {
            deferred.resolve(res);
        }).catch( err => {
            deferred.reject(err);
        });

        return deferred.promise;
    },
    validationTest: function ( url, list, changeToken, srcSite ) {
        let deferred = Q.defer();
        let Web = new pnp.Web(url);

        Web.lists.getById(list).items.add({
            Title: "A webhook was caught for this site",
            result: JSON.stringify(changeToken),
            sourceSite: srcSite
        }).then( res => {
            deferred.resolve(res);
        }).catch( err => {
            deferred.reject(err);
        });

        return deferred.promise;
    },
    newGetChangedItem: function ( url, subscriptionID ) {
        let deferred = Q.defer();
        let Web = new pnp.Web(url);
        let listID = "";

        let now = new Date();
        //set the interval back one hour to catch this first call
        now.setHours(now.getHours() - 1);

        // the number of .net ticks at the unix epoch
        let epochTicks = 621355968000000000;

        // there are 10000 .net ticks per millisecond
        let ticksPerMillisecond = 10000;
        let ticks = epochTicks + (now.getTime() * ticksPerMillisecond);

        Web.lists.select("Title,Id").get().then(result => {
            for ( let list of result ) {
                Web.lists.getById(list.Id).subscriptions.get().then( res => {
                    //console.dir(res);
                    if (res.length > 0) {
                        if (res[0].id == subscriptionID) {
                            listID = list.Id;
                            let changeToken = { "StringValue": "1;3;" + list.Id + ";" + ticks + ";-1" }
                            Web.lists.getById(list.Id).getChanges({
                                Item: true,
                                Add: true,
                                Update: true,
                                ChangeTokenStart: changeToken
                            }).then( res => {
                                let returnedValue = {
                                    listID: listID,
                                    listChanges: res
                                };
                                deferred.resolve(returnedValue);
                            }).catch( err => {
                                deferred.reject(err);
                            });
                        } else {
                            console.dir(res[0].id);
                            console.dir(subscriptionID);
                        }
                    }
                }).catch( err => {
                    deferred.reject(err);
                });
            }
        }).catch( err => {
            deferred.reject(err);
        });

        return deferred.promise;
    }
}