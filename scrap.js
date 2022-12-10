const https = require('https');

module.exports.scrapData = (url, regex) => new Promise(resolve => {
    let request = https.request(url, res => {
        var data = '';
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

module.exports.filterBadAddresses = (addresses) => {
    const links = [];
    for (index in addresses) {
        address = addresses[index];
        if (!address.includes("https") && address.length > 8)
            links.push(address.substring(6, address.length - 1));
    }
    return links;
};