const https = require('https');

module.exports.scrapData = (url, regex) => new Promise(resolve => {
    let request = https.request(url, res => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            const reLink = regex;
            const hrefs = data.match(reLink);
            resolve(hrefs);
        });
    });

    request.on("error", error => {
        console.log(error);
        resolve([]);
    });

    request.end();
});