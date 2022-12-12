$(function () {
    "use strict";

    const UPDATE = "update";
    const GET = "get";
    const RESTART = "restart";
    const CONNECTION = "connection";
    const START = "start";
    const DOWNLOAD = "download";

    const socket = io();

    const departments = document.getElementById('departments');
    const departments_name = document.getElementById('departments_name');
    const mairies = document.getElementById('mairies');
    const mairie_list = document.getElementById('mairie_list');
    const errors = document.getElementById('errors');
    const scrap_url = document.getElementById('scrap_url');

    const save = document.getElementById('save');
    save.onclick = () => {
        socket.emit(DOWNLOAD);
    };

    const start = document.getElementById('start');
    start.onclick = () => {
        socket.emit(START, scrap_url.value);
        start.textContent = start.textContent == "Start scraping" ? "Stop scraping" : "Start scraping";
    };

    const departmentChart = c3.generate({
        bindto: '#departments',
        data: {
            columns: [
                ['data', 0]
            ],
            type: 'gauge',
            onclick: function (d, i) {
                console.log("onclick", d, i);
            },
            onmouseover: function (d, i) {
                console.log("onmouseover", d, i);
            },
            onmouseout: function (d, i) {
                console.log("onmouseout", d, i);
            }
        },
        gauge: {
            max: 100, // 100 is default
        },
        label: {
            format: function (value, ratio) {
                return value + " " + ratio;
            },
            show: false // to turn off the min/max labels.
        },
        donut: {
            label: {
                show: false
            },
            title: "Departments",
            width: 20,
        },
        transition: {
            duration: 500
        },
        legend: {
            hide: false
        },
        color: {
            pattern: ['#745af2', '#26c6da', '#1e88e5']
        }
    });

    const mairieChart = c3.generate({
        bindto: '#mairies',
        data: {
            columns: [
                ['data', 0]
            ],
            type: 'gauge',
            onclick: function (d, i) {
                console.log("onclick", d, i);
            },
            onmouseover: function (d, i) {
                console.log("onmouseover", d, i);
            },
            onmouseout: function (d, i) {
                console.log("onmouseout", d, i);
            }
        },
        gauge: {
            max: 100, // 100 is default
        },
        label: {
            format: function (value, ratio) {
                return value + " " + ratio;
            },
            show: false // to turn off the min/max labels.
        },
        donut: {
            label: {
                show: false
            },
            title: "Departments",
            width: 20,
        },
        transition: {
            duration: 0
        },
        legend: {
            hide: false
        },
        color: {
            pattern: ['#745af2', '#26c6da', '#1e88e5']
        }
    });

    socket.on(DOWNLOAD, msg => {
        const content = [msg];
        const file = new Blob(content, {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = "mairies.json";
        a.click();
        a.remove();
    });

    socket.on(UPDATE, msg => {
        if (!msg) return;
        const content = msg["value"];
        switch (msg["type"]) {
            case "progress":
                const departmentsProgressPercent = (content["departments"]["current"] / content["departments"]["max"]) * 100;
                const mairiesProgressPercent = (content["mairies"]["current"] / content["mairies"]["max"]) * 100;

                const currentDepartmentsProgress = departmentChart.data.values("data")[0];
                const currentMairiesProgress = mairieChart.data.values("data")[0];

                if (currentDepartmentsProgress !== departmentsProgressPercent)
                    departmentChart.load({
                        columns: [
                            ['data', departmentsProgressPercent]
                        ]
                    });
                if (currentMairiesProgress !== mairiesProgressPercent)
                    mairieChart.load({
                        columns: [
                            ['data', mairiesProgressPercent]
                        ]
                    });
                break;
            case "data":
                switch (content["type"]) {
                    case "departments":
                        while (departments_name.firstElementChild)
                            departments_name.firstElementChild.remove();
                        for (let i in content["value"]) {
                            const a = document.createElement("a");
                            a.className = "dropdown-item";
                            a.textContent = content["value"][i];
                            a.onclick = () => socket.emit(GET, content["value"][i]);
                            departments_name.appendChild(a);
                        }
                        break;
                    case "mairies":
                        for (let i = 1; i < mairie_list.rows.length; i++)
                            mairie_list.deleteRow(1);
                        for (let i in content["value"]) {
                            const mairie = content["value"][i];
                            const mairie_row = mairie_list.insertRow(-1);
                            const headers = Object.keys(mairie);
                            for (let j in headers) {
                                const cell = mairie_row.insertCell(j);
                                cell.innerHTML = mairie[headers[j]];
                            }
                        }
                        break;
                }
                break;
        }
    });
});