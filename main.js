const https = require('https');
const fs = require('fs');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const scrapData = (url, regex) => new Promise(resolve => {
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

const filterBadAddresses = (addresses) => {
    const links = [];
    for (index in addresses) {
        address = addresses[index];
        if (!address.includes("https") && address.length > 8)
            links.push(address.substring(6, address.length - 1));
    }
    return links;
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(8081, () => {
    console.log('listening on *:8081');
});

// Main
(async () => {
    const addressesUrl = "https://www.adresses-mairies.fr";
    const departmentsRegex = /href=(["'])\/departement-(.*?)\1/gm;
    const mairiesRegex = /href=(["'])\/mairie-(.*?)\1/gm;
    const allRegex = /[^]*/gm;
    const elusRegex = /<ul class="liste_elus">.*<\/ul>/gm;
    const listRegex = /<li>([^<]*)<\/li>/gm;
    const mairieRegex = /<h2>Maire.*<\/h2>/gm;
    const coordonneesRegex = /<ul class="coordonnees">.*<\/ul>/gm
    const mailRegex = /"mailto(.*?)"/gm;
    const siteRegex = /"http(.*?)"/gm;

    const mairiesJson = [];

    const departementsHrefs = await scrapData(
        addressesUrl,
        departmentsRegex
    );

    const departmentsLinks = filterBadAddresses(departementsHrefs);

    const departmentsTotal = departmentsLinks.length;
    let departmentsIndex = 0;
    let errors = 0;
    for (index in departmentsLinks) {
        try {
            const departmentParameter = departmentsLinks[index];
            const mairiesHrefs = await scrapData(
                addressesUrl + departmentParameter,
                mairiesRegex
            );

            const mairiesLinks = filterBadAddresses(mairiesHrefs);

            const mairiesTotal = mairiesLinks.length;
            let mairiesIndex = 0;

            departmentsIndex++;

            for (index in mairiesLinks) {
                let errorOn = "";
                try {
                    const mairieParameter = mairiesLinks[index];
                    const url = addressesUrl + mairieParameter;

                    const mairieHtml = await scrapData(
                        url,
                        allRegex
                    );

                    const elusHtml = mairieHtml[0].match(elusRegex);
                    const elusNameHtml = elusHtml ? elusHtml[0].match(listRegex): null;

                    const mairieNameHtml = mairieHtml[0].match(mairieRegex)[0];
                    const mairie = mairieNameHtml.length > 4 ? mairieNameHtml.substring(4, mairieNameHtml.length - 5): null;

                    const coordonneesHtml = mairieHtml[0].match(coordonneesRegex);
                    
                    const mailHtml = coordonneesHtml ? coordonneesHtml[0].match(mailRegex): null;
                    const mail = mailHtml && mailHtml.length > 8 ? mailHtml[0].substring(8, mailHtml[0].length - 1): null;

                    const siteHtml = coordonneesHtml ? coordonneesHtml[0].match(siteRegex): null;
                    const site = siteHtml && siteHtml.length > 8 ? siteHtml[0].substring(8, siteHtml[0].length - 1): null;

                    const elus = [];
                    for (index in elusNameHtml) {
                        eluHtml = elusNameHtml[index];
                        const elu = eluHtml.substring(4, eluHtml.length - 5);
                        elus.push(elu);
                    }
                    mairieJson = {
                        "name": mairie ? mairie: "inconnu",
                        "url" : url ? url: "inconnu",
                        "mail": mail ? mail: "inconnu",
                        "site": site ? site: "inconnu",
                        "elus": elus ? elus:  []
                    }
                    mairiesJson.push(mairieJson)
                } catch (error) {
                    console.log(errorOn);
                    console.log(error);
                    errors++;
                }

                io.emit('departments', "Departments: " + departmentsIndex + "/" + departmentsTotal);
                io.emit('mairies', "Mairies: " + ++mairiesIndex + "/" + mairiesTotal);
                io.emit('errors', "Failures: " + errors);
            }
        } catch (error) {
            console.log(error);
            errors++;
        }
    }

    fs.writeFileSync("mairies.json", JSON.stringify(mairiesJson, null, 4));
})();

