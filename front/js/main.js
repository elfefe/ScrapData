$(function() {
    "use strict";

    const UPDATE = "update";
    const RESTART = "restart";
    const CONNECTION = "connection";
    const START = "start";
    const DOWNLOAD = "download";

    const socket = io();

    const departments = document.getElementById('departments');
    const mairies = document.getElementById('mairies');
    const errors = document.getElementById('errors');

    const save = document.getElementById('save');
    save.onclick = () => {
        socket.emit(DOWNLOAD);
    };

    const start = document.getElementById('start');
    start.onclick = () => {
        socket.emit(START);
        start.textContent = start.textContent == "Start" ? "Stop": "Start";
    };

    const departmentChart = c3.generate({
        bindto: '#departments',
        data: {
            columns: [
                ['data', 0]
            ],
            type: 'gauge',
            onclick: function(d, i) { console.log("onclick", d, i); },
            onmouseover: function(d, i) { console.log("onmouseover", d, i); },
            onmouseout: function(d, i) { console.log("onmouseout", d, i); }
        },
        gauge: {
            max: 100, // 100 is default
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
            hide: true
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
            onclick: function(d, i) { console.log("onclick", d, i); },
            onmouseover: function(d, i) { console.log("onmouseover", d, i); },
            onmouseout: function(d, i) { console.log("onmouseout", d, i); }
        },
        gauge: {
            max: 100, // 100 is default
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
            hide: true
        },
        color: {
            pattern: ['#745af2', '#26c6da', '#1e88e5']
        }
    });

    socket.on(DOWNLOAD, msg => {
        const content = [msg];
        const file = new Blob(content, { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = "mairies.json";
        a.click();
        a.remove();
    });

    socket.on(UPDATE, msg => {
        if (!msg) return;
//        departments.textContent = msg["departments"]["current"];
//        mairies.textContent = msg["mairies"]["current"];
//        errors.textContent = msg["errors"]["current"];
        const departmentsProgressPercent = (msg["departments"]["current"] / msg["departments"]["max"]) * 100;
        const mairiesProgressPercent = (msg["mairies"]["current"] / msg["mairies"]["max"]) * 100;

        const currentDepartmentsProgress = departmentChart.data.values("data")[0];
        const currentMairiesProgress = mairieChart.data.values("data")[0];

        if (currentDepartmentsProgress != departmentsProgressPercent)
            departmentChart.load({
                columns: [
                    ['data', departmentsProgressPercent]
                ]
            });
        if (currentMairiesProgress != mairiesProgressPercent)
            mairieChart.load({
                columns: [
                    ['data', mairiesProgressPercent]
                ]
            });
    });

//    socket.on('departments', msg => {
//        if (msg.length > 0)
//        departments.textContent = msg;
//    });

//    socket.on('mairies', msg => {
//        if (msg.length > 0)
//        mairies.textContent = msg;
//    });

//    socket.on('errors', msg => {
//        if (msg.length > 0)
//        errors.textContent = msg;
//    });
});