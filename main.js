const { scrapData, filterBadAddresses } = require("./scrap");
const { io } = require("./io");

const UPDATE = "update";
const RESTART = "restart";
const CONNECTION = "connection";
const START = "start";
const DOWNLOAD = "download";

const progress = {
    "departments": {
        "max": 0,
        "current": 0
    },
    "mairies": {
        "max": 0,
        "current": 0
    },
    "errors": {
        "current": 0,
        "stacktrace": ""
    }
}

const restartProgress = () => {
    progress["departments"]["current"] = 0;
    progress["departments"]["max"] = 0;
    progress["mairies"]["current"] = 0;
    progress["mairies"]["max"] = 0;
    progress["errors"]["current"] = 0;
    progress["mairies"]["stacktrace"] = "";
};

const mairiesJson = [];

let isStopped = true;
const updateStopped = () => isStopped = !isStopped;

io.on(CONNECTION, socket => {
    socket.emit(UPDATE, progress);
    socket.on(START, _ => {
        updateStopped();
        start().catch(error => {
            console.log(error);
        });
    });
    socket.on(DOWNLOAD, _ => {
        const mairies = JSON.stringify(mairiesJson, null, 4);
        socket.emit(DOWNLOAD, mairies);
    });
    socket.on(RESTART, _ => restartProgress());
});


// Main
const start = async () => {
    if (isStopped) return;
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

    const departementsHrefs = await scrapData(
        addressesUrl,
        departmentsRegex
    );

    const departmentsLinks = filterBadAddresses(departementsHrefs);

    progress["departments"]["max"] = departmentsLinks.length;
    progress["departments"]["current"] = 1;
    progress["mairies"]["current"] = 1;

    for (;progress["departments"]["current"] <= progress["departments"]["max"];) {
        try {
            const departmentParameter = departmentsLinks[progress["departments"]["current"]];
            const mairiesHrefs = await scrapData(
                addressesUrl + departmentParameter,
                mairiesRegex
            );

            const mairiesLinks = filterBadAddresses(mairiesHrefs);

            progress["mairies"]["max"] = mairiesLinks.length;

            for (;progress["mairies"]["current"] <= progress["mairies"]["max"];) {
                if (isStopped) return;
                try {
                    const mairieParameter = mairiesLinks[progress["mairies"]["current"]];
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
                    const mail = mailHtml && mailHtml.length > 0 ? mailHtml[0].substring(8, mailHtml[0].length - 1): null;

                    const siteHtml = coordonneesHtml ? coordonneesHtml[0].match(siteRegex): null;
                    const site = siteHtml && siteHtml.length > 0 ? siteHtml[0].substring(8, siteHtml[0].length - 1): null;

                    const elus = [];
                    for (const index in elusNameHtml) {
                        const eluHtml = elusNameHtml[index];
                        const elu = eluHtml.substring(4, eluHtml.length - 5);
                        elus.push(elu);
                    }
                    const mairieJson = {
                        "name": mairie ? mairie: "inconnu",
                        "url" : url ? url: "inconnu",
                        "mail": mail ? mail: "inconnu",
                        "site": site ? site: "inconnu",
                        "elus": elus ? elus:  []
                    }
                    mairiesJson.push(mairieJson)
                } catch (error) {
                    console.log(error);
                    progress["errors"]["stacktrace"] = error;
                    progress["errors"]["current"]++;
                }
                progress["mairies"]["current"]++;
                io.emit(UPDATE, progress);
            }
        } catch (error) {
            console.log(error);
            progress["errors"]["stacktrace"] = error;
            progress["errors"]["current"]++;
        }
        progress["mairies"]["current"] = 0;
        progress["departments"]["current"]++;
    }
};
