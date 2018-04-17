var config = {}

config.spUserName = "admin@contoso.onmicrosoft.com";
config.spPassword = "SharePoint PW";
config.spSite = "https://contoso.sharepoint.com";
config.spList = "Project information";
config.mysql = {
    host: 'yourmysqlhostnamegoeshere.mysql.database.azure.com',
    user: 'themysqladminaccount@goeshere',
    password: 'yoursupersecretmysqlPWgoeshere',
    database: 'yourDBnamegoeshere',
    port: 3306,
    ssl: true
};

module.exports = config;