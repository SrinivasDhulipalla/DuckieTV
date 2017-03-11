/**
 * The background.js service gets launched by chrome's background process when a timer is about to fire
 * It's basically a minimalist implementation of DuckieTV's favorites update mechanism.
 *
 * The way this works is simple:
 * A timer launches an event channel at a given time
 * It broadcasts a message on a channel something is listening for (for instance favorites:update, which triggers the FavoritesService)
 * After that the page gets torn down again to reduce memory footprint.
 *
 */

/** 
 * Make sure migrations don't run on the latest versions.
 */
chrome.runtime.onInstalled.addListener(function(details) {
    localStorage.setItem('runtime.event', JSON.stringify(details));
    if (details.reason == "install") {
        console.info("This is a first install!");
        localStorage.setItem('install.notify', chrome.runtime.getManifest().version);
        /*
         * example: localStorage.setItem('0.54.createtimers', 'done');
         */
    } else if (details.reason == "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        console.info("Updated from " + details.previousVersion + " to " + thisVersion + "!");
        if (details.previousVersion != thisVersion) {
            localStorage.setItem('install.notify', thisVersion);
        }
    };
});

/**
 * Listen for incoming CRUD.js queries coming from the BackgroundPageAdapter
 * This adapter opens a channel to the background page and forwards all queries here to be executed.
 * 
 * 
 */
chrome.runtime.onConnect.addListener(function(port) {
    console.log("New incoming connection from foreground page");
    if (port.name != "CRUD") return;

    port.onMessage.addListener(function(msg) {
        console.log("Message received from foreground page ", msg);
        switch (msg.command) {
            case "Find":
                CRUD.Find(msg.what, msg.filters, msg.options).then(function(result) {
                    console.log("Returning result for ", msg.what, msg.filters, result);
                    port.postMessage({
                        guid: msg.guid,
                        result: result
                    });
                }, function(err) {
                    console.error("Error: ", err, msg);
                    port.postMessage({
                        guid: msg.guid,
                        error: err
                    });
                });
                break;
            case "Persist":
                var tmp = CRUD.fromCache(msg.type, msg.values);
                tmp.Persist().then(function(result) {
                    port.postMessage({
                        guid: msg.guid,
                        result: result
                    });
                }, function(err) {
                    console.error("Error: ", err, msg);
                    port.postMessage({
                        guid: msg.guid,
                        error: err
                    });
                });
                break;
            case "Delete":
                var tmp = CRUD.fromCache(msg.type, msg.values);
                tmp.Delete().then(function(result) {
                    port.postMessage({
                        guid: msg.guid,
                        result: result
                    });
                }, function(err) {
                    console.error("Error: ", err, msg);
                    port.postMessage({
                        guid: msg.guid,
                        error: err
                    });
                });
                break;
            case "query":
                CRUD.executeQuery(msg.sql, msg.params).then(function(result) {
                    port.postMessage({
                        guid: msg.guid,
                        result: result
                    });
                }, function(err) {
                    console.error("Error: ", err, msg);
                    port.postMessage({
                        guid: msg.guid,
                        error: err
                    });
                });
                break;
        }
    });

    port.onDisconnect.addListener(function() {
        console.log("Port disconnected");
    })
});