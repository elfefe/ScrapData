const { scrapData } = require("./scrap");
const { io } = require("./io");

const UPDATE = "update";
const GET = "get";
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

const dataType = (type, value) => {
    return {
        "type": type,
        "value": value
    }
};

const departmentsJson = {};

const restartProgress = () => {
    progress["departments"]["current"] = 0;
    progress["departments"]["max"] = 0;
    progress["mairies"]["current"] = 0;
    progress["mairies"]["max"] = 0;
    progress["errors"]["current"] = 0;
    progress["mairies"]["stacktrace"] = "";
};

let isStopped = true;
const updateStopped = () => isStopped = !isStopped;

io.on(CONNECTION, socket => {
    socket.emit(UPDATE, dataType("progress", progress));
    socket.emit(UPDATE, dataType("data", dataType("departments", Object.keys(departmentsJson))));
    socket.on(START, url => {
        updateStopped();
        start(url).catch(error => {
            console.log(error);
        });
    });
    socket.on(DOWNLOAD, _ => {
        const departments = JSON.stringify(departmentsJson, null, 4);
        socket.emit(DOWNLOAD, departments);
    });
    socket.on(GET, msg => {
        socket.emit(UPDATE, dataType("data", dataType("mairies", departmentsJson[msg])));
    });
    socket.on(RESTART, _ => restartProgress());
});


// Main
const start = async (addressesUrl) => {
    if (isStopped) return;
    const departmentsRegex = /href="(\/departement-.*?)" title="(.*?)"/g;
    const departmentRegex = /href="(\/departement-.*?)" title="(.*?)"/;
    const mairiesRegex = /href="(\/mairie-.*?)" title="(.*?)"/g;
    const mairieRegex = /href="(\/mairie-.*?)" title="(.*?)"/;
    const allRegex = /[^]*/gm;
    const elusRegex = /<ul class="liste_elus">.*<\/ul>/gm;
    const listRegex = /<li>([^<]*)<\/li>/gm;
    const coordonneesRegex = /<ul class="coordonnees">.*<\/ul>/gm
    const mailRegex = /"mailto(.*?)"/gm;
    const siteRegex = /"http(.*?)"/gm;

    const departementsHrefs = await scrapData(
        addressesUrl,
        departmentsRegex
    );

    progress["departments"]["max"] = departementsHrefs.length;
    progress["departments"]["current"] = 1;
    progress["mairies"]["current"] = 1;

    for (; progress["departments"]["current"] <= progress["departments"]["max"];) {
        try {
            const departmentParts = departementsHrefs[progress["departments"]["current"]].match(departmentRegex);
            if (departmentParts.length < 3) break;
            const departmentParameter = departmentParts[1];
            const departmentName = departmentParts[2];

            const mairiesHrefs = await scrapData(
                addressesUrl + departmentParameter,
                mairiesRegex
            );

            progress["mairies"]["max"] = mairiesHrefs.length;

            departmentsJson[departmentName] = [];

            io.emit(UPDATE, dataType("data", dataType("departments", Object.keys(departmentsJson))));

            for (; progress["mairies"]["current"] <= progress["mairies"]["max"];) {
                if (isStopped) return;
                try {
                    const mairieParts = mairiesHrefs[progress["mairies"]["current"]].match(mairieRegex);
                    if (mairieParts.length < 3) break;
                    const mairieParameter = mairieParts[1];
                    const mairieName = mairieParts[2];

                    const url = addressesUrl + mairieParameter;

                    const mairieHtml = await scrapData(url, allRegex);

                    const elusHtml = mairieHtml[0].match(elusRegex);
                    const elusNameHtml = elusHtml ? elusHtml[0].match(listRegex) : null;

                    const coordonneesHtml = mairieHtml[0].match(coordonneesRegex);

                    const mailHtml = coordonneesHtml ? coordonneesHtml[0].match(mailRegex) : null;
                    const mail = mailHtml && mailHtml.length > 0 ? mailHtml[0].substring(8, mailHtml[0].length - 1) : null;

                    const siteHtml = coordonneesHtml ? coordonneesHtml[0].match(siteRegex) : null;
                    const site = siteHtml && siteHtml.length > 0 ? siteHtml[0].substring(8, siteHtml[0].length - 1) : null;

                    const elus = [];
                    for (const index in elusNameHtml) {
                        const eluHtml = elusNameHtml[index];
                        const elu = eluHtml.substring(4, eluHtml.length - 5);
                        elus.push(elu);
                    }
                    const mairieJson = {
                        "name": mairieName ? mairieName : "inconnu",
                        "url": url ? url : "inconnu",
                        "mail": mail ? mail : "inconnu",
                        "site": site ? site : "inconnu",
                        "elus": elus ? elus : []
                    }
                    departmentsJson[departmentName].push(mairieJson)
                } catch (error) {
                    console.log(error);
                    progress["errors"]["stacktrace"] = error;
                    progress["errors"]["current"]++;
                }
                progress["mairies"]["current"]++;
                io.emit(UPDATE, dataType("progress", progress));
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
